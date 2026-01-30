"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackMemory = void 0;
exports.setupSlackMemoryCommands = setupSlackMemoryCommands;
const logger_1 = require("../logger");
/**
 * Slack-Native Memory System
 *
 * Uses Slack channels and threads as memory storage:
 * - #ulf-memory: Facts and learnings
 * - #ulf-logs: Technical logs
 * - #ulf-projects: Project context
 * - Threads as sessions
 * - Slack search API for retrieval
 */
class SlackMemory {
    app;
    memoryChannel;
    logsChannel;
    projectsChannel;
    constructor(app) {
        this.app = app;
        this.memoryChannel = process.env.SLACK_MEMORY_CHANNEL || 'ulf-memory';
        this.logsChannel = process.env.SLACK_LOGS_CHANNEL || 'ulf-logs';
        this.projectsChannel = process.env.SLACK_PROJECTS_CHANNEL || 'ulf-projects';
        logger_1.log.info('[SlackMemory] Initialized', {
            memoryChannel: this.memoryChannel,
            logsChannel: this.logsChannel,
            projectsChannel: this.projectsChannel
        });
    }
    /**
     * Store a fact in Slack memory channel
     */
    async storeFact(content, userId, threadTs) {
        try {
            await this.app.client.chat.postMessage({
                channel: this.memoryChannel,
                text: `:memo: **FACT** (from <@${userId}>):\n${content}`,
                thread_ts: threadTs,
                unfurl_links: false,
                unfurl_media: false
            });
            logger_1.log.info('[SlackMemory] Fact stored', { content: content.substring(0, 50) });
        }
        catch (error) {
            logger_1.log.error('[SlackMemory] Failed to store fact', {
                error: error.message
            });
        }
    }
    /**
     * Store a learning in Slack memory channel
     */
    async storeLearning(content, userId, project) {
        try {
            const tags = project ? `\n:label: Project: \`${project}\`` : '';
            await this.app.client.chat.postMessage({
                channel: this.memoryChannel,
                text: `:bulb: **LEARNING** (from <@${userId}>):\n${content}${tags}`,
                unfurl_links: false,
                unfurl_media: false
            });
            logger_1.log.info('[SlackMemory] Learning stored', { content: content.substring(0, 50) });
        }
        catch (error) {
            logger_1.log.error('[SlackMemory] Failed to store learning', {
                error: error.message
            });
        }
    }
    /**
     * Store project context
     */
    async storeProjectContext(projectName, context, userId) {
        try {
            await this.app.client.chat.postMessage({
                channel: this.projectsChannel,
                text: `:file_folder: **PROJECT: ${projectName}**\n\n${context}\n\n_Updated by <@${userId}>_`,
                unfurl_links: false,
                unfurl_media: false
            });
            logger_1.log.info('[SlackMemory] Project context stored', { projectName });
        }
        catch (error) {
            logger_1.log.error('[SlackMemory] Failed to store project context', {
                error: error.message
            });
        }
    }
    /**
     * Search memory using Slack search API
     */
    async searchMemory(query, limit = 10) {
        try {
            logger_1.log.info('[SlackMemory] Searching', { query });
            const response = await this.app.client.search.messages({
                query: `in:${this.memoryChannel} ${query}`,
                count: limit,
                sort: 'timestamp',
                sort_dir: 'desc'
            });
            const results = [];
            if (response.messages?.matches) {
                for (const match of response.messages.matches) {
                    results.push({
                        text: match.text || '',
                        timestamp: match.ts || '',
                        permalink: match.permalink || '',
                        user: match.username || ''
                    });
                }
            }
            logger_1.log.info('[SlackMemory] Search complete', {
                resultsFound: results.length
            });
            return results;
        }
        catch (error) {
            logger_1.log.error('[SlackMemory] Search failed', {
                error: error.message
            });
            return [];
        }
    }
    /**
     * Summarize thread (session)
     */
    async summarizeThread(channel, threadTs) {
        try {
            logger_1.log.info('[SlackMemory] Summarizing thread', { channel, threadTs });
            // Get all messages in thread
            const response = await this.app.client.conversations.replies({
                channel,
                ts: threadTs,
                limit: 1000
            });
            if (!response.messages || response.messages.length === 0) {
                return 'No messages in thread';
            }
            // Extract text from messages
            const messages = response.messages
                .map(m => `${m.user}: ${m.text}`)
                .join('\n');
            // TODO: Use GPT to summarize
            // For now, return truncated
            return messages.substring(0, 500) + '...';
        }
        catch (error) {
            logger_1.log.error('[SlackMemory] Failed to summarize thread', {
                error: error.message
            });
            return 'Failed to summarize';
        }
    }
    /**
     * Pin important message
     */
    async pinMessage(channel, timestamp) {
        try {
            await this.app.client.pins.add({
                channel,
                timestamp
            });
            logger_1.log.info('[SlackMemory] Message pinned', { channel, timestamp });
        }
        catch (error) {
            logger_1.log.error('[SlackMemory] Failed to pin message', {
                error: error.message
            });
        }
    }
    /**
     * Get channel history (for context)
     */
    async getChannelHistory(channel, limit = 100) {
        try {
            const response = await this.app.client.conversations.history({
                channel,
                limit
            });
            const messages = [];
            if (response.messages) {
                for (const msg of response.messages) {
                    messages.push({
                        text: msg.text || '',
                        user: msg.user || '',
                        timestamp: msg.ts || '',
                        threadTs: msg.thread_ts
                    });
                }
            }
            return messages;
        }
        catch (error) {
            logger_1.log.error('[SlackMemory] Failed to get history', {
                error: error.message
            });
            return [];
        }
    }
    /**
     * Schedule reminder message
     */
    async scheduleReminder(channel, text, postAt) {
        try {
            await this.app.client.chat.scheduleMessage({
                channel,
                text: `:alarm_clock: **REMINDER:**\n${text}`,
                post_at: postAt
            });
            logger_1.log.info('[SlackMemory] Reminder scheduled', {
                channel,
                postAt: new Date(postAt * 1000).toISOString()
            });
        }
        catch (error) {
            logger_1.log.error('[SlackMemory] Failed to schedule reminder', {
                error: error.message
            });
        }
    }
    /**
     * Export memory to file
     */
    async exportMemory(channel, userId) {
        try {
            const history = await this.getChannelHistory(this.memoryChannel, 1000);
            const content = history
                .map(m => `[${m.timestamp}] ${m.text}`)
                .join('\n\n');
            const filename = `memory_export_${Date.now()}.txt`;
            const buffer = Buffer.from(content, 'utf-8');
            // Upload as file to channel
            await this.app.client.files.uploadV2({
                channel_id: channel,
                file: buffer,
                filename,
                title: 'Memory Export',
                initial_comment: `Memory export requested by <@${userId}>`
            });
            logger_1.log.info('[SlackMemory] Memory exported', { filename });
            return filename;
        }
        catch (error) {
            logger_1.log.error('[SlackMemory] Failed to export memory', {
                error: error.message
            });
            throw error;
        }
    }
}
exports.SlackMemory = SlackMemory;
/**
 * Setup slash commands for Slack memory
 */
function setupSlackMemoryCommands(app, slackMemory) {
    // /ulf-remember: Store a fact
    app.command('/ulf-remember', async ({ command, ack, respond }) => {
        await ack();
        try {
            await slackMemory.storeFact(command.text, command.user_id);
            await respond({
                text: `:white_check_mark: Remembered: "${command.text}"`,
                response_type: 'ephemeral'
            });
        }
        catch (error) {
            await respond({
                text: `:x: Failed to remember: ${error.message}`,
                response_type: 'ephemeral'
            });
        }
    });
    // /ulf-recall: Search memory
    app.command('/ulf-recall', async ({ command, ack, respond }) => {
        await ack();
        try {
            const results = await slackMemory.searchMemory(command.text, 5);
            if (results.length === 0) {
                await respond({
                    text: `:thinking_face: No memories found for: "${command.text}"`,
                    response_type: 'ephemeral'
                });
                return;
            }
            const blocks = [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `:brain: *Found ${results.length} memories:*`
                    }
                }
            ];
            for (const result of results) {
                blocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `• ${result.text.substring(0, 200)}\n<${result.permalink}|View>`
                    }
                });
            }
            await respond({
                blocks: blocks,
                response_type: 'ephemeral'
            });
        }
        catch (error) {
            await respond({
                text: `:x: Failed to recall: ${error.message}`,
                response_type: 'ephemeral'
            });
        }
    });
    // /ulf-summary: Summarize current thread
    app.command('/ulf-summary', async ({ command, ack, respond }) => {
        await ack();
        try {
            if (!command.thread_ts) {
                await respond({
                    text: `:warning: This command must be used in a thread`,
                    response_type: 'ephemeral'
                });
                return;
            }
            const summary = await slackMemory.summarizeThread(command.channel_id, command.thread_ts);
            await respond({
                text: `:memo: *Thread Summary:*\n\n${summary}`,
                response_type: 'ephemeral'
            });
        }
        catch (error) {
            await respond({
                text: `:x: Failed to summarize: ${error.message}`,
                response_type: 'ephemeral'
            });
        }
    });
    logger_1.log.info('[SlackMemory] Slash commands registered');
}
