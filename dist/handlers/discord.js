"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDiscordHandler = startDiscordHandler;
const discord_js_1 = require("discord.js");
const chat_1 = require("../chat");
const agent_1 = require("../agent");
const sessions_1 = require("../sessions");
const media_handler_1 = require("../media-handler");
const media_handler_discord_1 = require("../media-handler-discord");
const logger_1 = require("../logger");
const approval_system_1 = require("../approval-system");
const discord_handler_1 = require("../bot-factory/discord-handler");
const rate_limiter_1 = require("../security/rate-limiter");
const axios_1 = __importDefault(require("axios"));
async function startDiscordHandler() {
    if (!process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN === 'xxx') {
        console.log('[Discord] Token not configured, skipping Discord handler');
        return null;
    }
    const client = new discord_js_1.Client({
        intents: [
            discord_js_1.GatewayIntentBits.Guilds,
            discord_js_1.GatewayIntentBits.GuildMessages,
            discord_js_1.GatewayIntentBits.DirectMessages,
            discord_js_1.GatewayIntentBits.MessageContent,
        ],
    });
    /**
     * Send response with automatic media handling
     */
    async function sendResponse(message, response) {
        // Check if response contains media
        const media = (0, media_handler_1.extractMediaMetadata)(response);
        if (media) {
            logger_1.log.info('[Discord] Media detected in response', {
                type: media.type,
                hasUrl: !!media.url,
                hasFilePath: !!media.filePath
            });
            // Clean text (remove URLs/paths)
            const cleanText = (0, media_handler_1.cleanResponseText)(response, media);
            try {
                // Upload media to Discord
                await (0, media_handler_discord_1.uploadMediaToDiscord)(message, media, cleanText || '✨ Generated content');
                logger_1.log.info('[Discord] Media sent successfully');
            }
            catch (error) {
                logger_1.log.error('[Discord] Upload failed', {
                    error: error.message,
                    stack: error.stack,
                    mediaType: media.type
                });
                // Send error message
                await message.reply(`⚠️ Content generated but failed to upload.\n\n**Error:** ${error.message}`);
            }
        }
        else {
            // No media, send normal text response
            // Split long messages (Discord limit: 2000 chars)
            if (response.length <= 2000) {
                await message.reply(response);
            }
            else {
                const chunks = response.match(/[\s\S]{1,2000}/g) || [];
                for (const chunk of chunks) {
                    if ('send' in message.channel) {
                        await message.channel.send(chunk);
                    }
                }
            }
        }
    }
    /**
     * Process attachments in message (download text files)
     */
    async function processAttachments(message) {
        if (message.attachments.size === 0)
            return '';
        const textParts = [];
        for (const [, attachment] of message.attachments) {
            // Only process text files (txt, md, json, etc)
            const textExtensions = ['.txt', '.md', '.json', '.csv', '.log', '.yaml', '.yml', '.xml', '.html'];
            const isTextFile = textExtensions.some(ext => attachment.name?.toLowerCase().endsWith(ext));
            if (!isTextFile) {
                logger_1.log.info('[Discord] Skipping non-text attachment', { name: attachment.name });
                continue;
            }
            // Check file size (max 1MB for text files)
            if (attachment.size > 1024 * 1024) {
                logger_1.log.warn('[Discord] Text file too large', { name: attachment.name, size: attachment.size });
                textParts.push(`⚠️ Arquivo ${attachment.name} muito grande (${(attachment.size / 1024).toFixed(2)}KB > 1MB)`);
                continue;
            }
            try {
                logger_1.log.info('[Discord] Downloading attachment', { name: attachment.name, size: attachment.size });
                // Download file content
                const response = await axios_1.default.get(attachment.url, {
                    responseType: 'text',
                    timeout: 10000
                });
                const content = response.data;
                textParts.push(`\n\n--- Conteúdo do arquivo: ${attachment.name} ---\n${content}\n--- Fim do arquivo ---\n`);
                logger_1.log.info('[Discord] Attachment processed', { name: attachment.name, contentLength: content.length });
            }
            catch (error) {
                logger_1.log.error('[Discord] Failed to download attachment', {
                    name: attachment.name,
                    error: error.message
                });
                textParts.push(`⚠️ Erro ao ler ${attachment.name}: ${error.message}`);
            }
        }
        return textParts.join('\n');
    }
    // Detect if message needs agent mode (execution)
    function needsAgent(text) {
        const agentKeywords = [
            // Development
            'sobe', 'subir', 'criar', 'instala', 'deploy', 'roda', 'executa',
            'create', 'install', 'run', 'execute', 'start', 'setup',
            'api', 'servidor', 'server', 'app', 'service',
            // Bot Factory
            'criar bot', 'create bot', 'novo bot', 'new bot',
            'listar bots', 'list bots', 'delete bot', 'deletar bot',
            'bot status', 'status do bot',
            // Multimodal
            'gera', 'gerar', 'cria', 'criar', 'generate', 'create',
            'faz', 'fazer', 'faça', 'make', 'draw', 'desenha', 'desenhar',
            'imagem', 'image', 'img', 'foto', 'photo', 'picture', 'pic',
            'video', 'vídeo', 'animate', 'anima',
            'audio', 'áudio', 'som', 'sound', 'voz', 'voice',
            'converte', 'convert', 'transcreve', 'transcribe',
            'analisa', 'analyze', 'descreve', 'describe',
            'remove fundo', 'remove background', 'upscale',
            // Scheduling
            'lembra', 'lembrar', 'reminder', 'remind',
            'agendar', 'agenda', 'schedule',
            'me avisa', 'avisa', 'notify', 'alert',
            'lista tasks', 'list tasks', 'scheduled',
            'cancela task', 'cancel task'
        ];
        const lowerText = text.toLowerCase();
        return agentKeywords.some(keyword => lowerText.includes(keyword));
    }
    client.on('ready', () => {
        console.log(`✓ Discord handler started (${client.user?.tag})`);
        // Initialize approval system
        approval_system_1.approvalSystem.setClient(client);
        logger_1.log.info('[Discord] Approval system initialized');
    });
    client.on('messageCreate', async (message) => {
        try {
            // Ignore bot messages
            if (message.author.bot)
                return;
            // Respond to DMs or mentions
            const isDM = message.channel.isDMBased();
            const isMentioned = message.mentions.has(client.user);
            if (!isDM && !isMentioned)
                return;
            const userId = `discord_${message.author.id}`;
            // Rate limiting check
            const rateLimiter = (0, rate_limiter_1.getNormalRateLimiter)();
            const rateLimitCheck = await rateLimiter.checkLimit(userId);
            if (!rateLimitCheck.allowed) {
                await message.reply(`⏱️ ${rateLimitCheck.reason}\n` +
                    `Aguarde ${rateLimitCheck.retryAfter} segundos antes de enviar outra mensagem.`);
                return;
            }
            let text = message.content;
            // Remove mention from text
            if (isMentioned) {
                text = text.replace(/<@!?\d+>/g, '').trim();
            }
            // Process attachments (text files)
            const attachmentContent = await processAttachments(message);
            if (attachmentContent) {
                text = text ? `${text}\n${attachmentContent}` : attachmentContent;
            }
            if (!text) {
                await message.reply('Oi! Como posso ajudar?');
                return;
            }
            // Handle special commands
            if (text.startsWith('/propose-improvement')) {
                // Example: /propose-improvement title: "Fix bug" | description: "..." | files: src/test.ts
                await message.reply('🔧 Sistema de self-improvement detectado. Use `propor melhoria em X` para propostas automáticas.');
                return;
            }
            // Handle bot creation commands
            if (text.match(/criar bot|create bot|novo bot|new bot/i)) {
                await (0, discord_handler_1.handleBotCreation)(message);
                return;
            }
            console.log(`[Discord] Message from ${userId}: ${text.substring(0, 50)}...`);
            // Show typing indicator
            if ('sendTyping' in message.channel) {
                await message.channel.sendTyping();
            }
            const history = await sessions_1.sessionManager.getHistory(userId);
            // Choose between agent (with tools) or regular chat
            const useAgent = needsAgent(text);
            let response;
            if (useAgent) {
                console.log(`[Discord] Using AGENT mode for: ${text.substring(0, 30)}...`);
                response = await (0, agent_1.runAgent)({
                    userId,
                    userMessage: text,
                    history,
                });
            }
            else {
                response = await (0, chat_1.chat)({
                    userId,
                    userMessage: text,
                    history,
                });
            }
            await sessions_1.sessionManager.addMessage(userId, { role: 'user', content: text });
            await sessions_1.sessionManager.addMessage(userId, { role: 'assistant', content: response });
            await sendResponse(message, response);
        }
        catch (error) {
            console.error('[Discord] Error handling message:', error);
            await message.reply('Desculpa, tive um problema. Tenta de novo?');
        }
    });
    await client.login(process.env.DISCORD_BOT_TOKEN);
    return client;
}
