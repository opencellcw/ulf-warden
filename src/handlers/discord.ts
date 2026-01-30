import { Client, GatewayIntentBits, Message } from 'discord.js';
import { chat } from '../chat';
import { sessionManager } from '../sessions';

export async function startDiscordHandler() {
  if (!process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN === 'xxx') {
    console.log('[Discord] Token not configured, skipping Discord handler');
    return null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on('ready', () => {
    console.log(`✓ Discord handler started (${client.user?.tag})`);
  });

  client.on('messageCreate', async (message: Message) => {
    try {
      // Ignore bot messages
      if (message.author.bot) return;

      // Respond to DMs or mentions
      const isDM = message.channel.isDMBased();
      const isMentioned = message.mentions.has(client.user!);

      if (!isDM && !isMentioned) return;

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

      const history = sessionManager.getHistory(userId);

      const response = await chat({
        userId,
        userMessage: text,
        history,
      });

      sessionManager.addMessage(userId, { role: 'user', content: text });
      sessionManager.addMessage(userId, { role: 'assistant', content: response });

      // Split long messages (Discord limit: 2000 chars)
      if (response.length <= 2000) {
        await message.reply(response);
      } else {
        const chunks = response.match(/[\s\S]{1,2000}/g) || [];
        for (const chunk of chunks) {
          if ('send' in message.channel) {
            await message.channel.send(chunk);
          }
        }
      }
    } catch (error) {
      console.error('[Discord] Error handling message:', error);
      await message.reply('Desculpa, tive um problema. Tenta de novo?');
    }
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);

  return client;
}
