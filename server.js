require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const upload = multer(); // Store audio in memory
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.static('public'));

app.post('/analyze-audio', upload.single('audio'), async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const audioPart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: "audio/webm", // Format recorded by Android/Chrome
            },
        };

        // This prompt forces Gemini to act as a dual-purpose captioner
        const prompt = `You are a live-captioning accessibility tool for a deaf user. Listen to this 4-second audio clip.
        1. If someone is speaking, transcribe what they are saying.
        2. If there are distinct, important environmental sounds (e.g., car horn, siren, door knock, dog barking, loud bang), write them in brackets, like [Car horn].
        3. Combine them naturally. Example: "[Door knocks] Hello, is anyone home? [Dog barks]"
        4. If it is just normal background room noise, microphone static, or silence, reply with EXACTLY the word: "NONE"`;

        const result = await model.generateContent([prompt, audioPart]);

        // Log full result for debugging (safe depth)
        console.log('Full Gemini result:');
        console.dir(result, { depth: 4 });

        // Try multiple ways to extract text from the response
        let responseText = null;
        try {
            if (result && typeof result.response?.text === 'function') {
                responseText = result.response.text();
            } else if (result?.outputText) {
                responseText = result.outputText;
            } else if (result?.candidates && result.candidates[0]?.content) {
                responseText = result.candidates[0].content;
            } else if (typeof result === 'string') {
                responseText = result;
            }
        } catch (e) {
            console.error('Error extracting text from Gemini result:', e);
        }

        responseText = (responseText || '').toString().trim();
        console.log("Gemini response (extracted): %s", responseText);

        // Send the extracted text or the whole result as fallback
        if (responseText) {
            res.json({ text: responseText });
        } else {
            res.json({ text: JSON.stringify(result) });
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "Failed to process audio" });
    }
});

app.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));