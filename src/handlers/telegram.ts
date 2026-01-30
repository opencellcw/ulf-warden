import { Telegraf, Context } from 'telegraf';
import { chat } from '../chat';
import { runAgent } from '../agent';
import { sessionManager } from '../sessions';
import { extractMediaMetadata, cleanResponseText } from '../media-handler';
import { uploadMediaToTelegram } from '../media-handler-telegram';
import { log } from '../logger';

export async function startTelegramHandler() {
  if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'xxx') {
    console.log('[Telegram] Token not configured, skipping Telegram handler');
    return null;
  }

  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  /**
   * Send response with automatic media handling
   */
  async function sendResponse(ctx: Context, response: string): Promise<void> {
    // Check if response contains media
    const media = extractMediaMetadata(response);

    if (media) {
      log.info('[Telegram] Media detected in response', {
        type: media.type,
        hasUrl: !!media.url,
        hasFilePath: !!media.filePath,
        chatId: ctx.chat?.id
      });

      // Clean text (remove URLs/paths)
      const cleanText = cleanResponseText(response, media);

      try {
        // Upload media to Telegram
        if (ctx.chat) {
          await uploadMediaToTelegram(bot, ctx.chat.id, media, cleanText || '✨ Generated content');
          log.info('[Telegram] Media sent successfully');
        }
      } catch (error: any) {
        log.error('[Telegram] Upload failed', {
          error: error.message,
          stack: error.stack,
          mediaType: media.type
        });

        // Send error message
        await ctx.reply(
          `⚠️ Content generated but failed to upload.\n\n**Error:** ${error.message}`
        );
      }
    } else {
      // No media, send normal text response
      // Telegram limit: 4096 chars
      if (response.length <= 4096) {
        await ctx.reply(response);
      } else {
        const chunks = response.match(/[\s\S]{1,4096}/g) || [];
        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      }
    }
  }

  // Detect if message needs agent mode (execution)
  function needsAgent(text: string): boolean {
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
      if (text.startsWith('/')) return;

      console.log(`[Telegram] Message from ${userId}: ${text.substring(0, 50)}...`);

      // Show typing indicator
      await ctx.sendChatAction('typing');

      const history = await sessionManager.getHistory(userId);

      // Choose between agent (with tools) or regular chat
      const useAgent = needsAgent(text);

      let response: string;
      if (useAgent) {
        console.log(`[Telegram] Using AGENT mode for: ${text.substring(0, 30)}...`);
        response = await runAgent({
          userId,
          userMessage: text,
          history,
        });
      } else {
        response = await chat({
          userId,
          userMessage: text,
          history,
        });
      }

      await sessionManager.addMessage(userId, { role: 'user', content: text });
      await sessionManager.addMessage(userId, { role: 'assistant', content: response });

      await sendResponse(ctx, response);
    } catch (error) {
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
    await sessionManager.clear(userId);
    await ctx.reply('Histórico limpo. Começando conversa nova.');
  });

  await bot.launch();
  console.log('✓ Telegram handler started');

  // Graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return bot;
}
