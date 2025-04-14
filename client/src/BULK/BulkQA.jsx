import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast"; // ✅ Toast support

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function BulkQA() {
  const [contentFile, setContentFile] = useState(null);
  const [questionsFile, setQuestionsFile] = useState(null);
  const [bulkAnswers, setBulkAnswers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleBulkUpload = async () => {
    if (!contentFile || !questionsFile) {
      return toast.error("Please select both content and question PDF files.");
    }

    const formData = new FormData();
    formData.append("contentPdf", contentFile);
    formData.append("questionsPdf", questionsFile);

    try {
      setLoading(true);
      const res = await axios.post(`${BASE_URL}/bulk-qa`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setBulkAnswers(res.data.answers || []);
      toast.success("✅ Answers received!");
    } catch (err) {
      toast.error("Something went wrong during bulk Q&A.");
      console.error(err);
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
          onChange={(e) => {
            const file = e.target.files[0];
            if (file && file.size > 10 * 1024 * 1024) {
              toast.error("Content PDF too large (max 10MB).");
              return;
            }
            setContentFile(file);
          }}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        <p className="text-sm text-gray-500">
          📄 Upload <b>Document PDF</b>
        </p>

        <input
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file && file.size > 10 * 1024 * 1024) {
              toast.error("Questions PDF too large (max 10MB).");
              return;
            }
            setQuestionsFile(file);
          }}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        <p className="text-sm text-gray-500">
          ❓ Upload <b>Questions PDF</b>
        </p>

        <button
          onClick={handleBulkUpload}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
              Processing...
            </>
          ) : (
            "Submit for Bulk Q&A"
          )}
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
