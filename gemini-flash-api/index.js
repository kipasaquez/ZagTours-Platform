import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

const app = express();
const upload = multer(); // default uses memory storage

// Inisialisasi Gemini AI SDK
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// Gunakan Gemini 2.5 Flash sesuai kebutuhan modern
const GEMINI_MODEL = 'gemini-2.5-flash';

app.use(express.json());

// Utility untuk convert file Buffer dari Multer ke format API Gemini inlineData
const fileToGenerativePart = (file) => {
    return {
        inlineData: {
            data: file.buffer.toString('base64'),
            mimeType: file.mimetype
        }
    };
};

// 1. /generate-text (Sudah difix syntax error-nya)
app.post('/generate-text', async (req, res) => {
    const { prompt } = req.body;
    
    if (!prompt) {
        return res.status(400).json({ error: "Prompt text is required in request body" });
    }

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt
        });
        res.status(200).json({ result: response.text });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 2. /generate-from-image (Upload 1 Gambar + Opsional Prompt)
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No image file uploaded." });
        }

        // Default prompt kalau kosong
        const finalPrompt = prompt || "Deskripsikan secara detail gambar apa ini.";
        
        const imagePart = fileToGenerativePart(file);

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                imagePart,
                { text: finalPrompt }
            ]
        });

        res.status(200).json({ result: response.text });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 3. /generate-from-document (Upload PDF/TXT/DOCX + Opsional Prompt)
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No document file uploaded." });
        }

        // Default prompt kalau kosong
        const finalPrompt = prompt || "Buatlah ringkasan poin-poin penting dari isi dokumen ini.";

        const docPart = fileToGenerativePart(file);

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                docPart,
                { text: finalPrompt }
            ]
        });

        res.status(200).json({ result: response.text });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// 4. /generate-from-audio (Upload Audio MP3/WAV + Opsional Prompt)
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No audio file uploaded." });
        }

        // Default prompt kalau kosong
        const finalPrompt = prompt || "Tolong transkripsikan isi rekaman audio ini ke dalam teks.";

        const audioPart = fileToGenerativePart(file);

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                audioPart,
                { text: finalPrompt }
            ]
        });

        res.status(200).json({ result: response.text });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint health check sederhana
app.get('/', (req, res) => {
    res.send("AI Chatbot Express API is running with Gemini 2.5 Flash!");
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});