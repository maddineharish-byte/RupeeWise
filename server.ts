import express, { Request, Response } from 'express';
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

// WebSocket Server for Gemini 3.8 Live API Voice conversations
const wss = new WebSocketServer({ server, path: '/api/live' });

app.use(express.json({ limit: '10mb' }));

// Shared server-side Google GenAI instance with telemetry User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// REST Endpoint: Multi-Turn Gemini Chat
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, model, systemInstruction, financialContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    // Model selection based on user request / task complexity
    // Default to gemini-3.5-flash for general tasks, gemini-3.1-flash-lite for fast tasks, gemini-3.1-pro-preview for complex
    const allowedModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
    const selectedModel = allowedModels.includes(model) ? model : 'gemini-3.5-flash';

    // Construct enriched system instruction
    let fullSystemInstruction =
      systemInstruction ||
      `You are RupeeWise AI, an expert, empathetic personal finance coach for Indian students, first-time job holders, and young adults.
Your currency is Indian Rupees (₹).
Tone: practical, empowering, analytical, culturally aware of student realities (mess food, college books, hostel/PG rent, UPI habits, pocket money, festival savings).
Help the user make wise trade-offs, manage daily burn rates, and avoid debt or impulsive spending.`;

    if (financialContext) {
      fullSystemInstruction += `\n\n[USER CURRENT FINANCIAL SNAPSHOT]:
- Starting 30-Day Budget: ₹${financialContext.startingBudgetRupees || 10000}
- Current Day: Day ${financialContext.currentDay || 10} of ${financialContext.totalDays || 30} (${financialContext.daysRemaining || 21} days remaining)
- Current Bank Balance: ₹${financialContext.currentBalanceRupees || 7000} (before unpaid commitments)
- Unpaid Protected Bills: ₹${financialContext.unpaidCommitmentsRupees || 2000}
- True Available to Spend: ₹${financialContext.availableToSpendRupees || 5000}
- Safe Daily Spending Allowance: ₹${financialContext.dailyAllowanceRupees || 238}/day
- Current Daily Burn: ₹${financialContext.currentDailyBurnRupees || 300}/day
- Remaining Savings Target: ₹${financialContext.remainingSavingsTargetRupees || 2000}
- Financial Health Score: ${financialContext.healthScore || 91}/100 (${financialContext.riskLevel || 'Low'} Risk)

Use these exact figures when advising the user about their financial reality.`;
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
    console.error('RupeeWise Chat Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate response from Gemini API',
    });
  }
});

// REST Endpoint: Voice Transaction Recognition & Slot Filling
app.post('/api/voice-transaction', async (req: Request, res: Response): Promise<void> => {
  try {
    const { history, transcript } = req.body;

    if (!transcript && (!history || history.length === 0)) {
      res.status(400).json({ error: 'Transcript or conversation history is required.' });
      return;
    }

    const conversationPrompt = `Conversation History:
${(history || [])
  .map((h: { role: string; text: string }) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
  .join('\n')}
Latest User Spoken Input: "${transcript}"`;

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
    console.error('Voice transaction extraction error:', error);
    res.status(500).json({
      error: error.message || 'Failed to process voice transaction',
    });
  }
});

// WebSocket Handler: Gemini 3.8 Live API Voice Conversations
wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Gemini Live voice stream');

  let session: any = null;

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
        },
        onerror: (err: any) => {
          console.error('Gemini Live session error:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', message: err.message || 'Live API error' }));
          }
        },
      },
    });

    // Notify client that voice session is ready
    clientWs.send(JSON.stringify({ type: 'ready' }));

    // Forward microphone audio chunks from client to Gemini Live session
    clientWs.on('message', (rawData: any) => {
      try {
        const payload = JSON.parse(rawData.toString());
        if (payload.audio && session) {
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
      if (session) {
        try {
          session.close();
        } catch (e) {
          // ignore
        }
      }
    });
  } catch (err: any) {
    console.error('Failed to initialize Gemini Live session:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: err.message || 'Failed to connect to Gemini 3.8 Live API',
        })
      );
      clientWs.close();
    }
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
