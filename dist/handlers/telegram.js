"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTelegramHandler = startTelegramHandler;
const telegraf_1 = require("telegraf");
const chat_1 = require("../chat");
const sessions_1 = require("../sessions");
async function startTelegramHandler() {
    if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'xxx') {
        console.log('[Telegram] Token not configured, skipping Telegram handler');
        return null;
    }
    const bot = new telegraf_1.Telegraf(process.env.TELEGRAM_BOT_TOKEN);
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
            const history = sessions_1.sessionManager.getHistory(userId);
            const response = await (0, chat_1.chat)({
                userId,
                userMessage: text,
                history,
            });
            sessions_1.sessionManager.addMessage(userId, { role: 'user', content: text });
            sessions_1.sessionManager.addMessage(userId, { role: 'assistant', content: response });
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
        sessions_1.sessionManager.clear(userId);
        await ctx.reply('Histórico limpo. Começando conversa nova.');
    });
    await bot.launch();
    console.log('✓ Telegram handler started');
    // Graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    return bot;
}
