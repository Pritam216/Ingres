# import tempfile
# from fastapi import FastAPI, UploadFile, Form
# from fastapi.middleware.cors import CORSMiddleware
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain_experimental.agents.agent_toolkits import create_csv_agent
# from langchain.agents import AgentExecutor
# from dotenv import load_dotenv
# import os

# load_dotenv()

# # Your API key from .env file
# api_key = os.getenv("GEMINI_API_KEY")

# app = FastAPI()

# # Allow frontend (React) to call backend
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Set up a permanent directory to store uploaded files
# UPLOAD_DIR = "uploaded_files"
# os.makedirs(UPLOAD_DIR, exist_ok=True)

# @app.post("/api/upload_csv/")
# async def upload_csv(files: list[UploadFile]):
#     """
#     Accepts a list of CSV files and saves them to a permanent directory.
#     """
#     uploaded_filenames = []
#     for file in files:
#         file_path = os.path.join(UPLOAD_DIR, file.filename)
#         with open(file_path, "wb") as buffer:
#             buffer.write(await file.read())
#         uploaded_filenames.append(file.filename)
    
#     return {"message": "Files uploaded successfully", "filenames": uploaded_filenames}

# @app.post("/api/ask/")
# async def ask_question(question: str = Form(...)):
#     """
#     Creates an agent by loading all previously uploaded CSVs and runs the question,
#     with a text-based response and dynamic buttons.
#     """
#     csv_files = [
#         os.path.join(UPLOAD_DIR, f)
#         for f in os.listdir(UPLOAD_DIR)
#         if f.endswith('.csv')
#     ]
    
#     if not csv_files:
#         return {"error": "No CSV files found. Please upload them first."}

#     llm = ChatGoogleGenerativeAI(
#         model="gemini-2.5-flash",
#         google_api_key=api_key
#     )

#     agent: AgentExecutor = create_csv_agent(
#         llm,
#         csv_files,
#         verbose=True,
#         allow_dangerous_code=True
#     )
    
#     response_data = {}

#     try:
#         answer = agent.run(question)
        
#         # --- Dynamic Button Logic (as requested) ---
#         suggested_buttons = []
#         lower_answer = answer.lower()
#         if "data" in lower_answer or "analysis" in lower_answer or "metrics" in lower_answer:
#             suggested_buttons.append("Show Stats")
#         if "trend" in lower_answer or "changes" in lower_answer:
#             suggested_buttons.append("Show Graphs")
#         if "file" in lower_answer or "data source" in lower_answer:
#             suggested_buttons.append("Show Files")
        
#         response_data = {"answer": answer, "suggestions": suggested_buttons}
            
#     except Exception as e:
#         response_data = {
#             "error": f"⚠️ An error occurred while processing your request: {str(e)}"
#         }
        
#     return response_data

import tempfile
from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_experimental.agents.agent_toolkits import create_csv_agent
from langchain.agents import AgentExecutor
from dotenv import load_dotenv
import os
import requests
import io
from vercel_blob import put

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Note: Vercel's filesystem is read-only. We can't save files here.
# We will use Vercel Blob for storage instead.

# Store file URLs in memory for the session
uploaded_file_urls = []

@app.post("/api/upload_csv/")
async def upload_csv(files: list[UploadFile]):
    """
    Uploads CSV files to Vercel Blob Storage and returns their public URLs.
    """
    global uploaded_file_urls
    uploaded_file_urls = []

    for file in files:
        contents = await file.read()
        blob_upload = await put(file.filename, contents, access="public")
        uploaded_file_urls.append(blob_upload.url)

    return {"message": "Files uploaded successfully to Vercel Blob", "urls": uploaded_file_urls}

@app.post("/api/ask/")
async def ask_question(question: str = Form(...)):
    """
    Creates an agent using CSV data from Vercel Blob URLs and answers a question.
    """
    if not uploaded_file_urls:
        return {"error": "No CSV files found. Please upload them first."}

    # Download CSV content from Vercel Blob URLs
    csv_file_like_objects = []
    for url in uploaded_file_urls:
        try:
            response = requests.get(url)
            response.raise_for_status()  # Raise an exception for bad status codes
            csv_file_like_objects.append(io.StringIO(response.text))
        except requests.exceptions.RequestException as e:
            return {"error": f"Failed to download CSV from {url}: {str(e)}"}

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=api_key
    )

    agent: AgentExecutor = create_csv_agent(
        llm,
        csv_file_like_objects,
        verbose=True,
        allow_dangerous_code=True
    )

    response_data = {}

    try:
        answer = agent.run(question)

        # --- Dynamic Button Logic ---
        suggested_buttons = []
        lower_answer = answer.lower()
        if "data" in lower_answer or "analysis" in lower_answer or "metrics" in lower_answer:
            suggested_buttons.append("Show Stats")
        if "trend" in lower_answer or "changes" in lower_answer:
            suggested_buttons.append("Show Graphs")
        if "file" in lower_answer or "data source" in lower_answer:
            suggested_buttons.append("Show Files")

        response_data = {"answer": answer, "suggestions": suggested_buttons}

    except Exception as e:
        response_data = {
            "error": f"⚠️ An error occurred while processing your request: {str(e)}"
        }

    return response_data