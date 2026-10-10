import express, { Request, Response } from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Configure Multer for in-memory audio file uploads (Groq Whisper limit is 25MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
  fileFilter: (_req, file, cb) => {
    // Accepted audio formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
    const allowedMime = [
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
      'audio/mp3',
      'audio/mpeg',
      'audio/m4a',
      'audio/x-m4a',
      'audio/mp4',
      'audio/ogg',
      'audio/webm',
      'video/webm',
      'audio/flac',
      'audio/x-flac',
      'audio/aac',
    ];
    if (allowedMime.includes(file.mimetype.toLowerCase()) || file.originalname.match(/\.(mp3|wav|m4a|webm|ogg|flac|mp4|aac|mpeg)$/i)) {
      cb(null, true);
    } else {
      cb(null, true); // Allow and let Groq API validate or attempt conversion
    }
  },
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Helper to resolve Groq API Key (from request header or server env)
function getGroqApiKey(req: Request): string | null {
  const headerKey = req.headers['x-groq-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
    return process.env.GROQ_API_KEY.trim();
  }
  return null;
}

// Health & Config Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasServerApiKey: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()),
    timestamp: new Date().toISOString(),
  });
});

// Speech-to-Text Transcription via Groq Whisper API
app.post('/api/transcribe', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const apiKey = getGroqApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        error: 'Groq API Key is required. Please set it in Settings or add GROQ_API_KEY to .env.',
        code: 'MISSING_API_KEY',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided. Please record audio or upload an audio file.',
        code: 'MISSING_FILE',
      });
    }

    const model = (req.body.model as string) || 'whisper-large-v3';
    const responseFormat = (req.body.response_format as string) || 'verbose_json';
    const language = (req.body.language as string) || '';
    const temperature = req.body.temperature ? parseFloat(req.body.temperature as string) : undefined;
    const prompt = (req.body.prompt as string) || '';

    // Prepare FormData for Groq API
    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(req.file.buffer)], {
      type: req.file.mimetype || 'audio/wav',
    });
    
    // Choose appropriate extension
    let filename = req.file.originalname || 'recording.wav';
    if (!filename.includes('.')) {
      filename += '.wav';
    }

    formData.append('file', audioBlob, filename);
    formData.append('model', model);
    formData.append('response_format', responseFormat);

    if (language && language !== 'auto') {
      formData.append('language', language);
    }
    if (typeof temperature === 'number' && !isNaN(temperature)) {
      formData.append('temperature', String(temperature));
    }
    if (prompt && prompt.trim()) {
      formData.append('prompt', prompt.trim());
    }

    const startTime = Date.now();
    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const elapsedMs = Date.now() - startTime;

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      let errJson: any = null;
      try {
        errJson = JSON.parse(errText);
      } catch {
        // keep as text
      }
      const message = errJson?.error?.message || errText || `Groq API responded with status ${groqRes.status}`;
      return res.status(groqRes.status).json({
        error: message,
        details: errJson || errText,
      });
    }

    let result: any;
    if (responseFormat === 'json' || responseFormat === 'verbose_json') {
      result = await groqRes.json();
    } else {
      const text = await groqRes.text();
      result = { text };
    }

    return res.json({
      success: true,
      data: result,
      elapsedMs,
      model,
      filename,
      sizeBytes: req.file.size,
    });
  } catch (error: any) {
    console.error('Error in /api/transcribe:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error while transcribing audio',
    });
  }
});

// Direct Audio Translation into English via Groq
app.post('/api/translate-audio', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const apiKey = getGroqApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        error: 'Groq API Key is required. Please set it in Settings or add GROQ_API_KEY to .env.',
        code: 'MISSING_API_KEY',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided.',
        code: 'MISSING_FILE',
      });
    }

    const model = (req.body.model as string) || 'whisper-large-v3';
    const responseFormat = (req.body.response_format as string) || 'verbose_json';
    const prompt = (req.body.prompt as string) || '';

    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(req.file.buffer)], {
      type: req.file.mimetype || 'audio/wav',
    });

    let filename = req.file.originalname || 'recording.wav';
    if (!filename.includes('.')) {
      filename += '.wav';
    }

    formData.append('file', audioBlob, filename);
    formData.append('model', model);
    formData.append('response_format', responseFormat);
    if (prompt && prompt.trim()) {
      formData.append('prompt', prompt.trim());
    }

    const startTime = Date.now();
    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/translations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const elapsedMs = Date.now() - startTime;

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      let errJson: any = null;
      try {
        errJson = JSON.parse(errText);
      } catch {
        // ignore
      }
      const message = errJson?.error?.message || errText || `Groq API responded with status ${groqRes.status}`;
      return res.status(groqRes.status).json({
        error: message,
        details: errJson || errText,
      });
    }

    let result: any;
    if (responseFormat === 'json' || responseFormat === 'verbose_json') {
      result = await groqRes.json();
    } else {
      const text = await groqRes.text();
      result = { text };
    }

    return res.json({
      success: true,
      data: result,
      elapsedMs,
      model,
      filename,
    });
  } catch (error: any) {
    console.error('Error in /api/translate-audio:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error while translating audio',
    });
  }
});

// Transcript AI Enhancement via Groq LLM (llama-3.3-70b-versatile)
app.post('/api/enhance', async (req: Request, res: Response) => {
  try {
    const apiKey = getGroqApiKey(req);
    if (!apiKey) {
      return res.status(401).json({
        error: 'Groq API Key is required.',
        code: 'MISSING_API_KEY',
      });
    }

    const { transcript, task, targetLanguage, customInstruction } = req.body;
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript text is required' });
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (task) {
      case 'summary':
        systemPrompt = 'You are an executive assistant. Generate a crisp, high-signal summary of the provided transcript. Include a 2-3 sentence overview, followed by 3-5 bulleted key takeaways.';
        userPrompt = `TRANSCRIPT:\n"""\n${transcript}\n"""\n\nGenerate the summary now.`;
        break;
      case 'meeting_notes':
        systemPrompt = 'You are a professional meeting scribe. Format the provided audio transcript into formal meeting minutes with: 1. Executive Summary, 2. Key Discussion Topics, 3. Decisions Reached, 4. Action Items (with assignees/next steps if mentioned).';
        userPrompt = `TRANSCRIPT:\n"""\n${transcript}\n"""\n\nFormat as structured meeting minutes.`;
        break;
      case 'action_items':
        systemPrompt = 'You are an operations specialist. Extract all actionable tasks, commitments, deliverables, and next steps mentioned in this transcript. Format as a clean markdown checklist with priority levels (High/Medium/Normal).';
        userPrompt = `TRANSCRIPT:\n"""\n${transcript}\n"""\n\nExtract all action items now.`;
        break;
      case 'polish':
        systemPrompt = 'You are an expert editor. Clean up the spoken transcript by fixing stutters, false starts, filler words (um, uh, like, you know), and punctuation mistakes while strictly preserving the speaker\'s original intent, vocabulary, and tone. Return only the cleaned transcript.';
        userPrompt = `TRANSCRIPT:\n"""\n${transcript}\n"""\n\nReturn the cleaned transcript now.`;
        break;
      case 'translate':
        systemPrompt = `You are a professional multilingual translator. Accurately translate the transcript into ${targetLanguage || 'Spanish'} while preserving natural conversational nuances. Return the translation.`;
        userPrompt = `TRANSCRIPT:\n"""\n${transcript}\n"""\n\nTranslate to ${targetLanguage || 'Spanish'}.`;
        break;
      case 'qa':
        systemPrompt = 'Analyze the transcript and generate 4-6 insightful Q&A pairs (Questions & Answers) that capture the core knowledge and insights discussed.';
        userPrompt = `TRANSCRIPT:\n"""\n${transcript}\n"""\n\nGenerate Q&A pairs now.`;
        break;
      case 'custom':
        systemPrompt = 'You are an expert audio transcript intelligence assistant. Follow the user instructions precisely.';
        userPrompt = `TRANSCRIPT:\n"""\n${transcript}\n"""\n\nINSTRUCTIONS: ${customInstruction || 'Provide insights on this text'}`;
        break;
      default:
        systemPrompt = 'You are an audio transcript analyzer. Provide a helpful summary of the text.';
        userPrompt = `TRANSCRIPT:\n"""\n${transcript}\n"""`;
    }

    const startTime = Date.now();
    const chatRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    const elapsedMs = Date.now() - startTime;

    if (!chatRes.ok) {
      const errText = await chatRes.text();
      return res.status(chatRes.status).json({
        error: `Groq LLM enhancement failed: ${errText}`,
      });
    }

    const chatData = await chatRes.json();
    const resultText = chatData.choices?.[0]?.message?.content || '';

    return res.json({
      success: true,
      result: resultText,
      elapsedMs,
      task,
    });
  } catch (error: any) {
    console.error('Error in /api/enhance:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error while enhancing transcript',
    });
  }
});

// Setup Vite development server middleware in dev mode, or serve static dist in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GroqScribe server running at http://localhost:${PORT}`);
  });
}

startServer();
