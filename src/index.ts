import 'dotenv/config';
import express from 'express';
import { startSlackHandler } from './handlers/slack';
import { startDiscordHandler } from './handlers/discord';
import { startTelegramHandler } from './handlers/telegram';
import { workspace } from './workspace';

// HTTP server for Render health check
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    bot: 'ulf',
    platforms: {
      slack: !!handlers.slack,
      discord: !!handlers.discord,
      telegram: !!handlers.telegram,
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

// Validate Anthropic API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ Missing required environment variable: ANTHROPIC_API_KEY');
  process.exit(1);
}

console.log('');
console.log('='.repeat(60));
console.log('⚔️  ULFBERHT-WARDEN');
console.log('='.repeat(60));

// Track active handlers
const handlers: {
  slack?: any;
  discord?: any;
  telegram?: any;
} = {};

// Start all enabled handlers
(async () => {
  try {
    // Start Slack
    handlers.slack = await startSlackHandler();

    // Start Discord
    handlers.discord = await startDiscordHandler();

    // Start Telegram
    handlers.telegram = await startTelegramHandler();

    // Check if at least one handler is running
    const activeHandlers = Object.values(handlers).filter(Boolean).length;

    if (activeHandlers === 0) {
      console.error('❌ No platform tokens configured!');
      console.error('');
      console.error('Configure at least one platform:');
      console.error('  - SLACK_BOT_TOKEN + SLACK_APP_TOKEN');
      console.error('  - DISCORD_BOT_TOKEN');
      console.error('  - TELEGRAM_BOT_TOKEN');
      console.error('');
      process.exit(1);
    }

    console.log('='.repeat(60));
    console.log(`Status: ONLINE (${activeHandlers} platform${activeHandlers > 1 ? 's' : ''})`);
    console.log('Model: claude-sonnet-4-20250514');
    console.log('='.repeat(60));
    console.log('');
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down...');

  if (handlers.slack) {
    await handlers.slack.stop();
  }

  if (handlers.discord) {
    handlers.discord.destroy();
  }

  if (handlers.telegram) {
    handlers.telegram.stop();
  }

  process.exit(0);
});
