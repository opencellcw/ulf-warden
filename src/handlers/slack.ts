import { App } from '@slack/bolt';
import { chat } from '../chat';
import { runAgent } from '../agent';
import { sessionManager } from '../sessions';

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

  // Detect if message needs agent mode (execution)
  function needsAgent(text: string): boolean {
    const agentKeywords = [
      'sobe', 'subir', 'criar', 'instala', 'deploy', 'roda', 'executa',
      'create', 'install', 'run', 'execute', 'start', 'setup',
      'api', 'servidor', 'server', 'app', 'service'
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

      if (!text) return;

      console.log(`[Slack] Message from ${userId}: ${text.substring(0, 50)}...`);

      const history = sessionManager.getHistory(userId);

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

      sessionManager.addMessage(userId, { role: 'user', content: text });
      sessionManager.addMessage(userId, { role: 'assistant', content: response });

      await say(response);
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

      if (!text) {
        await say('Oi! Como posso ajudar?');
        return;
      }

      console.log(`[Slack] Mention from ${userId}: ${text.substring(0, 50)}...`);

      const history = sessionManager.getHistory(userId);

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

      sessionManager.addMessage(userId, { role: 'user', content: text });
      sessionManager.addMessage(userId, { role: 'assistant', content: response });

      await say(response);
    } catch (error) {
      console.error('[Slack] Error handling mention:', error);
      await say('Desculpa, tive um problema. Tenta de novo?');
    }
  });

  await app.start();
  console.log('✓ Slack handler started');

  return app;
}
