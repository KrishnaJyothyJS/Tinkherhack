let audioContext;
let analyser;
let microphone;
let globalStream = null; // Store the mic stream for the manual AI button
let isListening = false;
let animationId;
let lastVibrateTime = 0;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const display = document.getElementById('display');
const volumeBar = document.getElementById('volumeBar');
const transcriptionBox = document.getElementById('transcriptionBox');

startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        globalStream = stream; // Save for Gemini
        
        // --- LOCAL VIBRATION LOGIC (Zero Lag) ---
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        isListening = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        analyzeBtn.disabled = false; // Enable the Gemini button
        
        display.innerText = "Mic Active. Vibrations ON.";
        
        processVolumeForVibration();

    } catch (err) {
        display.innerText = "Error: Mic access denied.";
        console.error(err);
    }
});

stopBtn.addEventListener('click', () => {
    isListening = false;
    cancelAnimationFrame(animationId);
    
    if (audioContext) audioContext.close();
    globalStream = null;

    startBtn.disabled = false;
    stopBtn.disabled = true;
    analyzeBtn.disabled = true; // Disable the Gemini button
    display.innerText = "Stopped.";
    volumeBar.style.width = '0%';
});

// --- NEW MANUAL GEMINI LOGIC ---
analyzeBtn.addEventListener('click', async () => {
    if (!globalStream) return;

    // Temporarily disable button to prevent spam
    analyzeBtn.disabled = true;
    const originalText = analyzeBtn.innerText;
    analyzeBtn.innerText = "🎙️ Recording (4s)...";

    // Setup a 1-time recorder
    const recorder = new MediaRecorder(globalStream, { mimeType: 'audio/webm' });
    const chunks = [];

    recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
        analyzeBtn.innerText = "⚙️ Thinking...";
        
        // Combine chunks into one file
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'clip.webm');

        try {
            const response = await fetch('/analyze-audio', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            if (result.text && result.text !== "NONE") {
                appendTranscription(result.text);
            } else if (result.text === "NONE") {
                appendTranscription("<i style='color: gray; font-size: 16px;'>[No distinct sounds detected]</i>");
            }
        } catch (err) {
            console.error("Server error:", err);
            appendTranscription("<i style='color: red; font-size: 16px;'>[Error connecting to AI]</i>");
        }

        // Re-enable button
        analyzeBtn.innerText = originalText;
        analyzeBtn.disabled = false;
    };

    // Start recording, then forcefully stop it after exactly 4000ms (4 seconds)
    recorder.start();
    setTimeout(() => {
        if (recorder.state === "recording") {
            recorder.stop();
        }
    }, 4000);
});


// --- Instant Vibration Function ---
function processVolumeForVibration() {
    if (!isListening) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) { sum += dataArray[i]; }
    let averageVolume = sum / bufferLength;

    let volumePercent = Math.min((averageVolume / 100) * 100, 100); 
    
    volumeBar.style.width = volumePercent + '%';
    if (volumePercent > 70) volumeBar.style.background = 'red';
    else if (volumePercent > 40) volumeBar.style.background = 'orange';
    else volumeBar.style.background = 'green';

    const currentTime = Date.now();
    
    if (averageVolume > 20 && (currentTime - lastVibrateTime > 250)) { 
        let vibrateDuration = 50; 
        if (averageVolume > 70) vibrateDuration = 200; 
        else if (averageVolume > 40) vibrateDuration = 100; 

        if (navigator.vibrate) navigator.vibrate(vibrateDuration);
        lastVibrateTime = currentTime;
    }

    animationId = requestAnimationFrame(processVolumeForVibration);
}

// --- Helper: Update Text Box ---
let fullHistory = "";
function appendTranscription(text) {
    // Make bracketed sounds bold and red
    const formattedText = text.replace(/\[(.*?)\]/g, '<br><b style="color: #d9534f;">[$1]</b><br>');
    
    fullHistory += formattedText + " <br>";
    
    // Clear out placeholder text
    if (transcriptionBox.innerHTML.includes("AI transcriptions will appear here")) {
        transcriptionBox.innerHTML = "";
    }

    transcriptionBox.innerHTML = `<span style="color: black;">${fullHistory}</span>`;
    transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
}