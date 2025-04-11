import { useState } from "react";
import axios from "axios";

function BulkQA() {
  const [contentPdf, setContentPdf] = useState(null);
  const [questionsPdf, setQuestionsPdf] = useState(null);
  const [bulkAnswers, setBulkAnswers] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkQA = async () => {
    if (!contentPdf || !questionsPdf) {
      alert("Please upload both PDFs.");
      return;
    }

    const formData = new FormData();
    formData.append("contentPdf", contentPdf);
    formData.append("questionsPdf", questionsPdf);

    try {
      setBulkLoading(true);
      const res = await axios.post("http://localhost:5000/bulk-qa", formData);
      setBulkAnswers(res.data.answers || []);
    } catch (err) {
      console.error(err);
      alert("Something went wrong during bulk Q&A.");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="mt-10 border-t pt-6">
      <h2 className="text-xl font-bold text-blue-600 mb-4">
        📂 Upload Document & Questions PDFs
      </h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          📘 Document PDF:
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setContentPdf(e.target.files[0])}
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ❓ Questions PDF:
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setQuestionsPdf(e.target.files[0])}
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <button
        onClick={handleBulkQA}
        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
      >
        {bulkLoading ? "Processing..." : "Get Answers"}
      </button>

      {bulkAnswers.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">📄 Auto-Generated Q&A:</h3>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {bulkAnswers.map((qa, index) => (
              <div key={index} className="p-3 bg-gray-100 rounded border">
                <p className="font-medium text-gray-800">❓ {qa.question}</p>
                <p className="text-sm text-gray-700 mt-1">💡 {qa.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BulkQA;
