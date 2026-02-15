let audioContext;
let analyser;
let microphone;
let isListening = false;
let animationId;
let lastVibrateTime = 0;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const display = document.getElementById('display');
const volumeBar = document.getElementById('volumeBar');
const transcriptionBox = document.getElementById('transcriptionBox');

// Set up Speech Recognition (Web Speech API)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening even if the user pauses
    recognition.interimResults = true; // Show words as they are being spoken
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        // Display the text (interim text is gray, final text is black)
        transcriptionBox.innerHTML = `
            <span style="color: black;">${finalTranscript}</span>
            <span style="color: gray;"><i>${interimTranscript}</i></span>
        `;
    };

    // Auto-restart if it stops accidentally
    recognition.onend = () => {
        if (isListening) recognition.start();
    };
} else {
    transcriptionBox.innerHTML = "<span style='color:red;'>Speech Recognition not supported in this browser. Try Chrome.</span>";
}

startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // 1. Start Vibration Audio Logic
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; 
        
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        isListening = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        display.innerText = "Listening for sounds...";
        transcriptionBox.innerHTML = "<span style='color: gray;'>Listening...</span>";
        
        processAudio(); 

        // 2. Start Speech Recognition
        if (recognition) {
            try { recognition.start(); } catch (e) {} // Catch error if already started
        }

    } catch (err) {
        display.innerText = "Error: Mic access denied.";
        console.error(err);
    }
});

stopBtn.addEventListener('click', () => {
    isListening = false;
    cancelAnimationFrame(animationId);
    
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }
    
    // Stop Speech Recognition
    if (recognition) {
        recognition.stop();
    }

    startBtn.disabled = false;
    stopBtn.disabled = true;
    display.innerText = "Stopped.";
    volumeBar.style.width = '0%';
});

// Vibration Logic (Unchanged)
function processAudio() {
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

    animationId = requestAnimationFrame(processAudio);
}