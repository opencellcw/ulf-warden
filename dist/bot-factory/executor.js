"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeBotFactoryTool = executeBotFactoryTool;
const registry_1 = require("./registry");
const deployer_1 = require("./deployer");
const helm_generator_1 = require("./helm-generator");
const logger_1 = require("../logger");
const MAX_BOTS_PER_USER = 10;
function isAdmin(userId) {
    const adminIds = process.env.DISCORD_ADMIN_USER_IDS?.split(',') || [];
    const cleanUserId = userId.replace('discord_', '');
    return adminIds.includes(cleanUserId);
}
async function executeBotFactoryTool(toolName, input, userId) {
    logger_1.log.info('[BotFactory] Tool execution', { toolName, userId });
    switch (toolName) {
        case 'create_bot':
            if (!isAdmin(userId)) {
                return '🚫 Error: Only admins can create bots';
            }
            return await createBotHandler(input, userId);
        case 'list_bots':
            return await listBotsHandler();
        case 'delete_bot':
            if (!isAdmin(userId)) {
                return '🚫 Error: Only admins can delete bots';
            }
            return await deleteBotHandler(input.name);
        case 'get_bot_status':
            return await getBotStatusHandler(input.name);
        default:
            throw new Error(`Unknown bot factory tool: ${toolName}`);
    }
}
async function createBotHandler(input, userId) {
    const { name, personality, model = 'sonnet', enable_discord = true, enable_slack = false } = input;
    // Validate name
    const validation = (0, helm_generator_1.validateBotName)(name);
    if (!validation.valid) {
        return `❌ Error: ${validation.reason}`;
    }
    // Check if bot exists
    if (await registry_1.botRegistry.exists(name)) {
        return `❌ Error: Bot "${name}" already exists`;
    }
    // Check bot limit
    const creatorDiscordId = userId.replace('discord_', '');
    const botCount = await registry_1.botRegistry.countBotsByCreator(creatorDiscordId);
    if (botCount >= MAX_BOTS_PER_USER) {
        return `❌ Error: Maximum ${MAX_BOTS_PER_USER} bots per user reached`;
    }
    // Generate bot ID
    const botId = (0, helm_generator_1.generateBotId)(name);
    logger_1.log.info('[BotFactory] Creating bot', { name, botId, model });
    // Generate Helm values
    const config = {
        name: botId,
        personality,
        model,
        replicas: 1,
        enableDiscord: enable_discord,
        enableSlack: enable_slack
    };
    const helmValues = (0, helm_generator_1.generateHelmValues)(config);
    // Register bot in database
    await registry_1.botRegistry.createBot(botId, name, personality, creatorDiscordId, config);
    // Deploy to Kubernetes
    try {
        const result = await deployer_1.botDeployer.deploy(botId, helmValues);
        if (result.success) {
            await registry_1.botRegistry.updateStatus(botId, 'running');
            await registry_1.botRegistry.updateHealthCheck(botId);
            return `✅ Bot "${name}" created successfully!

**Status:** ${result.status}
**Pod:** ${result.podName}
**Model:** ${model}
**Channels:** ${enable_discord ? 'Discord' : ''} ${enable_slack ? 'Slack' : ''}

The bot should be online in ~30 seconds. Try mentioning @${name} to interact with it.`;
        }
        else {
            await registry_1.botRegistry.updateStatus(botId, 'failed');
            return `❌ Deployment failed: ${result.error}

The bot was registered but failed to deploy to Kubernetes. Check the logs for details.`;
        }
    }
    catch (error) {
        await registry_1.botRegistry.updateStatus(botId, 'failed');
        logger_1.log.error('[BotFactory] Create bot failed', { error: error.message });
        return `❌ Deployment failed: ${error.message}`;
    }
}
async function listBotsHandler() {
    const bots = await registry_1.botRegistry.listBots();
    if (bots.length === 0) {
        return '📋 No bots deployed yet.\n\nUse `create_bot` to deploy your first bot!';
    }
    const lines = ['📋 **Deployed Bots:**\n'];
    for (const bot of bots) {
        const config = JSON.parse(bot.deploymentConfig);
        const statusEmoji = bot.status === 'running' ? '✅' :
            bot.status === 'deploying' ? '🔄' :
                bot.status === 'failed' ? '❌' : '⏸️';
        lines.push(`${statusEmoji} **${bot.name}**`);
        lines.push(`   - Status: ${bot.status}`);
        lines.push(`   - Model: ${config.model}`);
        lines.push(`   - Created: ${new Date(bot.createdAt).toLocaleDateString()}`);
        lines.push(`   - Creator: <@${bot.creatorDiscordId}>`);
        lines.push('');
    }
    return lines.join('\n');
}
async function deleteBotHandler(name) {
    const bot = await registry_1.botRegistry.getBotByName(name);
    if (!bot) {
        return `❌ Error: Bot "${name}" not found`;
    }
    logger_1.log.info('[BotFactory] Deleting bot', { name, botId: bot.id });
    try {
        // Delete from Kubernetes
        await deployer_1.botDeployer.delete(bot.id);
        // Delete from registry
        await registry_1.botRegistry.deleteBot(bot.id);
        return `✅ Bot "${name}" has been deleted

The Helm release and all Kubernetes resources have been removed.`;
    }
    catch (error) {
        logger_1.log.error('[BotFactory] Delete bot failed', { error: error.message });
        return `❌ Failed to delete bot: ${error.message}`;
    }
}
async function getBotStatusHandler(name) {
    const bot = await registry_1.botRegistry.getBotByName(name);
    if (!bot) {
        return `❌ Error: Bot "${name}" not found`;
    }
    try {
        const status = await deployer_1.botDeployer.getStatus(bot.id);
        const config = JSON.parse(bot.deploymentConfig);
        const statusEmoji = status.ready ? '✅' : '⚠️';
        const healthCheck = bot.lastHealthCheck
            ? new Date(bot.lastHealthCheck).toLocaleString()
            : 'Never';
        return `${statusEmoji} **Bot Status: ${bot.name}**

**Database Status:** ${bot.status}
**Kubernetes Status:** ${status.status}
**Ready:** ${status.ready ? 'Yes' : 'No'}
**Pod Name:** ${status.podName || 'N/A'}
**Model:** ${config.model}
**Personality:** ${bot.personality.substring(0, 100)}...
**Created:** ${new Date(bot.createdAt).toLocaleString()}
**Last Health Check:** ${healthCheck}`;
    }
    catch (error) {
        logger_1.log.error('[BotFactory] Get bot status failed', { error: error.message });
        return `❌ Failed to get bot status: ${error.message}`;
    }
}
