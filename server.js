const express = require('express');
const app = express();
const port = 3000;

// Serve the frontend files
app.use(express.static('public'));

app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`Make sure to open it on your phone for vibrations to work!`);
});