import { App } from '@slack/bolt';
import { chat } from '../chat';
import { runAgent } from '../agent';
import { sessionManager } from '../sessions';
import { extractMediaMetadata, cleanResponseText, uploadMediaToSlack } from '../media-handler';
import { initSlackMessaging } from '../tools/slack-messaging';
import { log } from '../logger';

export async function startSlackHandler() {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN) {
    console.log('[Slack] Tokens not found, skipping Slack handler');
    return null;
  }

  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
  });

  // Initialize Slack messaging for proactive messages
  initSlackMessaging(app);

  /**
   * Send response with automatic media handling
   */
  async function sendResponse(channel: string, response: string, say: any, event?: any): Promise<void> {
    // Check if response contains media
    const media = extractMediaMetadata(response);

    if (media) {
      log.info('[Slack] Media detected in response', {
        type: media.type,
        hasUrl: !!media.url,
        hasFilePath: !!media.filePath,
        channel,
        channelType: event?.channel_type || 'unknown'
      });

      // Validate channel ID
      if (!channel || channel === 'undefined') {
        log.error('[Slack] Invalid channel ID', { channel, event });
        await say(`⚠️ Erro: Canal inválido. Tente mencionar o bot diretamente.`);
        return;
      }

      // Clean text (remove URLs/paths)
      const cleanText = cleanResponseText(response, media);

      try {
        // Upload media to Slack
        await uploadMediaToSlack(app, channel, media, cleanText || '✨ Generated content');
        log.info('[Slack] Media sent successfully');
      } catch (error: any) {
        log.error('[Slack] Upload failed', {
          error: error.message,
          stack: error.stack,
          channel,
          mediaType: media.type
        });

        // Send error message instead of link
        await say(`⚠️ Conteúdo gerado mas não consegui fazer upload.\n\n**Erro:** ${error.message}\n\nVerifique:\n- Bot tem permissão \`files:write\`?\n- Bot está no canal? (convide com \`/invite @ulfberht-warden\`)`);
      }
    } else {
      // No media, send normal text response
      await say(response);
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

  // Handle direct messages
  app.event('message', async ({ event, say }) => {
    try {
      // @ts-ignore
      if (event.subtype || event.bot_id) return;

      // @ts-ignore
      const userId = `slack_${event.user}`;
      // @ts-ignore
      const text = event.text;
      // @ts-ignore
      const channel = event.channel;

      if (!text) return;

      console.log(`[Slack] Message from ${userId}: ${text.substring(0, 50)}...`);

      const history = await sessionManager.getHistory(userId);

      // Choose between agent (with tools) or regular chat
      const useAgent = needsAgent(text);

      let response: string;
      if (useAgent) {
        console.log(`[Slack] Using AGENT mode for: ${text.substring(0, 30)}...`);
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

      await sendResponse(channel, response, say, event);
    } catch (error) {
      console.error('[Slack] Error handling message:', error);
      await say('Desculpa, tive um problema. Tenta de novo?');
    }
  });

  // Handle app mentions
  app.event('app_mention', async ({ event, say }) => {
    try {
      const userId = `slack_${event.user}`;
      const text = event.text.replace(/<@[^>]+>/g, '').trim();
      const channel = event.channel;

      if (!text) {
        await say('Oi! Como posso ajudar?');
        return;
      }

      console.log(`[Slack] Mention from ${userId}: ${text.substring(0, 50)}...`);

      const history = await sessionManager.getHistory(userId);

      // Choose between agent (with tools) or regular chat
      const useAgent = needsAgent(text);

      let response: string;
      if (useAgent) {
        console.log(`[Slack] Using AGENT mode for: ${text.substring(0, 30)}...`);
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

      await sendResponse(channel, response, say, event);
    } catch (error) {
      console.error('[Slack] Error handling mention:', error);
      await say('Desculpa, tive um problema. Tenta de novo?');
    }
  });

  await app.start();
  console.log('✓ Slack handler started');

  return app;
}
