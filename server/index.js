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

app.get("/", (req, res) => {
  res.send("🟢 Hugging Face backend is live!");
});

// ✅ Summarization
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const pdfBuffer = req.file.buffer;
    const pdfData = await pdfParse(pdfBuffer);
    const content = pdfData.text.slice(0, 3000); // keep within model limits

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
    console.error("Summarization Error:", err.message);
    res.status(500).send(`Something went wrong: ${err.message}`);
  }
});

// ✅ Single Q&A
app.post("/ask", async (req, res) => {
  const { context, question } = req.body;

  if (!context || !question) {
    return res.status(400).json({ error: "Context and question are required." });
  }

  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/deepset/roberta-base-squad2",
      { inputs: { context, question } },
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        },
      }
    );

    const answer = response.data.answer || "Sorry, I couldn't find an answer.";
    res.json({ answer });
  } catch (err) {
    console.error("Q&A Error:", err.message);
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
    const contentText = (await pdfParse(req.files.contentPdf[0].buffer)).text.slice(0, 3000);
    const questionText = (await pdfParse(req.files.questionsPdf[0].buffer)).text;

    const questions = questionText.split(/\r?\n/).map(q => q.trim()).filter(Boolean);
    const answers = [];

    for (const question of questions) {
      try {
        const response = await axios.post(
          "https://api-inference.huggingface.co/models/deepset/roberta-base-squad2",
          { inputs: { context: contentText, question } },
          {
            headers: {
              Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            },
            timeout: 20000,
          }
        );

        const answer = response.data.answer || "No answer found.";
        answers.push({ question, answer });

        await new Promise(resolve => setTimeout(resolve, 1500)); // delay to avoid rate limits
      } catch (err) {
        console.error(`❌ Error for "${question}":`, err.message);
        answers.push({ question, answer: "Error processing this question." });
      }
    }

    res.json({ answers });
  } catch (err) {
    console.error("Bulk Q&A Error:", err.message);
    res.status(500).send("Something went wrong during bulk Q&A.");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
