import 'dotenv/config'
import express, { text } from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'

const app = express();
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const GEMINI_MODEL = 'gemini-2.5-flash';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use(express.static('public'));

app.post('/api/chat', async (req, res) => {
    const { conversation, systemPrompt } = req.body;
    const fallbackInstruction = "Kamu adalah Asisten AI yang ramah dan cerdas. Jawab menggunakan Bahasa Indonesia yang natural. Gunakan format Markdown yang rapi jika perlu.";

    try {
        if (!Array.isArray(conversation)) {
            return res.status(400).json({ error: 'Conversation must be an array!' });
        }

        const contents = conversation.map(({ role, text, image }) => {
            const parts = [];

            if (image && image.data && image.mimeType) {
                parts.push({
                    inlineData: {
                        data: image.data,
                        mimeType: image.mimeType
                    }
                });
            }

            parts.push({ text: text || "" });

            return {
                role: role === 'model' || role === 'bot' ? 'model' : 'user',
                parts: parts
            };
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        const responseStream = await ai.models.generateContentStream({
            model: GEMINI_MODEL,
            contents,
            config: {
                temperature: 0.8,
                systemInstruction: systemPrompt || fallbackInstruction
            }
        });

        for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
                res.write(chunkText); 
            }
        }
        
        res.end();

    } catch (e) {
        console.error("Stream Error:", e);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error saat streaming data' });
        } else {
            res.end();
        }
    }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
