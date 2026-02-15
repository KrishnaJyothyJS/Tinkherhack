<img width="1280" height="640" alt="img" src="https://github.com/user-attachments/assets/3dca0902-4012-4319-a7f9-f3b858a7b8e4" /><p align="center">
</p>

# AudioSense 🎯

## Basic Details

### Team Name: Makerduo

### Team Members
- Member 1: Pooja S Nair - Saintgits College of Engineering
- Member 2: Krishna Jyothy JS - Saintgits College of Engineering

### Hosted Project Link
[mention your project hosted link here - e.g., Vercel, Render, or Ngrok link]

### Project Description
A web-based accessibility tool designed to help deaf and hard-of-hearing individuals perceive their audio environment through dual sensory substitution: real-time haptic feedback (vibrations) and on-demand AI captioning.

### The Problem statement
Deaf and hard-of-hearing individuals often miss crucial environmental audio cues (like sirens, dog barks, or knocks) and spoken conversations. Existing solutions are often expensive, require dedicated hardware, or drain mobile phone batteries by continuously running heavy AI models.

### The Solution
AudioSense uses the phone's built-in vibration motor and microphone to provide **zero-lag, real-time haptic feedback** based on the volume of the room, requiring no API calls. When detailed context is needed, the user taps a button to record a 4-second audio clip, which is sent to Google's Gemini 2.5 Flash model. Gemini acts as an intelligent live-captioner, seamlessly transcribing speech and identifying environmental sounds (e.g., `[DOG BARKING]`) in a unified subtitle feed.

---

## Technical Details

### Technologies/Components Used

**For Software:**
- **Languages used:** JavaScript, HTML5, CSS3
- **Frameworks used:** Node.js, Express.js
- **Libraries/APIs used:** `@google/generative-ai` (Gemini API), `multer` (in-memory file handling), `dotenv`, Web Audio API, MediaStream Recording API, Vibration API.
- **Tools used:** VS Code, Git, Chrome/Android Browser (for haptic support)

---

## Features

- **Real-Time Haptic Feedback:** Uses the browser's Web Audio API to calculate volume 60 times a second and triggers physical phone vibrations for loud noises instantly.
- **Minimalist Visual Interface:** A sleek, calming blue UI with a real-time visual progress bar to "see" the noise level of the room.
- **On-Demand AI Captioning:** A manual "Analyze Environment" button allows users to fetch context without burning through AI API limits or battery life.
- **Smart Audio Tagging:** Leverages Gemini 2.5 Flash to transcribe spoken words and tag important environmental sounds naturally (e.g., *"[DOOR KNOCK] Hello, is anyone home?"*).

---

## Implementation

### For Software:

#### Installation
```bash
# Clone the repository
git clone [your-repo-link]
cd [your-repo-folder]

# Install dependencies
npm install

# Set up environment variables
# Create a .env file in the root directory and add:
GEMINI_API_KEY=your_google_gemini_api_key_here
