"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const slack_1 = require("./handlers/slack");
const discord_1 = require("./handlers/discord");
const telegram_1 = require("./handlers/telegram");
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
const handlers = {};
// Start all enabled handlers
(async () => {
    try {
        // Start Slack
        handlers.slack = await (0, slack_1.startSlackHandler)();
        // Start Discord
        handlers.discord = await (0, discord_1.startDiscordHandler)();
        // Start Telegram
        handlers.telegram = await (0, telegram_1.startTelegramHandler)();
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
    }
    catch (error) {
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
