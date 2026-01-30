import 'dotenv/config';
import express from 'express';
import { startSlackHandler } from './handlers/slack';
import { startDiscordHandler } from './handlers/discord';
import { startTelegramHandler } from './handlers/telegram';
import { workspace } from './workspace';
import { persistence } from './persistence';
import { sessionManager } from './sessions';
import { log } from './logger';

// Validate Anthropic API key
if (!process.env.ANTHROPIC_API_KEY) {
  log.error('Missing required environment variable: ANTHROPIC_API_KEY');
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

// Initialize and start all handlers
async function initialize() {
  try {
    log.info('Starting Ulfberht-Warden...');

    // 1. Initialize persistence layer
    log.info('Initializing persistence layer...');
    await persistence.init();

    // 2. Initialize session manager (loads sessions from database)
    log.info('Initializing session manager...');
    await sessionManager.init();

    // 3. Check for incomplete tool executions (crash recovery)
    const incompleteTools = await persistence.getIncompleteToolExecutions();
    if (incompleteTools.length > 0) {
      log.warn(`Found ${incompleteTools.length} incomplete tool executions from previous session`, {
        count: incompleteTools.length
      });
    }

    // 4. Start platform handlers
    log.info('Starting platform handlers...');

    // Start Slack
    handlers.slack = await startSlackHandler();

    // Start Discord
    handlers.discord = await startDiscordHandler();

    // Start Telegram
    handlers.telegram = await startTelegramHandler();

    // Check if at least one handler is running
    const activeHandlers = Object.values(handlers).filter(Boolean).length;

    if (activeHandlers === 0) {
      log.error('No platform tokens configured!');
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

    log.info(`System online with ${activeHandlers} platform(s)`, {
      platforms: {
        slack: !!handlers.slack,
        discord: !!handlers.discord,
        telegram: !!handlers.telegram
      }
    });

    // Start HTTP server after handlers are ready
    app.listen(PORT, () => {
      log.info(`HTTP server listening on port ${PORT}`);
    });
  } catch (error) {
    log.error('Failed to start', { error });
    process.exit(1);
  }
}

// Start initialization
initialize();

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  log.info(`${signal} received, shutting down gracefully...`);

  try {
    // 1. Stop accepting new requests
    log.info('Stopping platform handlers...');

    if (handlers.slack) {
      await handlers.slack.stop();
      log.info('Slack handler stopped');
    }

    if (handlers.discord) {
      handlers.discord.destroy();
      log.info('Discord handler stopped');
    }

    if (handlers.telegram) {
      handlers.telegram.stop();
      log.info('Telegram handler stopped');
    }

    // 2. Flush all sessions to database
    log.info('Flushing sessions to database...');
    await sessionManager.flushAll();

    // 3. Save workspace state
    log.info('Saving workspace state...');
    await workspace.saveState();

    // 4. Close database connections
    log.info('Closing database connections...');
    await persistence.close();

    log.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    log.error('Error during shutdown', { error });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception', { error });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled rejection', { reason, promise });
});
