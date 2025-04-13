const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// ✅ Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// ✅ Health check
app.get("/", (req, res) => {
  res.send("🟢 Backend is live and ready!");
});

// ✅ Summarize PDF
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const pdfBuffer = req.file.buffer;
    const pdfData = await pdfParse(pdfBuffer);
    const content = pdfData.text.slice(0, 12000);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // ✅ No "models/" prefix

    const result = await model.generateContent(`Summarize the following:\n\n${content}`);
    const response = await result.response;
    const summary = response.text();

    res.json({ summary });
  } catch (err) {
    console.error("Gemini Summarization Error:", err.message);
    res.status(500).send(`Something went wrong: ${err.message}`);
  }
});

// ✅ Ask question
app.post("/ask", async (req, res) => {
  const { context, question } = req.body;

  if (!context || !question) {
    return res.status(400).json({ error: "Context and question are required." });
  }

  try {

    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // ✅ No "models/" prefix

    const result = await model.generateContent(`Context:\n${context}\n\nQuestion: ${question}`);
    const response = await result.response;
    const answer = response.text();

    res.json({ answer });
  } catch (err) {
    console.error("Gemini Q&A Error:", err.message);
    res.status(500).send(`Something went wrong: ${err.message}`);
  }
});

// ✅ Bulk Q&A
const bulkUpload = multer().fields([
  { name: "contentPdf", maxCount: 1 },
  { name: "questionsPdf", maxCount: 1 },
]);

app.post("/bulk-qa", bulkUpload, async (req, res) => {
  try {
    const contentBuffer = req.files.contentPdf[0].buffer;
    const questionBuffer = req.files.questionsPdf[0].buffer;

    const contentText = (await pdfParse(contentBuffer)).text.slice(0, 12000);
    const questionText = (await pdfParse(questionBuffer)).text;

    const questions = questionText
      .split(/\r?\n/)
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

      const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // ✅ No "models/" prefix


    const answers = [];

    for (const question of questions) {
      try {
        const result = await model.generateContent(`Context:\n${contentText}\n\nQuestion: ${question}`);
        const response = await result.response;
        const answer = response.text();

        answers.push({
          question,
          answer: answer || "No answer returned.",
        });

        await new Promise((resolve) => setTimeout(resolve, 1000)); // small delay to avoid overload
      } catch (innerErr) {
        console.error(`❌ Error for question "${question}":`, innerErr.message);
        answers.push({
          question,
          answer: "Error processing this question.",
        });
      }
    }

    res.json({ answers });
  } catch (err) {
    console.error("❌ Bulk Q&A Gemini Error:", err.message);
    res.status(500).send("Something went wrong during bulk Q&A.");
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
