import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { startSlackHandler } from './handlers/slack';
import { startDiscordHandler } from './handlers/discord';
import { startTelegramHandler } from './handlers/telegram';
import { startWhatsAppHandler, setWhatsAppDiscordClient } from './handlers/whatsapp';
import { workspace } from './workspace';
import { persistence } from './persistence';
import { sessionManager } from './sessions';
import { log } from './logger';
import { getHeartbeatManager } from './heartbeat/heartbeat-manager';
import { getCronManager } from './scheduler/cron-manager';
import { initializeBlocklist } from './config/blocked-tools';
import { initializeToolExecutor } from './security/tool-executor';
import { featureFlags, Feature } from './core/feature-flags';
import { toolRegistry } from './core/tool-registry';
import { prometheusMetrics } from './core/prometheus-metrics';
import { cache } from './core/cache';
import { getToolRateLimiter } from './security/rate-limit-instance';
import { queueService } from './core/queue-types';
import { telemetry } from './core/telemetry';
import { initializeMigrations } from './core/migrations';
import path from 'path';

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
  whatsapp?: any;
} = {};

// HTTP server for Render health check
const app = express();
const PORT = process.env.PORT || 3000;

// Prometheus metrics middleware (collect HTTP metrics)
app.use(prometheusMetrics.httpMiddleware());

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    bot: 'ulf',
    platforms: {
      slack: !!handlers.slack,
      discord: !!handlers.discord,
      telegram: !!handlers.telegram,
      whatsapp: !!handlers.whatsapp,
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Prometheus metrics endpoint
app.get('/metrics', prometheusMetrics.metricsHandler());

// Initialize and start all handlers
async function initialize() {
  try {
    log.info('Starting Ulfberht-Warden...');

    // 0. Initialize security layers (OpenClaw-Security inspired)
    log.info('Initializing security layers...');
    initializeBlocklist();
    initializeToolExecutor();

    // 1. Initialize persistence layer
    log.info('Initializing persistence layer...');
    await persistence.init();

    // 1.2. Run database migrations (if enabled)
    if (process.env.AUTO_MIGRATE !== 'false') {
      try {
        log.info('Checking for pending migrations...');

        const migrationManager = await initializeMigrations({
          client: 'better-sqlite3',
          connection: process.env.DATABASE_PATH || './data/ulf.db',
          useNullAsDefault: true,
          migrations: {
            directory: 'migrations',
            tableName: 'knex_migrations'
          }
        });

        const status = await migrationManager.status();

        if (status.pending.length > 0) {
          log.info('Running pending migrations', {
            count: status.pending.length,
            migrations: status.pending
          });

          const [batch, applied] = await migrationManager.migrate();

          log.info('Migrations completed', {
            batch,
            applied: applied.length,
            migrations: applied
          });
        } else {
          log.info('Database schema up to date');
        }
      } catch (error) {
        log.error('Migration failed', {
          error: error instanceof Error ? error.message : String(error)
        });
        // Don't exit - continue with existing schema
        log.warn('Continuing with existing database schema');
      }
    } else {
      log.info('Auto-migration disabled (set AUTO_MIGRATE=false to disable)');
    }

    // 1.3. Initialize cache system
    log.info('Initializing cache system...');
    const cacheStats = cache.getStats();
    log.info('Cache system initialized', {
      provider: cacheStats.provider,
      redisConnected: cacheStats.redisConnected,
      memoryEnabled: true
    });

    // 1.4. Initialize rate limiter
    log.info('Initializing rate limiter...');
    const rateLimiter = getToolRateLimiter();
    log.info('Rate limiter initialized', {
      defaultLimit: '200/hour',
      adminMultiplier: '5x',
      tieredLimits: 'AI:10/h, Web:20/h, API:60/h, File:120/h, Shell:100/h'
    });

    // 1.5. Initialize feature flags (Phase 1)
    log.info('Initializing feature flags...');
    await featureFlags.init(persistence.getDatabaseManager());

    // 1.6. Initialize Queue System (Background jobs)
    if (process.env.QUEUE_ENABLED !== 'false') {
      try {
        log.info('Initializing queue system...');
        await queueService.initialize();
        log.info('Queue system initialized', {
          queues: 9,
          workers: 'active',
          redis: process.env.REDIS_URL ? 'connected' : 'localhost'
        });
      } catch (error) {
        log.warn('Queue system initialization failed (Redis may not be available)', {
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue without queue system
      }
    }

    // 1.7. Initialize Telemetry (Phase 3)
    if (telemetry.isEnabled()) {
      log.info('Telemetry system active', {
        piiScrubbing: '8 patterns',
        costTracking: 'enabled',
        tracing: 'basic'
      });
    } else {
      log.info('Telemetry disabled (set TELEMETRY_ENABLED=true to enable)');
    }

    // 1.8. Initialize Tool Registry (Phase 2)
    log.info('Initializing Tool Registry...');
    await featureFlags.enable(Feature.TOOL_REGISTRY);
    await featureFlags.enable(Feature.WORKFLOW_MANAGER);

    const toolsRegistryPath = path.join(__dirname, 'tools', 'registry');
    try {
      await toolRegistry.autoDiscover(toolsRegistryPath);
      const stats = toolRegistry.getStats();
      log.info('Tool Registry initialized', {
        totalTools: stats.totalTools,
        enabledTools: stats.enabledTools,
        byCategory: stats.byCategory,
        byRiskLevel: stats.byRiskLevel
      });
    } catch (error) {
      log.warn('Tool Registry auto-discovery failed (directory may not exist yet)', {
        path: toolsRegistryPath,
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue without registry tools - will fall back to legacy executor
    }

    // 2. Initialize session manager (loads sessions from database)
    log.info('Initializing session manager...');
    await sessionManager.init();

    // Start auto-flush (every 60s) and garbage collection (every 1h, max 24h age)
    sessionManager.startAutoFlush(60000); // 60s
    sessionManager.startGarbageCollection(3600000, 24); // 1h interval, 24h max age
    log.info('Session auto-flush and garbage collection started');

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
    try {
      handlers.slack = await startSlackHandler();
    } catch (error) {
      log.warn('Slack handler not started', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue without Slack
    }

    // Start Discord
    try {
      handlers.discord = await startDiscordHandler();
    } catch (error) {
      log.warn('Discord handler not started', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue without Discord
    }

    // Start Telegram
    try {
      handlers.telegram = await startTelegramHandler();
    } catch (error) {
      log.warn('Telegram handler not started', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue without Telegram
    }

    // Start WhatsApp (AFTER Discord so we can send QR there)
    try {
      // Set Discord client for QR code notifications
      if (handlers.discord) {
        setWhatsAppDiscordClient(handlers.discord);
      }

      handlers.whatsapp = await startWhatsAppHandler();
    } catch (error) {
      log.warn('WhatsApp handler not started', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue without WhatsApp
    }

    // Check if at least one handler is running
    const activeHandlers = Object.values(handlers).filter(Boolean).length;

    if (activeHandlers === 0) {
      log.error('No platform tokens configured!');
      console.error('');
      console.error('Configure at least one platform:');
      console.error('  - SLACK_BOT_TOKEN + SLACK_APP_TOKEN');
      console.error('  - DISCORD_BOT_TOKEN');
      console.error('  - TELEGRAM_BOT_TOKEN');
      console.error('  - WHATSAPP_ENABLED=true (scan QR code on first run)');
      console.error('');
      process.exit(1);
    }

    // 5. Initialize heartbeat system (if enabled)
    if (process.env.HEARTBEAT_ENABLED === 'true' && handlers.slack) {
      log.info('Initializing heartbeat system...');

      const claude = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });

      const heartbeat = getHeartbeatManager(
        handlers.slack,
        claude,
        workspace,
        {
          enabled: true,
          intervalMinutes: parseInt(process.env.HEARTBEAT_INTERVAL_MINUTES || '30'),
          slackChannel: process.env.HEARTBEAT_CHANNEL || 'ulf-heartbeat'
        }
      );

      heartbeat.start();
      log.info('Heartbeat system started');
    }

    // 6. Initialize cron scheduler and load jobs
    log.info('Initializing cron scheduler...');
    const cronManager = getCronManager();
    await cronManager.loadJobs();
    log.info('Cron scheduler initialized');

    console.log('='.repeat(60));
    console.log(`Status: ONLINE (${activeHandlers} platform${activeHandlers > 1 ? 's' : ''})`);
    console.log('Model: claude-sonnet-4-20250514');

    // Show Tool Registry stats
    const registryStats = toolRegistry.getStats();
    if (registryStats.totalTools > 0) {
      console.log(`Tools: ${registryStats.enabledTools}/${registryStats.totalTools} enabled (Registry)`);
    }

    console.log('='.repeat(60));
    console.log('');

    log.info(`System online with ${activeHandlers} platform(s)`, {
      platforms: {
        slack: !!handlers.slack,
        discord: !!handlers.discord,
        telegram: !!handlers.telegram,
        whatsapp: !!handlers.whatsapp
      },
      toolRegistry: {
        enabled: featureFlags.isEnabled(Feature.TOOL_REGISTRY),
        totalTools: registryStats.totalTools,
        enabledTools: registryStats.enabledTools
      },
      workflowManager: {
        enabled: featureFlags.isEnabled(Feature.WORKFLOW_MANAGER)
      }
    });

    // Start HTTP server after handlers are ready
    app.listen(PORT, () => {
      log.info(`HTTP server listening on port ${PORT}`);
    });
  } catch (error) {
    log.error('Failed to start', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('Startup error:', error);
    process.exit(1);
  }
}

// Start initialization
initialize();

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  log.info(`${signal} received, shutting down gracefully...`);

  try {
    // 1. Stop heartbeat system
    try {
      const heartbeat = getHeartbeatManager();
      heartbeat.stop();
      log.info('Heartbeat system stopped');
    } catch {
      // Heartbeat not initialized, skip
    }

    // 2. Stop cron scheduler
    try {
      const cronManager = getCronManager();
      cronManager.shutdown();
      log.info('Cron scheduler stopped');
    } catch {
      // Cron manager not initialized, skip
    }

    // 3. Stop accepting new requests
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

    if (handlers.whatsapp) {
      // WhatsApp cleanup (socket will close automatically)
      log.info('WhatsApp handler stopped');
    }

    // 4. Shutdown session manager (stops timers + flushes all)
    log.info('Shutting down session manager...');
    await sessionManager.shutdown();

    // 5. Save workspace state
    log.info('Saving workspace state...');
    await workspace.saveState();

    // 6. Close queue system
    try {
      log.info('Closing queue system...');
      await queueService.shutdown();
    } catch {
      // Queue system may not be initialized
    }

    // 7. Close cache connections
    log.info('Closing cache connections...');
    await cache.close();

    // 8. Shutdown telemetry
    if (telemetry.isEnabled()) {
      log.info('Shutting down telemetry...');
      await telemetry.shutdown();
    }

    // 9. Close database connections
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
