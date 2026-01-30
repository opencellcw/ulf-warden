"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTelegramHandler = startTelegramHandler;
const telegraf_1 = require("telegraf");
const chat_1 = require("../chat");
const agent_1 = require("../agent");
const sessions_1 = require("../sessions");
const media_handler_1 = require("../media-handler");
const media_handler_telegram_1 = require("../media-handler-telegram");
const logger_1 = require("../logger");
async function startTelegramHandler() {
    if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'xxx') {
        console.log('[Telegram] Token not configured, skipping Telegram handler');
        return null;
    }
    const bot = new telegraf_1.Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    /**
     * Send response with automatic media handling
     */
    async function sendResponse(ctx, response) {
        // Check if response contains media
        const media = (0, media_handler_1.extractMediaMetadata)(response);
        if (media) {
            logger_1.log.info('[Telegram] Media detected in response', {
                type: media.type,
                hasUrl: !!media.url,
                hasFilePath: !!media.filePath,
                chatId: ctx.chat?.id
            });
            // Clean text (remove URLs/paths)
            const cleanText = (0, media_handler_1.cleanResponseText)(response, media);
            try {
                // Upload media to Telegram
                if (ctx.chat) {
                    await (0, media_handler_telegram_1.uploadMediaToTelegram)(bot, ctx.chat.id, media, cleanText || '✨ Generated content');
                    logger_1.log.info('[Telegram] Media sent successfully');
                }
            }
            catch (error) {
                logger_1.log.error('[Telegram] Upload failed', {
                    error: error.message,
                    stack: error.stack,
                    mediaType: media.type
                });
                // Send error message
                await ctx.reply(`⚠️ Content generated but failed to upload.\n\n**Error:** ${error.message}`);
            }
        }
        else {
            // No media, send normal text response
            // Telegram limit: 4096 chars
            if (response.length <= 4096) {
                await ctx.reply(response);
            }
            else {
                const chunks = response.match(/[\s\S]{1,4096}/g) || [];
                for (const chunk of chunks) {
                    await ctx.reply(chunk);
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
    // Handle text messages
    bot.on('text', async (ctx) => {
        try {
            const userId = `telegram_${ctx.from.id}`;
            const text = ctx.message.text;
            // Ignore if message starts with /start or /help (handle separately if needed)
            if (text.startsWith('/'))
                return;
            console.log(`[Telegram] Message from ${userId}: ${text.substring(0, 50)}...`);
            // Show typing indicator
            await ctx.sendChatAction('typing');
            const history = await sessions_1.sessionManager.getHistory(userId);
            // Choose between agent (with tools) or regular chat
            const useAgent = needsAgent(text);
            let response;
            if (useAgent) {
                console.log(`[Telegram] Using AGENT mode for: ${text.substring(0, 30)}...`);
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
            await sendResponse(ctx, response);
        }
        catch (error) {
            console.error('[Telegram] Error handling message:', error);
            await ctx.reply('Desculpa, tive um problema. Tenta de novo?');
        }
    });
    // Handle /start command
    bot.command('start', async (ctx) => {
        await ctx.reply('Oi! Sou o Ulfberht-Warden. Manda uma mensagem pra começar.');
    });
    // Handle /clear command to reset conversation
    bot.command('clear', async (ctx) => {
        const userId = `telegram_${ctx.from.id}`;
        await sessions_1.sessionManager.clear(userId);
        await ctx.reply('Histórico limpo. Começando conversa nova.');
    });
    await bot.launch();
    console.log('✓ Telegram handler started');
    // Graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    return bot;
}
