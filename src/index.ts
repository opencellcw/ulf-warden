import 'dotenv/config';
import { App } from '@slack/bolt';
import { chat } from './chat.js';
import { sessionManager } from './sessions.js';
import { workspace } from './workspace.js';

// Validate environment variables
const requiredEnvVars = [
  'ANTHROPIC_API_KEY',
  'SLACK_BOT_TOKEN',
  'SLACK_APP_TOKEN',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize Slack app with Socket Mode
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// Handle direct messages and mentions
app.event('message', async ({ event, say }) => {
  try {
    // @ts-ignore - Slack types can be complex
    if (event.subtype || event.bot_id) return;

    // @ts-ignore
    const userId = event.user;
    // @ts-ignore
    const text = event.text;

    if (!text) return;

    console.log(`[Slack] Message from ${userId}: ${text.substring(0, 50)}...`);

    // Get history
    const history = sessionManager.getHistory(userId);

    // Get response from Claude
    const response = await chat({
      userId,
      userMessage: text,
      history,
    });

    // Add messages to session
    sessionManager.addMessage(userId, {
      role: 'user',
      content: text,
    });

    sessionManager.addMessage(userId, {
      role: 'assistant',
      content: response,
    });

    // Reply
    await say(response);
  } catch (error) {
    console.error('[Slack] Error handling message:', error);
    await say('Desculpa, tive um problema ao processar sua mensagem. Tenta de novo?');
  }
});

// Handle app mentions
app.event('app_mention', async ({ event, say }) => {
  try {
    const userId = event.user;
    // Remove mention from text
    const text = event.text.replace(/<@[^>]+>/g, '').trim();

    if (!text) {
      await say('Oi! Como posso ajudar?');
      return;
    }

    console.log(`[Slack] Mention from ${userId}: ${text.substring(0, 50)}...`);

    // Get history
    const history = sessionManager.getHistory(userId);

    // Get response from Claude
    const response = await chat({
      userId,
      userMessage: text,
      history,
    });

    // Add messages to session
    sessionManager.addMessage(userId, {
      role: 'user',
      content: text,
    });

    sessionManager.addMessage(userId, {
      role: 'assistant',
      content: response,
    });

    // Reply
    await say(response);
  } catch (error) {
    console.error('[Slack] Error handling mention:', error);
    await say('Desculpa, tive um problema ao processar sua mensagem. Tenta de novo?');
  }
});

// Start the app
(async () => {
  try {
    await app.start();

    console.log('');
    console.log('='.repeat(50));
    console.log('⚔️  ULFBERHT-WARDEN');
    console.log('='.repeat(50));
    console.log('Status: ONLINE');
    console.log(`Model: claude-sonnet-4-20250514`);
    console.log(`Socket Mode: Enabled`);
    console.log('='.repeat(50));
    console.log('');
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down...');
  await app.stop();
  process.exit(0);
});
