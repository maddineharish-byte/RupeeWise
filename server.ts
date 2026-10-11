import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Simple in-memory rate limiting map (IP -> timestamps[])
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests/min per IP

function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });
    return;
  }

  recentTimestamps.push(now);
  rateLimitMap.set(ip, recentTimestamps);
  next();
}

// Security: Enforce tight JSON body limit (100KB instead of 10MB)
app.use(express.json({ limit: '100kb' }));
app.use(rateLimiter);

// Gemini API instance with server-side API key and telemetry User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Explicit model allowlist
const ALLOWED_CHAT_MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'] as const;

/**
 * Validates and sanitizes financial context fields.
 */
function sanitizeFinancialContext(ctx: any) {
  if (!ctx || typeof ctx !== 'object') return null;

  const sanitizeNumber = (val: any, fallback: number, max = 10000000) => {
    const num = Number(val);
    return isFinite(num) && num >= 0 && num <= max ? Math.round(num) : fallback;
  };

  return {
    startingBudgetRupees: sanitizeNumber(ctx.startingBudgetRupees, 10000),
    currentDay: Math.min(31, Math.max(1, sanitizeNumber(ctx.currentDay, 10, 31))),
    totalDays: Math.min(31, Math.max(1, sanitizeNumber(ctx.totalDays, 30, 31))),
    daysRemaining: Math.min(31, Math.max(1, sanitizeNumber(ctx.daysRemaining, 21, 31))),
    currentBalanceRupees: sanitizeNumber(ctx.currentBalanceRupees, 7000),
    unpaidCommitmentsRupees: sanitizeNumber(ctx.unpaidCommitmentsRupees, 2000),
    availableToSpendRupees: sanitizeNumber(ctx.availableToSpendRupees, 5000),
    dailyAllowanceRupees: sanitizeNumber(ctx.dailyAllowanceRupees, 238),
    currentDailyBurnRupees: sanitizeNumber(ctx.currentDailyBurnRupees, 300),
    remainingSavingsTargetRupees: sanitizeNumber(ctx.remainingSavingsTargetRupees, 2000),
    healthScore: Math.min(100, Math.max(0, sanitizeNumber(ctx.healthScore, 91, 100))),
    riskLevel: ['Low', 'Moderate', 'Elevated', 'High'].includes(ctx.riskLevel) ? ctx.riskLevel : 'Low',
  };
}

// REST Endpoint: Multi-Turn Gemini Chat
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, model, financialContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    // Security bounds: max 20 messages history, max 2000 chars per message
    if (messages.length > 20) {
      res.status(400).json({ error: 'Message history limit exceeded (max 20 messages).' });
      return;
    }

    for (const m of messages) {
      if (!m || typeof m.content !== 'string' || m.content.length > 2000) {
        res.status(400).json({ error: 'Message content must be string and under 2,000 characters.' });
        return;
      }
    }

    // Strict model allowlist
    const selectedModel = (ALLOWED_CHAT_MODELS as readonly string[]).includes(model)
      ? model
      : 'gemini-3.5-flash';

    // Server-enforced system prompt (client systemInstruction cannot override)
    let fullSystemInstruction = `You are RupeeWise AI, an expert, empathetic personal finance coach for Indian students, first-time job holders, and young adults.
Your currency is Indian Rupees (₹).
Tone: practical, empowering, analytical, culturally aware of student realities (mess food, college books, hostel/PG rent, UPI habits, pocket money, festival savings).
Help the user make wise trade-offs, manage daily burn rates, and avoid debt or impulsive spending.`;

    const sanitizedCtx = sanitizeFinancialContext(financialContext);
    if (sanitizedCtx) {
      fullSystemInstruction += `\n\n[USER CURRENT FINANCIAL SNAPSHOT]:
- Starting 30-Day Budget: ₹${sanitizedCtx.startingBudgetRupees}
- Current Day: Day ${sanitizedCtx.currentDay} of ${sanitizedCtx.totalDays} (${sanitizedCtx.daysRemaining} days remaining)
- Current Bank Balance: ₹${sanitizedCtx.currentBalanceRupees} (before unpaid commitments)
- Unpaid Protected Bills: ₹${sanitizedCtx.unpaidCommitmentsRupees}
- True Available to Spend: ₹${sanitizedCtx.availableToSpendRupees}
- Safe Daily Spending Allowance: ₹${sanitizedCtx.dailyAllowanceRupees}/day
- Current Daily Burn: ₹${sanitizedCtx.currentDailyBurnRupees}/day
- Remaining Savings Target: ₹${sanitizedCtx.remainingSavingsTargetRupees}
- Financial Health Score: ${sanitizedCtx.healthScore}/100 (${sanitizedCtx.riskLevel} Risk)

Use these exact verified figures when advising the user.`;
    }

    // Convert multi-turn history into Gemini contents format
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: 0.7,
      },
    });

    res.json({
      text: response.text || '',
      modelUsed: selectedModel,
    });
  } catch (error: any) {
    console.error('RupeeWise Chat Error:', error?.message || 'Internal error');
    // Security: Do not expose raw internal stack traces or API keys
    res.status(500).json({
      error: 'Failed to generate financial advisory response. Please try again.',
    });
  }
});

// REST Endpoint: Voice Transaction Recognition & Slot Filling
app.post('/api/voice-transaction', async (req: Request, res: Response): Promise<void> => {
  try {
    const { history, transcript } = req.body;

    // Length limit checks
    if (transcript && (typeof transcript !== 'string' || transcript.length > 500)) {
      res.status(400).json({ error: 'Transcript must be under 500 characters.' });
      return;
    }

    if (history && Array.isArray(history)) {
      if (history.length > 10) {
        res.status(400).json({ error: 'History limit exceeded (max 10 turns).' });
        return;
      }
      for (const h of history) {
        if (!h || typeof h.text !== 'string' || h.text.length > 500) {
          res.status(400).json({ error: 'Conversation turns must be under 500 characters.' });
          return;
        }
      }
    }

    if (!transcript && (!history || history.length === 0)) {
      res.status(400).json({ error: 'Transcript or conversation history is required.' });
      return;
    }

    const conversationPrompt = `Conversation History:
${(history || [])
  .map((h: { role: string; text: string }) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
  .join('\n')}
Latest User Spoken Input: "${transcript || ''}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: conversationPrompt,
      config: {
        systemInstruction: `You are RupeeWise Voice Transaction Agent.
Your job is to extract financial transaction information from the user's spoken words in Indian Rupees (₹).
Valid categories:
- Food & Dining
- Rent & Housing
- Utilities & Bills
- Books & Education
- Transit & Travel
- Entertainment
- Shopping & Personal
- Healthcare
- Savings & Investments
- Other

Requirements to complete a transaction:
1. type: 'expense' (spending, buying, paying, eating out) or 'income' (salary, stipend, gift, freelance earnings).
2. amountRupees: numeric positive value in Rupees.
3. category: select the most appropriate category from the valid categories list.
4. description: concise description of the item, activity, or payer.

Logic:
- If all 4 fields (type, amountRupees, category, description) are clearly identified or can be reasonably inferred from the user's inputs across the conversation:
  - set isComplete: true
  - set missingFields: []
  - set spokenReply: A short, natural confirmation in one sentence (e.g., "Added an expense of ₹450 for Cafeteria Lunch under Food & Dining.")
- If any required field is missing (especially amount, or what the spend was for):
  - set isComplete: false
  - set missingFields: array containing missing field names ('amountRupees', 'description', or 'category')
  - set spokenReply: Directly and politely ask the user for that specific missing piece of information.
    Examples:
    - If user said "I bought textbooks": "How much did you spend on the textbooks?"
    - If user said "Add expense of 500 rupees": "What was the ₹500 spent on?"
    - If user said "Spent 100 on chai": All fields are present! (amountRupees: 100, description: "Chai snacks", category: "Food & Dining", isComplete: true)`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isComplete: { type: Type.BOOLEAN },
            type: { type: Type.STRING },
            amountRupees: { type: Type.NUMBER },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            missingFields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            spokenReply: { type: Type.STRING },
          },
          required: ['isComplete', 'type', 'missingFields', 'spokenReply'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Voice transaction extraction error:', error?.message || 'Internal error');
    res.status(500).json({
      error: 'Failed to process voice transaction.',
    });
  }
});

// WebSocket Server for Gemini 3.8 Live API Voice conversations
const wss = new WebSocketServer({
  server,
  path: '/api/live',
  maxPayload: 1024 * 1024, // 1MB max websocket frame size
});

wss.on('connection', async (clientWs: WebSocket, req) => {
  console.log('Client connected to Gemini Live voice stream');

  let session: any = null;
  let isClosed = false;

  const cleanupSession = () => {
    if (isClosed) return;
    isClosed = true;
    if (session) {
      try {
        session.close();
      } catch (e) {
        // ignore
      }
      session = null;
    }
  };

  try {
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
        systemInstruction: `You are RupeeWise Voice, a quick, conversational, friendly personal finance companion for Indian students and young adults.
Speak concisely in English with natural Indian terminology when helpful (Rupees ₹, UPI, pocket money, mess fees, bills).
Keep your answers brief (1-3 sentences) and conversational since this is spoken audio. Always encourage financial mindfulness.`,
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          if (clientWs.readyState !== WebSocket.OPEN) return;

          // Model audio chunk output
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio) {
            clientWs.send(JSON.stringify({ type: 'audio', audio }));
          }

          // User interrupted speaking
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }
        },
        onclose: () => {
          console.log('Gemini Live session closed');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'session_closed' }));
          }
          cleanupSession();
        },
        onerror: (err: any) => {
          console.error('Gemini Live session error:', err?.message || 'Unknown');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', message: 'Gemini Live voice service encountered an error.' }));
          }
          cleanupSession();
        },
      },
    });

    // Notify client that voice session is ready
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'ready' }));
    }

    // Forward microphone audio chunks from client to Gemini Live session
    clientWs.on('message', (rawData: any) => {
      try {
        const payload = JSON.parse(rawData.toString());
        if (payload.audio && session && typeof payload.audio === 'string') {
          session.sendRealtimeInput({
            audio: {
              data: payload.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
      } catch (err) {
        console.error('Error processing client audio chunk:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('Client disconnected from Gemini Live voice stream');
      cleanupSession();
    });

    clientWs.on('error', (err) => {
      console.error('Client WebSocket error:', err);
      cleanupSession();
    });
  } catch (err: any) {
    console.error('Failed to initialize Gemini Live session:', err?.message || 'Error');
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: 'Failed to connect to Gemini 3.8 Live API.',
        })
      );
      clientWs.close();
    }
    cleanupSession();
  }
});

// Mount Vite or static files
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`RupeeWise Full-Stack Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
