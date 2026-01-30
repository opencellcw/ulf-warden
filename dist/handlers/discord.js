"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDiscordHandler = startDiscordHandler;
const discord_js_1 = require("discord.js");
const chat_1 = require("../chat");
const sessions_1 = require("../sessions");
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
            const response = await (0, chat_1.chat)({
                userId,
                userMessage: text,
                history,
            });
            await sessions_1.sessionManager.addMessage(userId, { role: 'user', content: text });
            await sessions_1.sessionManager.addMessage(userId, { role: 'assistant', content: response });
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
        catch (error) {
            console.error('[Discord] Error handling message:', error);
            await message.reply('Desculpa, tive um problema. Tenta de novo?');
        }
    });
    await client.login(process.env.DISCORD_BOT_TOKEN);
    return client;
}
