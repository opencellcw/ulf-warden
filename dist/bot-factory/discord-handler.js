"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBotCreation = handleBotCreation;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const registry_1 = require("./registry");
const deployer_1 = require("./deployer");
const helm_generator_1 = require("./helm-generator");
const logger_1 = require("../logger");
const claude = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY
});
function isAdmin(userId) {
    const adminIds = process.env.DISCORD_ADMIN_USER_IDS?.split(',') || [];
    return adminIds.includes(userId);
}
async function parseBotIntent(text) {
    const prompt = `Parse this bot creation request and extract the intent.

User message: "${text}"

Extract:
- Bot name (if not specified, suggest one based on personality)
- Bot personality/behavior description
- Model preference (sonnet/opus/haiku, default to sonnet)

Return ONLY a JSON object:
{
  "name": "guardian",
  "personality": "You are a strict security monitor...",
  "model": "sonnet"
}`;
    const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
                role: 'user',
                content: prompt
            }]
    });
    const content = response.content[0];
    if (content.type !== 'text') {
        throw new Error('Unexpected response type');
    }
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }
    return JSON.parse(jsonText);
}
async function handleBotCreation(message) {
    // Check authorization
    if (!isAdmin(message.author.id)) {
        await message.reply('🚫 Only admins can create bots');
        return;
    }
    try {
        await message.reply('🤖 Analyzing your bot creation request...');
        // Parse bot creation intent
        const intent = await parseBotIntent(message.content);
        logger_1.log.info('[BotFactory] Bot intent parsed', intent);
        // Validate bot name
        const validation = (0, helm_generator_1.validateBotName)(intent.name);
        if (!validation.valid) {
            await message.reply(`❌ Invalid bot name: ${validation.reason}`);
            return;
        }
        // Check if bot already exists
        if (await registry_1.botRegistry.exists(intent.name)) {
            await message.reply(`❌ Bot "${intent.name}" already exists. Choose a different name.`);
            return;
        }
        // Check bot limit
        const botCount = await registry_1.botRegistry.countBotsByCreator(message.author.id);
        if (botCount >= 10) {
            await message.reply('❌ Maximum 10 bots per user reached');
            return;
        }
        await message.reply(`🤖 Creating bot "${intent.name}"...\n\n` +
            `**Personality:** ${intent.personality.substring(0, 150)}...\n` +
            `**Model:** ${intent.model || 'sonnet'}\n\n` +
            `This will take ~30 seconds...`);
        // Generate bot ID and config
        const botId = (0, helm_generator_1.generateBotId)(intent.name);
        const config = {
            name: botId,
            personality: intent.personality,
            model: intent.model || 'sonnet',
            replicas: 1,
            enableDiscord: true
        };
        // Generate Helm values
        const helmValues = (0, helm_generator_1.generateHelmValues)(config);
        // Register bot in database
        await registry_1.botRegistry.createBot(botId, intent.name, intent.personality, message.author.id, config);
        // Deploy to Kubernetes
        const result = await deployer_1.botDeployer.deploy(botId, helmValues);
        if (result.success) {
            await registry_1.botRegistry.updateStatus(botId, 'running');
            await registry_1.botRegistry.updateHealthCheck(botId);
            await message.reply(`✅ Bot "${intent.name}" deployed successfully!\n\n` +
                `**Status:** ${result.status}\n` +
                `**Pod:** ${result.podName}\n` +
                `**Model:** ${config.model}\n\n` +
                `The bot should be online now. Try mentioning @${intent.name} to interact with it!`);
        }
        else {
            await registry_1.botRegistry.updateStatus(botId, 'failed');
            await message.reply(`❌ Deployment failed: ${result.error}\n\n` +
                `The bot was registered but failed to deploy. Check logs for details.`);
        }
    }
    catch (error) {
        logger_1.log.error('[BotFactory] Bot creation failed', { error: error.message });
        await message.reply(`❌ Bot creation failed: ${error.message}`);
    }
}
