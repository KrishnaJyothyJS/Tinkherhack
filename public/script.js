import { AudioClassifier, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@0.10.0/audio_bundle.js";

// --- STATE & GLOBALS ---
let audioClassifier;
let audioContext;
let analyser;
let microphone;
let isListening = false;
let animationId;
let lastVibrateTime = 0;
let fullHistory = ""; // Stores the combined speech and sound logs

// Sound tracking to prevent spamming the same sound
let lastSound = "";
let soundTimeout;

// UI Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const display = document.getElementById('display');
const volumeBar = document.getElementById('volumeBar');
const transcriptionBox = document.getElementById('transcriptionBox');

// --- 1. INITIALIZE AI MODEL ---
async function initializeAI() {
    try {
        const audioFileset = await FilesetResolver.forAudioTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@0.10.0/wasm"
        );
        audioClassifier = await AudioClassifier.createFromOptions(audioFileset, {
            baseOptions: {
                // Official YAMNet model URL
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite"
            }
        });
        display.innerText = "AI Ready! Press Start.";
        startBtn.disabled = false;
    } catch (error) {
        console.error(error);
        display.innerText = "Error loading AI model.";
    }
}
initializeAI();

// --- 2. SET UP SPEECH RECOGNITION ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let newFinalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                newFinalText += event.results[i][0].transcript + " ";
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        if (newFinalText) fullHistory += newFinalText;

        transcriptionBox.innerHTML = `
            <span style="color: black;">${fullHistory}</span>
            <span style="color: gray;"><i>${interimTranscript}</i></span>
        `;
        transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
    };

    recognition.onend = () => {
        if (isListening) recognition.start(); // Auto-restart if it stops unexpectedly
    };
} else {
    fullHistory = "<b style='color:red;'>Speech Recognition not supported. Use Chrome.</b><br>";
    updateTranscriptionBox();
}

// --- 3. START / STOP LOGIC ---
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Setup AudioContext (Required 16000 Hz for YAMNet AI model)
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        microphone = audioContext.createMediaStreamSource(stream);
        
        // Node A: For Real-time Vibration (Analyser)
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; 
        microphone.connect(analyser);
        
        // Node B: For Background Sounds (ScriptProcessor passes chunks to AI)
        const scriptNode = audioContext.createScriptProcessor(16384, 1, 1);
        microphone.connect(scriptNode);
        scriptNode.connect(audioContext.destination);

        scriptNode.onaudioprocess = processEnvironmentalAudio;

        isListening = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        display.innerText = "Listening...";
        if (!fullHistory) fullHistory = "";
        
        processVolumeForVibration(); 
        if (recognition) recognition.start();

    } catch (err) {
        display.innerText = "Error: Mic access denied.";
        console.error(err);
    }
});

stopBtn.addEventListener('click', () => {
    isListening = false;
    cancelAnimationFrame(animationId);
    
    if (audioContext) audioContext.close();
    if (recognition) recognition.stop();

    startBtn.disabled = false;
    stopBtn.disabled = true;
    display.innerText = "Stopped.";
    volumeBar.style.width = '0%';
});

// --- 4. ENVIRONMENTAL SOUND CLASSIFICATION ---
function processEnvironmentalAudio(event) {
    if (!isListening || !audioClassifier) return;
    
    // Extract ~1 second of raw audio data
    const inputData = event.inputBuffer.getChannelData(0);
    const result = audioClassifier.classify(inputData);
    
    if (result && result.length > 0) {
        // AI returns a list of categories sorted by confidence score
        const topCategory = result[0].classifications[0].categories[0];
        
        // Ignore generic labels (we only want distinct events like sirens or horns)
        const ignoreList = ["Speech", "Silence", "Inside, small room", "Inside, large room or hall", "Noise", "Mechanisms"];
        
        if (topCategory.score > 0.35 && !ignoreList.includes(topCategory.categoryName)) {
            // Prevent spamming the same sound
            if (topCategory.categoryName !== lastSound) {
                appendHistory(`<b style="color: #d9534f; font-size: 18px;">[${topCategory.categoryName}]</b> `);
                
                lastSound = topCategory.categoryName;
                clearTimeout(soundTimeout);
                soundTimeout = setTimeout(() => { lastSound = ""; }, 4000); // Wait 4 seconds before allowing the same label
            }
        }
    }
}

// --- 5. VIBRATION & VOLUME LOGIC ---
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
    
    // Threshold & Cooldown for Vibrate
    if (averageVolume > 20 && (currentTime - lastVibrateTime > 250)) { 
        let vibrateDuration = 50; 
        if (averageVolume > 70) vibrateDuration = 200; 
        else if (averageVolume > 40) vibrateDuration = 100; 

        if (navigator.vibrate) navigator.vibrate(vibrateDuration);
        lastVibrateTime = currentTime;
    }

    animationId = requestAnimationFrame(processVolumeForVibration);
}

// --- HELPER: UPDATE UI TEXT ---
function appendHistory(htmlString) {
    fullHistory += htmlString;
    updateTranscriptionBox();
}

function updateTranscriptionBox() {
    transcriptionBox.innerHTML = `<span style="color: black;">${fullHistory}</span>`;
    transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
}