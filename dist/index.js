"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const slack_1 = require("./handlers/slack");
const discord_1 = require("./handlers/discord");
const telegram_1 = require("./handlers/telegram");
const workspace_1 = require("./workspace");
const persistence_1 = require("./persistence");
const sessions_1 = require("./sessions");
const logger_1 = require("./logger");
const heartbeat_manager_1 = require("./heartbeat/heartbeat-manager");
// Validate Anthropic API key
if (!process.env.ANTHROPIC_API_KEY) {
    logger_1.log.error('Missing required environment variable: ANTHROPIC_API_KEY');
    process.exit(1);
}
console.log('');
console.log('='.repeat(60));
console.log('⚔️  ULFBERHT-WARDEN');
console.log('='.repeat(60));
// Track active handlers
const handlers = {};
// HTTP server for Render health check
const app = (0, express_1.default)();
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
        logger_1.log.info('Starting Ulfberht-Warden...');
        // 1. Initialize persistence layer
        logger_1.log.info('Initializing persistence layer...');
        await persistence_1.persistence.init();
        // 2. Initialize session manager (loads sessions from database)
        logger_1.log.info('Initializing session manager...');
        await sessions_1.sessionManager.init();
        // 3. Check for incomplete tool executions (crash recovery)
        const incompleteTools = await persistence_1.persistence.getIncompleteToolExecutions();
        if (incompleteTools.length > 0) {
            logger_1.log.warn(`Found ${incompleteTools.length} incomplete tool executions from previous session`, {
                count: incompleteTools.length
            });
        }
        // 4. Start platform handlers
        logger_1.log.info('Starting platform handlers...');
        // Start Slack
        handlers.slack = await (0, slack_1.startSlackHandler)();
        // Start Discord
        handlers.discord = await (0, discord_1.startDiscordHandler)();
        // Start Telegram
        handlers.telegram = await (0, telegram_1.startTelegramHandler)();
        // Check if at least one handler is running
        const activeHandlers = Object.values(handlers).filter(Boolean).length;
        if (activeHandlers === 0) {
            logger_1.log.error('No platform tokens configured!');
            console.error('');
            console.error('Configure at least one platform:');
            console.error('  - SLACK_BOT_TOKEN + SLACK_APP_TOKEN');
            console.error('  - DISCORD_BOT_TOKEN');
            console.error('  - TELEGRAM_BOT_TOKEN');
            console.error('');
            process.exit(1);
        }
        // 5. Initialize heartbeat system (if enabled)
        if (process.env.HEARTBEAT_ENABLED === 'true' && handlers.slack) {
            logger_1.log.info('Initializing heartbeat system...');
            const claude = new sdk_1.default({
                apiKey: process.env.ANTHROPIC_API_KEY
            });
            const heartbeat = (0, heartbeat_manager_1.getHeartbeatManager)(handlers.slack, claude, workspace_1.workspace, {
                enabled: true,
                intervalMinutes: parseInt(process.env.HEARTBEAT_INTERVAL_MINUTES || '30'),
                slackChannel: process.env.HEARTBEAT_CHANNEL || 'ulf-heartbeat'
            });
            heartbeat.start();
            logger_1.log.info('Heartbeat system started');
        }
        console.log('='.repeat(60));
        console.log(`Status: ONLINE (${activeHandlers} platform${activeHandlers > 1 ? 's' : ''})`);
        console.log('Model: claude-sonnet-4-20250514');
        console.log('='.repeat(60));
        console.log('');
        logger_1.log.info(`System online with ${activeHandlers} platform(s)`, {
            platforms: {
                slack: !!handlers.slack,
                discord: !!handlers.discord,
                telegram: !!handlers.telegram
            }
        });
        // Start HTTP server after handlers are ready
        app.listen(PORT, () => {
            logger_1.log.info(`HTTP server listening on port ${PORT}`);
        });
    }
    catch (error) {
        logger_1.log.error('Failed to start', { error });
        process.exit(1);
    }
}
// Start initialization
initialize();
// Graceful shutdown handler
async function gracefulShutdown(signal) {
    logger_1.log.info(`${signal} received, shutting down gracefully...`);
    try {
        // 1. Stop heartbeat system
        try {
            const heartbeat = (0, heartbeat_manager_1.getHeartbeatManager)();
            heartbeat.stop();
            logger_1.log.info('Heartbeat system stopped');
        }
        catch {
            // Heartbeat not initialized, skip
        }
        // 2. Stop accepting new requests
        logger_1.log.info('Stopping platform handlers...');
        if (handlers.slack) {
            await handlers.slack.stop();
            logger_1.log.info('Slack handler stopped');
        }
        if (handlers.discord) {
            handlers.discord.destroy();
            logger_1.log.info('Discord handler stopped');
        }
        if (handlers.telegram) {
            handlers.telegram.stop();
            logger_1.log.info('Telegram handler stopped');
        }
        // 3. Flush all sessions to database
        logger_1.log.info('Flushing sessions to database...');
        await sessions_1.sessionManager.flushAll();
        // 4. Save workspace state
        logger_1.log.info('Saving workspace state...');
        await workspace_1.workspace.saveState();
        // 5. Close database connections
        logger_1.log.info('Closing database connections...');
        await persistence_1.persistence.close();
        logger_1.log.info('Shutdown complete');
        process.exit(0);
    }
    catch (error) {
        logger_1.log.error('Error during shutdown', { error });
        process.exit(1);
    }
}
// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger_1.log.error('Uncaught exception', { error });
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.log.error('Unhandled rejection', { reason, promise });
});
