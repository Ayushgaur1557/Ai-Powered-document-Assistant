
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const axios = require('axios');
require('dotenv').config();    


const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🟢 Backend is live and ready!");
});


const upload = multer({ storage: multer.memoryStorage() });

//post method


app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const pdfBuffer = req.file.buffer;
    const pdfData = await pdfParse(pdfBuffer);

    // Limit content length to ~3000 characters (~600–700 tokens) to avoid model crash
    const content = pdfData.text.slice(0, 3000);
    

    const response = await axios.post(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      { inputs: content },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
      }
    );

    const summary = response.data[0]?.summary_text || "No summary returned.";
    res.json({ summary });

  } catch (err) {
    console.error(" HuggingFace Error:", err.message);
    res.status(500).send(`Something went wrong: ${err.message}`);
  }
});

app.post("/ask", async (req, res) => {
  const { context, question } = req.body;

  if (!context || !question) {
    return res.status(400).json({ error: "Context and question are required." });
  }

  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/bert-large-uncased-whole-word-masking-finetuned-squad",
      {
        inputs: {
          question,
          context
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`
        }
      }
    );

    const answer = response.data.answer || "Sorry, I couldn't find an answer.";
    res.json({ answer });
  } catch (error) {
    console.error(" QA Error:", error.message);
    res.status(500).send(`Something went wrong: ${error.message}`);
  }
});

//posting in bulk 2 pdf one for document and 2nd for uestion

const bulkUpload = multer().fields([
  { name: 'contentPdf', maxCount: 1 },
  { name: 'questionsPdf', maxCount: 1 },
]);

app.post("/bulk-qa", bulkUpload, async (req, res) => {
  try {
    const contentBuffer = req.files.contentPdf[0].buffer;
    const questionBuffer = req.files.questionsPdf[0].buffer;

    const contentText = (await pdfParse(contentBuffer)).text;
    const questionText = (await pdfParse(questionBuffer)).text;

    const questions = questionText
      .split(/\r?\n/)
      .map(q => q.trim())
      .filter(q => q.length > 0);

    const limitedContext = contentText.slice(0, 3000);
    const answers = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      try {
        const response = await axios.post(
          "https://api-inference.huggingface.co/models/bert-large-uncased-whole-word-masking-finetuned-squad",
          {
            inputs: {
              question,
              context: limitedContext,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            },
            timeout: 20000, // 20s timeout to avoid hanging
          }
        );

        answers.push({
          question,
          answer: response.data.answer || "No answer found.",
        });
      } catch (innerErr) {
        console.error(`Error for "${question}":`, innerErr.message);
        answers.push({
          question,
          answer: "Error processing this question.",
        });
      }

      // Add delay (1.5s) to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    res.json({ answers });

  } catch (err) {
    console.error("❌ Bulk Q&A Error:", err.message);
    res.status(500).send("Something went wrong during bulk Q&A.");
  }
});





const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
