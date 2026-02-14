// Helper function to print errors directly to your phone screen
function logToScreen(message, isError = false) {
    let debugDiv = document.getElementById('debug-log');
    if (!debugDiv) {
        debugDiv = document.createElement('div');
        debugDiv.id = 'debug-log';
        debugDiv.style.cssText = "margin-top: 20px; padding: 10px; background: #eee; font-size: 14px; text-align: left; height: 200px; overflow-y: auto; border-radius: 5px;";
        document.body.appendChild(debugDiv);
    }
    const color = isError ? "red" : "green";
    debugDiv.innerHTML = `<div style="color: ${color}; margin-bottom: 5px;">➔ ${message}</div>` + debugDiv.innerHTML;
}

document.getElementById('startBtn').addEventListener('click', async () => {
    document.getElementById('startBtn').disabled = true;
    document.getElementById('display').innerText = "Mic is ON. Waiting 5s...";
    logToScreen("Start button clicked.");

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        logToScreen("Microphone access granted.");

        mediaRecorder.ondataavailable = async (event) => {
            logToScreen(`Captured audio chunk: ${event.data.size} bytes`);
            
            if (event.data.size > 0) {
                const formData = new FormData();
                formData.append('audio', event.data, 'clip.webm');
                
                try {
                    logToScreen("Sending to server...");
                    const response = await fetch('/analyze-audio', { 
                        method: 'POST', 
                        body: formData 
                    });
                    
                    logToScreen(`Server responded with status: ${response.status}`);
                    
                    if (!response.ok) {
                        throw new Error(`Server error ${response.status}`);
                    }

                    const result = await response.json();
                    logToScreen(`Gemini says: ${result.description}`);
                    
                    if (result.isImportant && result.description.toLowerCase() !== "none") {
                        document.getElementById('display').innerHTML = `<span style="color:red;">⚠️ ${result.description}</span>`;
                        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
                    } else {
                        document.getElementById('display').innerText = "Normal background noise...";
                    }
                } catch (err) {
                    logToScreen(`Fetch Error: ${err.message}`, true);
                }
            }
        };

        setInterval(() => {
            if (mediaRecorder.state === "recording") {
                mediaRecorder.requestData();
                logToScreen("Requested 5s audio chunk...");
            }
        }, 5000);

        mediaRecorder.start();
        logToScreen("Recording started.");

    } catch (err) {
        logToScreen(`Mic Error: ${err.message}`, true);
        document.getElementById('display').innerText = "Error: Mic access denied.";
    }
});