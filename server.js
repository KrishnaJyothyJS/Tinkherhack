require('dotenv').config();
const express = require('express');
const multer = require('multer'); // Handles the audio file upload
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');

const app = express();
const upload = multer(); // Store audio in memory
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Serve your frontend files (script.js and index.html)
app.use(express.static('public'));

// 2. The logic to handle audio from your script.js
app.post('/analyze-audio', upload.single('audio'), async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const audioPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: "audio/webm", // Chrome uses webm
      },
    };

    const prompt = "Identify the most important sound in this 5s clip for a deaf user (e.g. knock, alarm, siren). If it's just background noise, reply 'None'.";

    const result = await model.generateContent([prompt, audioPart]);
    const responseText = result.response.text();

    res.json({ 
      description: responseText, 
      isImportant: !responseText.toLowerCase().includes("none") 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing audio");
  }
});

app.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));