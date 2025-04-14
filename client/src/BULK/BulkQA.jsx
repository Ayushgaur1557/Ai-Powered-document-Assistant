import { useState } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function BulkQA() {
  const [contentFile, setContentFile] = useState(null);
  const [questionsFile, setQuestionsFile] = useState(null);
  const [bulkAnswers, setBulkAnswers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleBulkUpload = async () => {
    if (!contentFile || !questionsFile) {
      return alert("Please select both content and question PDF files.");
    }

    const formData = new FormData();
    formData.append("contentPdf", contentFile);
    formData.append("questionsPdf", questionsFile);

    try {
      setLoading(true);

      // ✅ Log URL to confirm
      console.log("Requesting:", `${BASE_URL}/bulk-qa`);

      const res = await axios.post(`${BASE_URL}/bulk-qa`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setBulkAnswers(res.data.answers || []);
    } catch (err) {
      console.error("❌ Bulk Q&A Error:", err);
      alert("Something went wrong during bulk Q&A. Please check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 border-t pt-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">📚 Bulk Q&A</h2>

      <div className="space-y-3">
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setContentFile(e.target.files[0])}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        <p className="text-sm text-gray-500">
          📄 Upload <b>Document PDF</b>
        </p>

        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setQuestionsFile(e.target.files[0])}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        <p className="text-sm text-gray-500">
          ❓ Upload <b>Questions PDF</b>
        </p>

        <button
          onClick={handleBulkUpload}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
          disabled={loading}
        >
          {loading ? "Processing..." : "Submit for Bulk Q&A"}
        </button>
      </div>

      {bulkAnswers.length > 0 && (
        <div className="mt-6 space-y-4 max-h-64 overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">📝 Answers:</h3>
          {bulkAnswers.map((item, idx) => (
            <div key={idx} className="p-3 bg-gray-50 border rounded">
              <p className="font-medium text-gray-800">❓ {item.question}</p>
              <p className="text-sm text-gray-700 mt-1">💡 {item.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BulkQA;
