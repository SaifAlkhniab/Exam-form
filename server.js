const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Exam Form Creator Server is running.' });
});

// Fallback to React index.html for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(` Exam Form Creator is running successfully!`);
  console.log(` Local access:   http://localhost:${PORT}`);
  console.log(` Network access: http://0.0.0.0:${PORT}`);
  console.log(`=======================================================`);
});
