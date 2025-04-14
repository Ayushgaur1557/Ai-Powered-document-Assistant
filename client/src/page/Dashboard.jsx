
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [tab, setTab] = useState('summarize');
  const navigate = useNavigate();

  return (
  
    <div className="min-h-screen bg-gray-100 p-6">

<div className="max-w-7xl mx-auto">

      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📊 Dashboard</h1>
        <button
          onClick={() => navigate('/')}
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          ⬅ Back to Main
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-300 pb-2">
        {['summarize', 'qa', 'history'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-t ${
              tab === t
                ? 'bg-white border border-b-0 border-gray-300 text-indigo-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'summarize' && '📝 Summarize'}
            {t === 'qa' && '💬 Q&A'}
            {t === 'history' && '📚 History'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-300 rounded shadow p-6 min-h-[300px]">
        {tab === 'summarize' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">📝 Document Summarizer</h2>
            <p className="text-gray-600 mb-4">Upload a PDF and get a summary here.</p>
            <div className="border border-dashed border-gray-300 rounded p-6 text-center text-gray-500">
              📎 File Preview Area<br />
              (Dropzone/File Uploader component can go here)
            </div>
          </div>
        )}

        {tab === 'qa' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">💬 Ask Questions</h2>
            <p className="text-gray-600 mb-4">Interact with your document using natural questions.</p>
            <div className="border border-dashed border-gray-300 rounded p-6 text-center text-gray-500">
              ❓ Q&A interface coming soon
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">📚 Session History</h2>
            <p className="text-gray-600 mb-4">Track previous Q&A or summarization actions.</p>
            <div className="border border-dashed border-gray-300 rounded p-6 text-center text-gray-500">
              🕘 Nothing here yet
            </div>
          </div>
        )}
      </div>
      <div/>
    </div>
  );
}

export default Dashboard;
