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

// Helper function to print errors directly to your phone screen
function logToScreen(message, isError = false) {
    let debugDiv = document.getElementById('debug-log');
    if (!debugDiv) {
        debugDiv = document.createElement('div');
        debugDiv.id = 'debug-log';
        debugDiv.style.cssText = "margin-top: 20px; padding: 10px; background: #eee; font-size: 14px; text-align: left; height: 150px; overflow-y: auto; border-radius: 5px;";
        document.body.appendChild(debugDiv);
    }
    const color = isError ? "red" : "green";
    debugDiv.innerHTML = `<div style="color: ${color}; margin-bottom: 5px;">➔ ${message}</div>` + debugDiv.innerHTML;
}

startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        logToScreen("Microphone access granted.");
        
        // Initialize Web Audio API
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Defines how many audio samples we analyze at a time
        
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        isListening = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        display.innerText = "Listening for sounds...";
        
        processAudio(); // Start the real-time loop
    } catch (err) {
        logToScreen(`Mic Error: ${err.message}`, true);
        display.innerText = "Error: Mic access denied.";
    }
});

stopBtn.addEventListener('click', () => {
    isListening = false;
    cancelAnimationFrame(animationId);
    
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    display.innerText = "Stopped.";
    volumeBar.style.width = '0%';
    logToScreen("Stopped listening.");
});

function processAudio() {
    if (!isListening) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Calculate the average volume of the current audio frame
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
    }
    let averageVolume = sum / bufferLength;

    // Convert volume to a percentage (Max volume is roughly 255)
    let volumePercent = Math.min((averageVolume / 100) * 100, 100); 
    
    // Update the visual volume bar
    volumeBar.style.width = volumePercent + '%';
    if (volumePercent > 70) volumeBar.style.background = 'red';
    else if (volumePercent > 40) volumeBar.style.background = 'orange';
    else volumeBar.style.background = 'green';

    // --- SENSORY SUBSTITUTION LOGIC (VIBRATION) ---
    const currentTime = Date.now();
    
    // Thresholds: Only vibrate if sound is above a certain level (e.g., > 20)
    // Cooldown: Wait 250ms between vibrations so they don't overlap and glitch
    if (averageVolume > 20 && (currentTime - lastVibrateTime > 250)) { 
        
        let vibrateDuration = 50; // default short pulse for medium sound
        
        if (averageVolume > 70) {
            vibrateDuration = 200; // Long strong pulse for loud sounds (siren, shout)
        } else if (averageVolume > 40) {
            vibrateDuration = 100; // Medium pulse for normal loud sounds (claps, drops)
        }

        if (navigator.vibrate) {
            navigator.vibrate(vibrateDuration);
        }
        
        lastVibrateTime = currentTime;
    }

    // Loop this function to keep analyzing real-time
    animationId = requestAnimationFrame(processAudio);
}