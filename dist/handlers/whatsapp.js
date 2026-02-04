"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setWhatsAppDiscordClient = setWhatsAppDiscordClient;
exports.startWhatsAppHandler = startWhatsAppHandler;
exports.sendWhatsAppMessage = sendWhatsAppMessage;
exports.isWhatsAppConnected = isWhatsAppConnected;
exports.getWhatsAppInfo = getWhatsAppInfo;
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const chat_1 = require("../chat");
const agent_1 = require("../agent");
const sessions_1 = require("../sessions");
const logger_1 = require("../logger");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const path_1 = __importDefault(require("path"));
const whatsapp_qr_1 = require("./whatsapp-qr");
let sock = null;
let qrGenerated = false;
let discordClient = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
/**
 * Set Discord client for QR code notifications
 */
function setWhatsAppDiscordClient(client) {
    discordClient = client;
    logger_1.log.info('[WhatsApp] Discord client set for QR notifications');
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
async function startWhatsAppHandler() {
    if (!process.env.WHATSAPP_ENABLED || process.env.WHATSAPP_ENABLED !== 'true') {
        console.log('[WhatsApp] Not enabled, skipping WhatsApp handler');
        return null;
    }
    console.log('[WhatsApp] Starting WhatsApp handler...');
    const authPath = process.env.WHATSAPP_AUTH_PATH || path_1.default.join(process.cwd(), 'data', 'whatsapp-auth');
    try {
        await connectToWhatsApp(authPath);
        console.log('✓ WhatsApp handler started');
        return sock;
    }
    catch (error) {
        console.error('[WhatsApp] Failed to start:', error);
        throw error;
    }
}
async function connectToWhatsApp(authPath) {
    const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(authPath);
    // Create logger with all required methods
    const logger = {
        level: 'silent',
        fatal: () => { },
        error: () => { },
        warn: () => { },
        info: () => { },
        debug: () => { },
        trace: () => { },
        child: () => logger // Return self for child logger
    };
    sock = (0, baileys_1.default)({
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
            logger_1.log.info('[WhatsApp] QR Code generated');
            // Try to send via Discord first
            if (discordClient) {
                try {
                    await (0, whatsapp_qr_1.sendQRCodeToDiscord)(qr, discordClient);
                    logger_1.log.info('[WhatsApp] QR Code sent to Discord');
                }
                catch (error) {
                    logger_1.log.error('[WhatsApp] Failed to send QR to Discord', { error: error.message });
                    // Fallback: show in terminal
                    console.log('\n[WhatsApp] Scan this QR code with your phone:\n');
                    qrcode_terminal_1.default.generate(qr, { small: true });
                    console.log('\n[WhatsApp] Waiting for authentication...\n');
                }
            }
            else {
                // No Discord client, show in terminal
                console.log('\n[WhatsApp] Scan this QR code with your phone:\n');
                qrcode_terminal_1.default.generate(qr, { small: true });
                console.log('\n[WhatsApp] Waiting for authentication...\n');
            }
        }
        // Handle connection status
        if (connection === 'close') {
            qrGenerated = false;
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== baileys_1.DisconnectReason.loggedOut;
            logger_1.log.info('[WhatsApp] Connection closed', {
                shouldReconnect,
                error: lastDisconnect?.error?.message,
                attempts: reconnectAttempts
            });
            if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                logger_1.log.info('[WhatsApp] Reconnecting...', { attempt: reconnectAttempts, max: MAX_RECONNECT_ATTEMPTS });
                await connectToWhatsApp(authPath);
            }
            else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                logger_1.log.warn('[WhatsApp] Max reconnection attempts reached. Stopping auto-reconnect.');
                console.log('[WhatsApp] ⚠️  Max reconnection attempts reached. Use command to reconnect manually.');
            }
        }
        else if (connection === 'open') {
            qrGenerated = false;
            reconnectAttempts = 0; // Reset counter on successful connection
            logger_1.log.info('[WhatsApp] Connected successfully');
            console.log('✓ WhatsApp authenticated and ready');
            // Notify Discord
            if (discordClient) {
                await (0, whatsapp_qr_1.sendWhatsAppStatusToDiscord)(discordClient, 'connected').catch(() => { });
            }
        }
    });
    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify')
            return; // Only process new messages
        for (const message of messages) {
            await handleMessage(message);
        }
    });
}
/**
 * Handle incoming WhatsApp message
 */
async function handleMessage(message) {
    try {
        // Ignore messages from self
        if (!message.key || message.key.fromMe)
            return;
        // Get sender info
        const remoteJid = message.key.remoteJid;
        if (!remoteJid)
            return;
        // Extract message text
        const messageText = extractMessageText(message);
        if (!messageText)
            return;
        const userId = `whatsapp_${remoteJid.replace('@s.whatsapp.net', '')}`;
        logger_1.log.info('[WhatsApp] Message received', {
            userId,
            preview: messageText.substring(0, 50)
        });
        // Get conversation history
        const history = await sessions_1.sessionManager.getHistory(userId);
        // Detect if needs agent mode (tools)
        const useAgent = needsAgent(messageText);
        // Show typing indicator
        if (sock) {
            await sock.sendPresenceUpdate('composing', remoteJid);
        }
        let response;
        if (useAgent) {
            logger_1.log.info('[WhatsApp] Using AGENT mode');
            response = await (0, agent_1.runAgent)({
                userId,
                userMessage: messageText,
                history
            });
        }
        else {
            response = await (0, chat_1.chat)({
                userId,
                userMessage: messageText,
                history
            });
        }
        // Save to session
        await sessions_1.sessionManager.addMessage(userId, { role: 'user', content: messageText });
        await sessions_1.sessionManager.addMessage(userId, { role: 'assistant', content: response });
        // Send response
        await sendMessage(remoteJid, response);
    }
    catch (error) {
        logger_1.log.error('[WhatsApp] Error handling message', { error: error.message });
    }
}
/**
 * Extract text from WhatsApp message
 */
function extractMessageText(message) {
    const msg = message.message;
    if (!msg)
        return null;
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
function needsAgent(text) {
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
async function sendMessage(jid, text) {
    if (!sock) {
        throw new Error('WhatsApp socket not connected');
    }
    try {
        // Split long messages (WhatsApp limit ~4096 chars)
        const maxLength = 4000;
        if (text.length <= maxLength) {
            await sock.sendMessage(jid, { text });
        }
        else {
            // Split into chunks
            const chunks = text.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [];
            for (const chunk of chunks) {
                await sock.sendMessage(jid, { text: chunk });
                // Small delay between chunks
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        logger_1.log.info('[WhatsApp] Message sent', { to: jid.substring(0, 10) });
    }
    catch (error) {
        logger_1.log.error('[WhatsApp] Failed to send message', { error: error.message });
        throw error;
    }
}
/**
 * Send message with typing indicator
 */
async function sendWhatsAppMessage(to, message) {
    if (!sock) {
        logger_1.log.error('[WhatsApp] Socket not connected');
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
    }
    catch (error) {
        logger_1.log.error('[WhatsApp] Failed to send message', { error: error.message });
        return false;
    }
}
/**
 * Check if WhatsApp is connected
 */
function isWhatsAppConnected() {
    return sock !== null && sock.user !== undefined;
}
/**
 * Get WhatsApp connection info
 */
function getWhatsAppInfo() {
    if (!sock || !sock.user) {
        return { connected: false };
    }
    return {
        connected: true,
        number: sock.user.id.split(':')[0]
    };
}
