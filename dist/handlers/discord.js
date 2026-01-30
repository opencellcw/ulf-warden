"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDiscordHandler = startDiscordHandler;
const discord_js_1 = require("discord.js");
const chat_1 = require("../chat");
const agent_1 = require("../agent");
const sessions_1 = require("../sessions");
const media_handler_1 = require("../media-handler");
const media_handler_discord_1 = require("../media-handler-discord");
const logger_1 = require("../logger");
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
    // Detect if message needs agent mode (execution)
    function needsAgent(text) {
        const agentKeywords = [
            // Development
            'sobe', 'subir', 'criar', 'instala', 'deploy', 'roda', 'executa',
            'create', 'install', 'run', 'execute', 'start', 'setup',
            'api', 'servidor', 'server', 'app', 'service',
            // Multimodal
            'gera', 'gerar', 'cria', 'criar', 'generate', 'create',
            'imagem', 'image', 'foto', 'photo', 'picture',
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
            let text = message.content;
            // Remove mention from text
            if (isMentioned) {
                text = text.replace(/<@!?\d+>/g, '').trim();
            }
            if (!text) {
                await message.reply('Oi! Como posso ajudar?');
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
