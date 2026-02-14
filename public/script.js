async function startMonitoring() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        
        console.log("🎤 Microphone access granted. Monitoring started...");

        mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                console.log(`📦 Audio chunk captured: ${(event.data.size / 1024).toFixed(2)} KB`);
                
                const formData = new FormData();
                // Note: Browsers usually record in webm, so we name it clip.webm
                formData.append('audio', event.data, 'clip.webm');

                try {
                    const response = await fetch('/analyze-audio', { 
                        method: 'POST', 
                        body: formData 
                    });
                    
                    const result = await response.json();
                    console.log("🤖 Gemini Analysis:", result.description);

                    if (result.isImportant && result.description.toLowerCase() !== "none") {
                        triggerAlert(result.description);
                    } else {
                        document.getElementById('display').innerText = "Listening... (Quiet)";
                    }
                } catch (err) {
                    console.error("❌ Server Error:", err);
                }
            }
        };

        // Capture 5 seconds of audio continuously
        setInterval(() => {
            if (mediaRecorder.state === "recording") {
                mediaRecorder.requestData();
                console.log("⏱️ 5 seconds passed. Requesting data...");
            }
        }, 5000);

        mediaRecorder.start();

    } catch (err) {
        console.error("❌ Mic access denied:", err);
        document.getElementById('display').innerText = "Error: Mic access denied.";
    }
}

function triggerAlert(text) {
    console.log("⚠️ ALERT TRIGGERED:", text);
    const display = document.getElementById('display');
    display.innerHTML = `<b style="color: red;">Detected: ${text}</b>`;
    
    // Vibrate pattern: vibrate 200ms, pause 100ms, vibrate 200ms
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
}

// Start when the user interacts with the page (required by browsers)
document.addEventListener('click', () => {
    if (typeof monitoringStarted === 'undefined') {
        startMonitoring();
        window.monitoringStarted = true;
    }
}, { once: true });