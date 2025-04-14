const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const QAModelURL = "https://api-inference.huggingface.co/models/deepset/roberta-base-squad2";

// 📌 Utility: Chunk large text into pieces
function chunkText(text, maxChunkLength = 700) {
  const words = text.split(" ");
  const chunks = [];

  for (let i = 0; i < words.length; i += maxChunkLength) {
    chunks.push(words.slice(i, i + maxChunkLength).join(" "));
  }

  return chunks;
}

// 📌 Utility: Score chunk by how many words from question appear
function scoreChunk(chunk, question) {
  const questionWords = question.toLowerCase().split(/\W+/);
  const chunkWords = chunk.toLowerCase();
  return questionWords.reduce((score, word) => {
    return score + (chunkWords.includes(word) ? 1 : 0);
  }, 0);
}

// 📌 Helper to extract grouped questions
function extractQuestions(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const questions = [];
  let current = "";

  for (let line of lines) {
    if (/^\d+\./.test(line) || /^Q\d*/i.test(line)) {
      if (current) questions.push(current.trim());
      current = line;
    } else {
      current += " " + line;
    }
  }

  if (current) questions.push(current.trim());
  return questions;
}

// ✅ Bulk Q&A with Chunking Logic
const bulkUpload = multer().fields([
  { name: "contentPdf", maxCount: 1 },
  { name: "questionsPdf", maxCount: 1 },
]);

app.post("/bulk-qa", bulkUpload, async (req, res) => {
  try {
    const contentText = (await pdfParse(req.files.contentPdf[0].buffer)).text.replace(/\s+/g, " ");
    const questionText = (await pdfParse(req.files.questionsPdf[0].buffer)).text;
    const questions = extractQuestions(questionText);
    const chunks = chunkText(contentText);

    const answers = [];

    for (const question of questions) {
      // ✅ Step 1: Find best chunk
      const scoredChunks = chunks
        .map(chunk => ({ chunk, score: scoreChunk(chunk, question) }))
        .sort((a, b) => b.score - a.score);

      const bestChunk = scoredChunks[0]?.chunk || chunks[0];

      // ✅ Step 2: Ask model
      try {
        const response = await axios.post(
          QAModelURL,
          {
            inputs: {
              context: bestChunk,
              question: question,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            },
            timeout: 20000,
          }
        );

        const answer = response.data.answer || "No answer found.";
        answers.push({ question, answer });

        await new Promise(resolve => setTimeout(resolve, 1500)); // Rate limit
      } catch (err) {
        console.error(`❌ Model error for "${question}":`, err.message);
        answers.push({ question, answer: "Error processing this question." });
      }
    }

    res.json({ answers });

  } catch (err) {
    console.error("❌ Bulk Q&A Error:", err.message);
    res.status(500).send("Something went wrong during bulk Q&A.");
  }
});

const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.send("✅ AI-Powered Document Assistant is running.");
});

app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
