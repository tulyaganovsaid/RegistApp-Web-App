import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { queryGemini, generateOfflineAgentAnswer } from './server/aiAgent';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Client network info for legal consent ledger (IP address, user agent, server timestamp)
app.get('/api/client-info', (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  let ip = '127.0.0.1';
  if (typeof forwarded === 'string') {
    ip = forwarded.split(',')[0].trim();
  } else if (Array.isArray(forwarded) && forwarded.length > 0) {
    ip = forwarded[0].trim();
  } else if (req.socket.remoteAddress) {
    ip = req.socket.remoteAddress;
  } else if (req.ip) {
    ip = req.ip;
  }

  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  res.json({
    ipAddress: ip,
    userAgent: (req.headers['user-agent'] as string) || '',
    serverTimestamp: new Date().toISOString()
  });
});

// Cooldown timestamp for Gemini quota depletion / billing issues
let geminiCooldownUntil = 0;

// API endpoint for AI Support
app.post('/api/support/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], language = 'ru', legalKnowledgeBase = '' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. If not cooling down from previous quota exhaustion, try online Gemini Agent
    if (Date.now() > geminiCooldownUntil) {
      try {
        const geminiReply = await queryGemini(message, conversationHistory, {
          language,
          legalKnowledgeBase
        });

        if (geminiReply) {
          return res.json({ reply: geminiReply, source: 'gemini' });
        } else {
          // Cooldown 5 mins if quota was exhausted
          geminiCooldownUntil = Date.now() + 5 * 60 * 1000;
        }
      } catch (err: any) {
        geminiCooldownUntil = Date.now() + 5 * 60 * 1000;
      }
    }

    // 2. Comprehensive AI domain agent answering database knowledge, travel, sights, transport, food, telecoms, etc.
    const agentAnswer = generateOfflineAgentAnswer(message, language, legalKnowledgeBase);
    return res.json({ reply: agentAnswer, source: 'knowledge_agent' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// API endpoint for translating chat conversation when language changes
app.post('/api/support/translate-chat', async (req, res) => {
  try {
    const { messages = [], targetLanguage = 'ru', legalKnowledgeBase = '' } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.json({ messages: [] });
    }

    const translated = messages.map(msg => {
      // Welcome greetings are already localized on client
      if (msg.id === 'welcome-msg' || msg.id === 'msg-welcome') {
        return msg;
      }
      // Re-generate offline agent answer if it was an AI response to a query
      if (msg.sender === 'model' || msg.sender === 'ai') {
        const reAnswered = generateOfflineAgentAnswer(msg.originalQuery || msg.text, targetLanguage, legalKnowledgeBase);
        return {
          ...msg,
          text: reAnswered
        };
      }
      return msg;
    });

    return res.json({ messages: translated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Translation error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RegistApp Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
