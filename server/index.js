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

// ✅ Health Check
app.get("/", (req, res) => {
  res.send("🟢 Hugging Face backend with Flan-T5 is live!");
});

// ✅ Summarization (cleaned)
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const pdfBuffer = req.file.buffer;
    const pdfData = await pdfParse(pdfBuffer);
    
    const content = pdfData.text
      .replace(/[^a-zA-Z0-9\s.,?!'"()\-]/g, "") // remove non-text
      .replace(/\s+/g, " ")                     // collapse extra spaces
      .slice(0, 3000);                          // model limit

    const response = await axios.post(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      { inputs: content },
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        },
      }
    );

    const summary = response.data[0]?.summary_text || "No summary returned.";
    res.json({ summary });
  } catch (err) {
    console.error("Summarization Error:", err.response?.data || err.message);
    res.status(500).send("Something went wrong during summarization.");
  }
});

// ✅ Single Q&A (Flan-T5)
app.post("/ask", async (req, res) => {
  const { context, question } = req.body;

  if (!context || !question) {
    return res.status(400).json({ error: "Context and question are required." });
  }

  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/google/flan-t5-large",
      {
        inputs: `Answer the following question in a short paragraph:\n\nQuestion: ${question}\nContext: ${context}`,
      },
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        },
        timeout: 20000,
      }
    );

    const answer = response.data?.[0]?.generated_text || "No answer returned.";
    res.json({ answer });
  } catch (err) {
    console.error("Q&A Error:", err.response?.data || err.message);
    res.status(500).send("Something went wrong during Q&A.");
  }
});

// ✅ Question Extraction Helper
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

// ✅ Bulk Q&A
const bulkUpload = multer().fields([
  { name: "contentPdf", maxCount: 1 },
  { name: "questionsPdf", maxCount: 1 },
]);

app.post("/bulk-qa", bulkUpload, async (req, res) => {
  try {
    const contentText = (await pdfParse(req.files.contentPdf[0].buffer)).text
      .replace(/\s+/g, " ")
      .slice(0, 5000);

    const questionText = (await pdfParse(req.files.questionsPdf[0].buffer)).text;
    const questions = extractQuestions(questionText);

    console.log("📌 Parsed Questions:", questions);

    const answers = [];

    for (const question of questions) {
      try {
        const response = await axios.post(
          "https://api-inference.huggingface.co/models/google/flan-t5-large",
          {
            inputs: `Answer the following question in a short paragraph:\n\nQuestion: ${question}\nContext: ${contentText}`,
          },
          {
            headers: {
              Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            },
            timeout: 20000,
          }
        );

        const answer = response.data?.[0]?.generated_text || "No answer returned.";
        answers.push({ question, answer });

        await new Promise(resolve => setTimeout(resolve, 1500)); // Rate limit
      } catch (innerErr) {
        console.error(`❌ Error for "${question}":`, innerErr.message);
        answers.push({ question, answer: "Error processing this question." });
      }
    }

    res.json({ answers });
  } catch (err) {
    console.error("Bulk Q&A Error:", err.message);
    res.status(500).send("Something went wrong during bulk Q&A.");
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
