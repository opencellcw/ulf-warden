import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { chat } from '../chat';
import { runAgent } from '../agent';
import { sessionManager } from '../sessions';
import { log } from '../logger';
import QRCode from 'qrcode-terminal';
import path from 'path';
import { sendQRCodeToDiscord, sendWhatsAppStatusToDiscord } from './whatsapp-qr';

let sock: WASocket | null = null;
let qrGenerated = false;
let discordClient: any = null;

/**
 * Set Discord client for QR code notifications
 */
export function setWhatsAppDiscordClient(client: any) {
  discordClient = client;
  log.info('[WhatsApp] Discord client set for QR notifications');
}

/**
 * WhatsApp Handler using Baileys (WhatsApp Web API)
 *
 * Features:
 * - Auto-reconnect
 * - QR code authentication
 * - Message handling with agent/chat routing
 * - Media support (future)
 */
export async function startWhatsAppHandler() {
  if (!process.env.WHATSAPP_ENABLED || process.env.WHATSAPP_ENABLED !== 'true') {
    console.log('[WhatsApp] Not enabled, skipping WhatsApp handler');
    return null;
  }

  console.log('[WhatsApp] Starting WhatsApp handler...');

  const authPath = process.env.WHATSAPP_AUTH_PATH || path.join(process.cwd(), 'data', 'whatsapp-auth');

  try {
    await connectToWhatsApp(authPath);
    console.log('✓ WhatsApp handler started');
    return sock;
  } catch (error) {
    console.error('[WhatsApp] Failed to start:', error);
    throw error;
  }
}

async function connectToWhatsApp(authPath: string) {
  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  // Create logger with all required methods
  const logger = {
    level: 'silent' as const,
    fatal: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
    child: () => logger // Return self for child logger
  };

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We'll handle QR ourselves
    logger
  });

  // Handle credentials update
  sock.ev.on('creds.update', saveCreds);

  // Handle connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Show QR code for authentication
    if (qr && !qrGenerated) {
      qrGenerated = true;

      log.info('[WhatsApp] QR Code generated');

      // Try to send via Discord first
      if (discordClient) {
        try {
          await sendQRCodeToDiscord(qr, discordClient);
          log.info('[WhatsApp] QR Code sent to Discord');
        } catch (error: any) {
          log.error('[WhatsApp] Failed to send QR to Discord', { error: error.message });
          // Fallback: show in terminal
          console.log('\n[WhatsApp] Scan this QR code with your phone:\n');
          QRCode.generate(qr, { small: true });
          console.log('\n[WhatsApp] Waiting for authentication...\n');
        }
      } else {
        // No Discord client, show in terminal
        console.log('\n[WhatsApp] Scan this QR code with your phone:\n');
        QRCode.generate(qr, { small: true });
        console.log('\n[WhatsApp] Waiting for authentication...\n');
      }
    }

    // Handle connection status
    if (connection === 'close') {
      qrGenerated = false;
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      log.info('[WhatsApp] Connection closed', {
        shouldReconnect,
        error: lastDisconnect?.error?.message
      });

      if (shouldReconnect) {
        log.info('[WhatsApp] Reconnecting...');
        await connectToWhatsApp(authPath);
      }
    } else if (connection === 'open') {
      qrGenerated = false;
      log.info('[WhatsApp] Connected successfully');
      console.log('✓ WhatsApp authenticated and ready');

      // Notify Discord
      if (discordClient) {
        await sendWhatsAppStatusToDiscord(discordClient, 'connected').catch(() => {});
      }
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return; // Only process new messages

    for (const message of messages) {
      await handleMessage(message);
    }
  });
}

/**
 * Handle incoming WhatsApp message
 */
async function handleMessage(message: proto.IWebMessageInfo) {
  try {
    // Ignore messages from self
    if (!message.key || message.key.fromMe) return;

    // Get sender info
    const remoteJid = message.key.remoteJid;
    if (!remoteJid) return;

    // Extract message text
    const messageText = extractMessageText(message);
    if (!messageText) return;

    const userId = `whatsapp_${remoteJid.replace('@s.whatsapp.net', '')}`;

    log.info('[WhatsApp] Message received', {
      userId,
      preview: messageText.substring(0, 50)
    });

    // Get conversation history
    const history = await sessionManager.getHistory(userId);

    // Detect if needs agent mode (tools)
    const useAgent = needsAgent(messageText);

    // Show typing indicator
    if (sock) {
      await sock.sendPresenceUpdate('composing', remoteJid);
    }

    let response: string;
    if (useAgent) {
      log.info('[WhatsApp] Using AGENT mode');
      response = await runAgent({
        userId,
        userMessage: messageText,
        history
      });
    } else {
      response = await chat({
        userId,
        userMessage: messageText,
        history
      });
    }

    // Save to session
    await sessionManager.addMessage(userId, { role: 'user', content: messageText });
    await sessionManager.addMessage(userId, { role: 'assistant', content: response });

    // Send response
    await sendMessage(remoteJid, response);

  } catch (error: any) {
    log.error('[WhatsApp] Error handling message', { error: error.message });
  }
}

/**
 * Extract text from WhatsApp message
 */
function extractMessageText(message: proto.IWebMessageInfo): string | null {
  const msg = message.message;
  if (!msg) return null;

  // Text message
  if (msg.conversation) {
    return msg.conversation;
  }

  // Extended text message
  if (msg.extendedTextMessage?.text) {
    return msg.extendedTextMessage.text;
  }

  // Image with caption
  if (msg.imageMessage?.caption) {
    return msg.imageMessage.caption;
  }

  // Video with caption
  if (msg.videoMessage?.caption) {
    return msg.videoMessage.caption;
  }

  return null;
}

/**
 * Detect if message needs agent mode (execution)
 */
function needsAgent(text: string): boolean {
  const agentKeywords = [
    // Development
    'sobe', 'subir', 'criar', 'instala', 'deploy', 'roda', 'executa',
    'create', 'install', 'run', 'execute', 'start', 'setup',
    // System commands
    'status do sistema', 'system status', 'processos', 'processes',
    // File operations
    'lê arquivo', 'read file', 'lista arquivos', 'list files',
    // Scheduling
    'lembra', 'reminder', 'agendar', 'schedule'
  ];

  const lowerText = text.toLowerCase();
  return agentKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Send message to WhatsApp number
 */
async function sendMessage(jid: string, text: string): Promise<void> {
  if (!sock) {
    throw new Error('WhatsApp socket not connected');
  }

  try {
    // Split long messages (WhatsApp limit ~4096 chars)
    const maxLength = 4000;
    if (text.length <= maxLength) {
      await sock.sendMessage(jid, { text });
    } else {
      // Split into chunks
      const chunks = text.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [];
      for (const chunk of chunks) {
        await sock.sendMessage(jid, { text: chunk });
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    log.info('[WhatsApp] Message sent', { to: jid.substring(0, 10) });
  } catch (error: any) {
    log.error('[WhatsApp] Failed to send message', { error: error.message });
    throw error;
  }
}

/**
 * Send message with typing indicator
 */
export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  if (!sock) {
    log.error('[WhatsApp] Socket not connected');
    return false;
  }

  try {
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    // Send typing indicator
    await sock.sendPresenceUpdate('composing', jid);

    // Send message
    await sendMessage(jid, message);

    // Stop typing
    await sock.sendPresenceUpdate('paused', jid);

    return true;
  } catch (error: any) {
    log.error('[WhatsApp] Failed to send message', { error: error.message });
    return false;
  }
}

/**
 * Check if WhatsApp is connected
 */
export function isWhatsAppConnected(): boolean {
  return sock !== null && sock.user !== undefined;
}

/**
 * Get WhatsApp connection info
 */
export function getWhatsAppInfo(): { connected: boolean; number?: string } {
  if (!sock || !sock.user) {
    return { connected: false };
  }

  return {
    connected: true,
    number: sock.user.id.split(':')[0]
  };
}
