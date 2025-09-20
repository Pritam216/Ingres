import React, { useState, useRef, useEffect } from "react";
import { FiSend, FiUpload, FiRefreshCw, FiLoader } from "react-icons/fi";
import { AiOutlineRobot, AiOutlineUser } from "react-icons/ai";
import ReactMarkdown from "react-markdown"; 
import "./App.css";

function App() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "👋 Hello! Upload a CSV file and ask me a question.",
    },
  ]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const chatEndRef = useRef(null);

  const suggestions = [
    "Analyze the correlation between annual rainfall and groundwater recharge for the last 5 years in Maharashtra.",
    "Identify all assessment units categorized as 'Over-Exploited' in Rajasthan and plot them on a map.",
    "Summarize the key water quality parameters (e.g., pH, TDS, Arsenic) for the well with the highest Iron concentration.",
    "Compare the average stage of extraction between Bengaluru Urban and Mysuru over the last decade.",
  ];

  const features = [
    "📊 Data Analysis: Get key metrics and summaries.",
    "🗺️ GIS Map Generation: Visualize data on a map.",
    "⏱️ Real-time Data: Access live sensor readings.",
    "🧪 Quality Reporting: Check for chemical parameters.",
    "📈 Trend Analysis: Understand historical patterns.",
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch("/api/upload_csv/", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `✅ Files uploaded successfully: ${data.filenames.join(
              ", "
            )}`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `❌ Error: ${data.error || "Failed to upload files."}`,
          },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: `❌ Network error: ${e.message}` },
      ]);
    } finally {
      setIsUploading(false);
      setFiles([]);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/ask/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ question: userMsg.text }),
      });

      const data = await res.json();

      const botMsg = {
        sender: "bot",
        text: data.answer || data.error,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: `❌ Network error: ${e.message}` },
      ]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
  };

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <div className="sidebar">
        <h2 className="sidebar-title">INGRES</h2>
        <div className="suggestions-box">
          <h4>💡 Suggested Questions</h4>
          <ul>
            {suggestions.map((s, i) => (
              <li key={i} onClick={() => handleSuggestionClick(s)}>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="features-box">
          <h4>✨ Key Features</h4>
          <ul>
            {features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main Chat Pane */}
      <div className="main-pane">
        <header className="chat-header"></header>
        <div className="chat-box">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.sender}`}>
              <span className="icon">
                {msg.sender === "user" ? <AiOutlineUser /> : <AiOutlineRobot />}
              </span>
              <div className="bubble-container">
                <div className="bubble">
                  {/* 👈 Change this line */}
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                {msg.sender === "bot" && (
                  <div className="action-buttons">
                    <button
                      className="action-button"
                      onClick={() => handleSuggestionClick("View Insights")}
                    >
                      View Insights
                    </button>
                    <button
                      className="action-button"
                      onClick={() => handleSuggestionClick("View GIS Map")}
                    >
                      View GIS Map
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="chat-input-area">
          <div className="upload-section">
            <input
              type="file"
              accept=".csv"
              multiple
              id="file-upload"
              onChange={(e) => setFiles(Array.from(e.target.files))}
              style={{ display: "none" }}
            />
            <label htmlFor="file-upload" className="upload-label">
              <FiUpload />
              {files.length > 0 && `(${files.length})`}
            </label>
            <button
              onClick={handleFileUpload}
              className="upload-button"
              disabled={isUploading || files.length === 0}
            >
              {isUploading ? <FiLoader className="spinner" /> : <FiRefreshCw />}
            </button>
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question..."
          />
          <button onClick={handleSend} className="send-button">
            <FiSend />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;