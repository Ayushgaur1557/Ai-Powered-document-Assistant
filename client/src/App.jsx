import { useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import BulkQA from "./BULK/BulkQA";

// 💡 Your backend URL from Vercel environment variable
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function App() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [qaHistory, setQaHistory] = useState([]);
  const [qaLoading, setQaLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Please select a PDF file.");
    const formData = new FormData();
    formData.append("file", file);
  
    try {
      setLoading(true);
  
      // 🟡 Warm-up: ping backend before sending actual upload request
      await axios.get(`${BASE_URL}`);
  
      // 🟢 Now send the real request
      const res = await axios.post(`${BASE_URL}/upload`, formData);
      setSummary(res.data.summary);
    } catch (err) {
      alert("Something went wrong while summarizing.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(summary, 180);
    doc.text(lines, 10, 10);
    doc.save("summary.pdf");
  };

  const handleClearAll = () => {
    setFile(null);
    setSummary("");
    setQuestion("");
    setQaHistory([]);
    setQaLoading(false);
    setLoading(false);
  };

  const handleAsk = async () => {
    if (!question.trim()) return alert("Please enter a question.");
    setQaLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/ask`, {
        context: summary,
        question,
      });

      const newQA = {
        question,
        answer: res.data.answer || "No answer found in the document.",
      };

      setQaHistory((prev) => [...prev, newQA]);
      setQuestion(""); // Clear input
    } catch (err) {
      console.error(err);
      setQaHistory((prev) => [
        ...prev,
        { question, answer: "Error getting answer." },
      ]);
    } finally {
      setQaLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-700">
          📄 AI PDF Summarizer + Q&A
        </h1>

        <div className="mb-4">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          {file && (
            <p className="text-sm text-gray-500 mt-1">
              📎 File selected: {file.name}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            className="bg-blue-600 flex-1 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? "Summarizing..." : "Upload & Summarize"}
          </button>
          <button
            onClick={handleClearAll}
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
          >
            Clear All
          </button>
        </div>

        {summary && (
          <>
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-2 text-gray-700">
                📌 Summary:
              </h2>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-60 overflow-y-auto text-sm text-gray-800 whitespace-pre-wrap">
                {summary}
              </div>
              <button
                onClick={handleDownload}
                className="mt-3 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Download Summary as PDF
              </button>
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-1 text-gray-700">
                ❓ Ask a question:
              </h2>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your question..."
                className="w-full border px-3 py-2 rounded mb-2"
              />
              <button
                onClick={handleAsk}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                {qaLoading ? "Thinking..." : "Get Answer"}
              </button>

              <button
                onClick={() => setQaHistory([])}
                className="mt-2 text-sm text-red-500 hover:underline"
              >
                Clear Q&A History
              </button>

              {qaHistory.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-md font-semibold text-gray-700 mb-2">
                    💬 Q&A History
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {qaHistory.map((qa, index) => (
                      <div key={index} className="p-3 bg-gray-100 rounded border">
                        <p className="font-medium text-gray-800">
                          ❓ {qa.question || <i>No question entered</i>}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          💡 {qa.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        <BulkQA />
      </div>
    </div>
  );
}

export default App;
