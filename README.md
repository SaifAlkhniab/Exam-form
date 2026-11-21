# Exam Form Creator (منظومة إعداد الأسئلة الامتحانية)

A modern, responsive, mobile-first Arabic Exam Form generator designed specifically for Islamic religious schools (Hawzah / مدارس الكفيل الدينية) and formal educational institutions.

## Features

- 📱 **Mobile-First & Light Mode**: Designed for phones and desktops with touch-friendly controls and light theme.
- 💬 **Smart WhatsApp Parser**: Paste unstructured raw exam text received on WhatsApp; the engine automatically extracts the subject, grade/stage, semester, notes, questions, sub-branches, marks `(١٠ د)`, and teacher name.
- 📝 **Interactive Form Builder**: Add, edit, reorder (move up/down), or delete questions and sub-branches with instant feedback.
- 👁️ **True-to-Print A4 Live Preview**: Accurate representation matching the official template with the Holy Al-Abbas Shrine crest, Al-Kafeel division details, and page borders.
- 🖨️ **1-Click Vector PDF Generation**: Produces crisp vector A4 PDFs without clipping or page-break issues.
- 📄 **Direct Word (.docx) Export**: Generates true editable Microsoft Word documents matching the original template.
- ☁️ **Cloud & Local Ready**: Runs locally on your machine or deploys to Google Cloud, Render, VPS, or any Node.js hosting. Zero database lock-in.

---

## How to Run Locally

### 1. Install & Build
```bash
# In the project root directory
npm install
npm run build
```

### 2. Start the Server
```bash
npm start
```
Then open your browser at `http://localhost:5000` (or access via your local network IP on mobile).

---

## How to Deploy to Google Cloud (or Any Cloud Hosting)

This project has zero vendor lock-in. It runs with standard Node.js:
1. Ensure `PORT` environment variable is accepted (already implemented in `server.js`).
2. Run `npm run build` during the build step.
3. Start command: `node server.js` or `npm start`.

---

## Repository Structure

```
exam form creater/
├── client/                     # React + Vite Frontend
│   ├── public/logo.png         # Official Al-Kafeel School Emblem
│   ├── src/
│   │   ├── utils/
│   │   │   ├── parser.js       # Arabic WhatsApp Regex Parser
│   │   │   └── docxExporter.js # Client-side Word (.docx) Generator
│   │   ├── App.jsx             # Main Application Component
│   │   ├── App.module.css      # Pristine Light-Mode & Print CSS
│   │   ├── index.css           # Global CSS Reset
│   │   └── main.jsx
│   └── package.json
├── server.js                   # Node.js Express Server
├── package.json
└── README.md
```
