import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { chat } from './chat';
import { sessionManager } from './sessions';
import { workspace } from './workspace';

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 3001;

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: 'ulfberht-warden',
    activeSessions: sessionManager.getActiveSessions(),
  });
});

// WebSocket connection
io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId || socket.id;
  console.log(`[WebSocket] User connected: ${userId}`);

  // Send history on connect
  const history = sessionManager.getHistory(userId);
  if (history.length > 0) {
    socket.emit('history', history);
    console.log(`[WebSocket] Sent ${history.length} messages to ${userId}`);
  }

  // Handle incoming messages
  socket.on('message', async (userMessage: string) => {
    try {
      console.log(`[WebSocket] Message from ${userId}: ${userMessage.substring(0, 50)}...`);

      // Add user message to session
      sessionManager.addMessage(userId, {
        role: 'user',
        content: userMessage,
      });

      // Get current history
      const history = sessionManager.getHistory(userId);

      // Emit thinking status
      socket.emit('thinking', true);

      // Get response from Claude
      const assistantMessage = await chat({
        userId,
        userMessage,
        history: history.slice(0, -1), // Exclude the message we just added
        onThinking: () => {
          socket.emit('thinking', true);
        },
        onMessage: (text) => {
          socket.emit('message', text);
        },
      });

      // Add assistant message to session
      sessionManager.addMessage(userId, {
        role: 'assistant',
        content: assistantMessage,
      });

      // Emit thinking done
      socket.emit('thinking', false);
    } catch (error) {
      console.error(`[WebSocket] Error processing message:`, error);
      socket.emit('error', {
        message: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
      socket.emit('thinking', false);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`[WebSocket] User disconnected: ${userId}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('🛡️  ULFBERHT-WARDEN BACKEND');
  console.log('='.repeat(50));
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Model: claude-sonnet-4-20250514`);
  console.log('='.repeat(50));
  console.log('');

  // Validate environment
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set!');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});
