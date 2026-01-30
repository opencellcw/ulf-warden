"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSlackHandler = startSlackHandler;
const bolt_1 = require("@slack/bolt");
const chat_1 = require("../chat");
const agent_1 = require("../agent");
const sessions_1 = require("../sessions");
const media_handler_1 = require("../media-handler");
const slack_messaging_1 = require("../tools/slack-messaging");
const logger_1 = require("../logger");
async function startSlackHandler() {
    if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN) {
        console.log('[Slack] Tokens not found, skipping Slack handler');
        return null;
    }
    const app = new bolt_1.App({
        token: process.env.SLACK_BOT_TOKEN,
        appToken: process.env.SLACK_APP_TOKEN,
        socketMode: true,
    });
    // Initialize Slack messaging for proactive messages
    (0, slack_messaging_1.initSlackMessaging)(app);
    /**
     * Send response with automatic media handling
     */
    async function sendResponse(channel, response, say, event) {
        // Check if response contains media
        const media = (0, media_handler_1.extractMediaMetadata)(response);
        if (media) {
            logger_1.log.info('[Slack] Media detected in response', {
                type: media.type,
                hasUrl: !!media.url,
                hasFilePath: !!media.filePath,
                channel,
                channelType: event?.channel_type || 'unknown'
            });
            // Validate channel ID
            if (!channel || channel === 'undefined') {
                logger_1.log.error('[Slack] Invalid channel ID', { channel, event });
                await say(`⚠️ Erro: Canal inválido. Tente mencionar o bot diretamente.`);
                return;
            }
            // Clean text (remove URLs/paths)
            const cleanText = (0, media_handler_1.cleanResponseText)(response, media);
            try {
                // Upload media to Slack
                await (0, media_handler_1.uploadMediaToSlack)(app, channel, media, cleanText || '✨ Generated content');
                logger_1.log.info('[Slack] Media sent successfully');
            }
            catch (error) {
                logger_1.log.error('[Slack] Upload failed', {
                    error: error.message,
                    stack: error.stack,
                    channel,
                    mediaType: media.type
                });
                // Send error message instead of link
                await say(`⚠️ Conteúdo gerado mas não consegui fazer upload.\n\n**Erro:** ${error.message}\n\nVerifique:\n- Bot tem permissão \`files:write\`?\n- Bot está no canal? (convide com \`/invite @ulfberht-warden\`)`);
            }
        }
        else {
            // No media, send normal text response
            await say(response);
        }
    }
    // Detect if message needs agent mode (execution)
    function needsAgent(text) {
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
            'remove fundo', 'remove background', 'upscale'
        ];
        const lowerText = text.toLowerCase();
        return agentKeywords.some(keyword => lowerText.includes(keyword));
    }
    // Handle direct messages
    app.event('message', async ({ event, say }) => {
        try {
            // @ts-ignore
            if (event.subtype || event.bot_id)
                return;
            // @ts-ignore
            const userId = `slack_${event.user}`;
            // @ts-ignore
            const text = event.text;
            // @ts-ignore
            const channel = event.channel;
            if (!text)
                return;
            console.log(`[Slack] Message from ${userId}: ${text.substring(0, 50)}...`);
            const history = await sessions_1.sessionManager.getHistory(userId);
            // Choose between agent (with tools) or regular chat
            const useAgent = needsAgent(text);
            let response;
            if (useAgent) {
                console.log(`[Slack] Using AGENT mode for: ${text.substring(0, 30)}...`);
                response = await (0, agent_1.runAgent)({
                    userId,
                    userMessage: text,
                    history,
                });
            }
            else {
                response = await (0, chat_1.chat)({
                    userId,
                    userMessage: text,
                    history,
                });
            }
            await sessions_1.sessionManager.addMessage(userId, { role: 'user', content: text });
            await sessions_1.sessionManager.addMessage(userId, { role: 'assistant', content: response });
            await sendResponse(channel, response, say, event);
        }
        catch (error) {
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
            const history = await sessions_1.sessionManager.getHistory(userId);
            // Choose between agent (with tools) or regular chat
            const useAgent = needsAgent(text);
            let response;
            if (useAgent) {
                console.log(`[Slack] Using AGENT mode for: ${text.substring(0, 30)}...`);
                response = await (0, agent_1.runAgent)({
                    userId,
                    userMessage: text,
                    history,
                });
            }
            else {
                response = await (0, chat_1.chat)({
                    userId,
                    userMessage: text,
                    history,
                });
            }
            await sessions_1.sessionManager.addMessage(userId, { role: 'user', content: text });
            await sessions_1.sessionManager.addMessage(userId, { role: 'assistant', content: response });
            await sendResponse(channel, response, say, event);
        }
        catch (error) {
            console.error('[Slack] Error handling mention:', error);
            await say('Desculpa, tive um problema. Tenta de novo?');
        }
    });
    await app.start();
    console.log('✓ Slack handler started');
    return app;
}
