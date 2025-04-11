const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const form = new FormData();

const filePath = "C:/Users/ayush/Downloads/Drowsy-Detectionproject.pdf"; // ✅ Make sure this file exists

try {
  form.append("file", fs.createReadStream(filePath));
} catch (err) {
  console.error("❌ File read error:", err.message);
  process.exit(1);
}

axios.post("http://localhost:5000/upload", form, {
  headers: form.getHeaders()
})
.then(res => {
  console.log("✅ Summary received:\n", res.data.summary);
})
.catch(err => {
  console.error("❌ Upload failed!");
  if (err.response) {
    console.error("Status:", err.response.status);
    console.error("Data:", err.response.data);
    console.error("Headers:", err.response.headers);
  } else if (err.request) {
    console.error("Request made but no response:", err.request);
  } else {
    console.error("Error:", err.message);
  }
});
