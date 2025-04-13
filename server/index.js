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

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent";
const API_KEY = process.env.GOOGLE_API_KEY;

// ✅ Health Check
app.get("/", (req, res) => {
  res.send("🟢 Backend is live and ready!");
});

// ✅ Summarization
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const pdfBuffer = req.file.buffer;
    const pdfData = await pdfParse(pdfBuffer);
    const content = pdfData.text.slice(0, 12000);

    const payload = {
      contents: [{
        parts: [{ text: `Summarize the following content:\n\n${content}` }]
      }]
    };

    const response = await axios.post(`${GEMINI_API_URL}?key=${API_KEY}`, payload, {
      headers: { "Content-Type": "application/json" }
    });

    const summary = response.data.candidates[0].content.parts[0].text;
    res.json({ summary });

  } catch (err) {
    console.error("Gemini Summarization Error:", err.response?.data || err.message);
    res.status(500).send("Something went wrong during summarization.");
  }
});

// ✅ Single Q&A
app.post("/ask", async (req, res) => {
  const { context, question } = req.body;

  if (!context || !question) {
    return res.status(400).json({ error: "Context and question are required." });
  }

  try {
    const payload = {
      contents: [{
        parts: [{ text: `Context:\n${context}\n\nQuestion: ${question}` }]
      }]
    };

    const response = await axios.post(`${GEMINI_API_URL}?key=${API_KEY}`, payload, {
      headers: { "Content-Type": "application/json" }
    });

    const answer = response.data.candidates[0].content.parts[0].text;
    res.json({ answer });

  } catch (err) {
    console.error("Gemini Q&A Error:", err.response?.data || err.message);
    res.status(500).send("Something went wrong during Q&A.");
  }
});

// ✅ Bulk Q&A
const bulkUpload = multer().fields([
  { name: "contentPdf", maxCount: 1 },
  { name: "questionsPdf", maxCount: 1 },
]);

app.post("/bulk-qa", bulkUpload, async (req, res) => {
  try {
    const contentText = (await pdfParse(req.files.contentPdf[0].buffer)).text.slice(0, 12000);
    const questionText = (await pdfParse(req.files.questionsPdf[0].buffer)).text;

    const questions = questionText.split(/\r?\n/).map(q => q.trim()).filter(Boolean);
    const answers = [];

    for (const question of questions) {
      try {
        const payload = {
          contents: [{
            parts: [{ text: `Context:\n${contentText}\n\nQuestion: ${question}` }]
          }]
        };

        const response = await axios.post(`${GEMINI_API_URL}?key=${API_KEY}`, payload, {
          headers: { "Content-Type": "application/json" }
        });

        const answer = response.data.candidates[0].content.parts[0].text;

        answers.push({ question, answer: answer || "No answer returned." });

        await new Promise((resolve) => setTimeout(resolve, 1000)); // avoid API rate limit
      } catch (innerErr) {
        console.error(`❌ Error for question "${question}":`, innerErr.message);
        answers.push({ question, answer: "Error processing this question." });
      }
    }

    res.json({ answers });

  } catch (err) {
    console.error("❌ Bulk Q&A Gemini Error:", err.message);
    res.status(500).send("Something went wrong during bulk Q&A.");
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
