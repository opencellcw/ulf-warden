"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeartbeatManager = void 0;
exports.getHeartbeatManager = getHeartbeatManager;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../logger");
const types_1 = require("./types");
/**
 * Heartbeat Manager
 *
 * Provides autonomous periodic checks for the agent.
 * Allows Ulf to be proactive without waiting for user input.
 */
class HeartbeatManager {
    app;
    claude;
    workspace;
    config;
    state;
    interval = null;
    stateFile;
    constructor(app, claude, workspace, config) {
        this.app = app;
        this.claude = claude;
        this.workspace = workspace;
        this.config = { ...types_1.DEFAULT_HEARTBEAT_CONFIG, ...config };
        this.stateFile = path_1.default.join(process.env.DATA_DIR || './data', 'heartbeat-state.json');
        // Load or initialize state
        this.state = this.loadState();
        logger_1.log.info('[Heartbeat] Initialized', {
            enabled: this.config.enabled,
            intervalMinutes: this.config.intervalMinutes,
            channel: this.config.slackChannel
        });
    }
    /**
     * Load heartbeat state from disk
     */
    loadState() {
        try {
            if (fs_1.default.existsSync(this.stateFile)) {
                const data = fs_1.default.readFileSync(this.stateFile, 'utf-8');
                return JSON.parse(data);
            }
        }
        catch (error) {
            logger_1.log.error('[Heartbeat] Failed to load state', { error: error.message });
        }
        // Default state
        return {
            lastCheck: new Date().toISOString(),
            checksPerformed: 0,
            alertsSent: 0
        };
    }
    /**
     * Save heartbeat state to disk
     */
    saveState() {
        try {
            fs_1.default.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
        }
        catch (error) {
            logger_1.log.error('[Heartbeat] Failed to save state', { error: error.message });
        }
    }
    /**
     * Check if currently in quiet hours
     */
    isQuietHours() {
        if (this.config.quietHoursStart === undefined || this.config.quietHoursEnd === undefined) {
            return false;
        }
        const now = new Date();
        const hour = now.getHours();
        const start = this.config.quietHoursStart;
        const end = this.config.quietHoursEnd;
        // Handle overnight quiet hours (e.g., 23:00 - 07:00)
        if (start > end) {
            return hour >= start || hour < end;
        }
        return hour >= start && hour < end;
    }
    /**
     * Perform a heartbeat check
     */
    async performCheck() {
        const timestamp = new Date().toISOString();
        logger_1.log.info('[Heartbeat] Performing check', { timestamp });
        try {
            // Build context from workspace
            const systemPrompt = this.workspace.getSystemPrompt();
            const heartbeatPrompt = this.buildHeartbeatPrompt();
            // Call Claude with context
            const response = await this.claude.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 500,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: heartbeatPrompt
                    }
                ]
            });
            const responseText = response.content
                .filter((block) => block.type === 'text')
                .map(block => block.text)
                .join('\n');
            logger_1.log.info('[Heartbeat] Check response', {
                response: responseText.substring(0, 200)
            });
            // Parse response
            const requiresAttention = !responseText.includes('HEARTBEAT_OK');
            // Update state
            this.state.lastCheck = timestamp;
            this.state.checksPerformed++;
            if (requiresAttention) {
                this.state.alertsSent++;
                this.state.lastAlert = timestamp;
            }
            this.saveState();
            return {
                timestamp,
                type: requiresAttention ? 'alert' : 'routine',
                message: requiresAttention ? responseText : undefined,
                requiresAttention
            };
        }
        catch (error) {
            logger_1.log.error('[Heartbeat] Check failed', { error: error.message });
            return {
                timestamp,
                type: 'alert',
                message: `Heartbeat check failed: ${error.message}`,
                requiresAttention: true
            };
        }
    }
    /**
     * Build heartbeat prompt
     */
    buildHeartbeatPrompt() {
        const now = new Date();
        const timeStr = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        return `**HEARTBEAT CHECK** (${timeStr})

You are performing an autonomous periodic check. Review the current state and decide if anything needs attention.

**Your tasks:**
1. Check if there are any pending actions or follow-ups
2. Review recent interactions for issues
3. Check if any scheduled tasks are due
4. Verify system health (memory, processes, etc.)

**Response format:**
- If everything is OK: Reply ONLY with "HEARTBEAT_OK"
- If something needs attention: Provide a brief summary (2-3 sentences max)

**Examples:**
- "HEARTBEAT_OK"
- "⚠️ Memory usage is high (85%). Consider reviewing and archiving old sessions."
- "📅 Reminder: User asked to follow up on project X today."

Be concise. Only alert if truly important.`;
    }
    /**
     * Send alert to Slack
     */
    async sendAlert(check) {
        if (!check.requiresAttention || !check.message) {
            return;
        }
        // Don't send alerts during quiet hours
        if (this.isQuietHours()) {
            logger_1.log.info('[Heartbeat] Skipping alert (quiet hours)', {
                message: check.message.substring(0, 100)
            });
            return;
        }
        try {
            await this.app.client.chat.postMessage({
                channel: this.config.slackChannel,
                text: `🔔 **Heartbeat Alert**\n\n${check.message}\n\n_${check.timestamp}_`,
                unfurl_links: false,
                unfurl_media: false
            });
            logger_1.log.info('[Heartbeat] Alert sent to Slack', {
                channel: this.config.slackChannel
            });
        }
        catch (error) {
            logger_1.log.error('[Heartbeat] Failed to send alert', {
                error: error.message,
                channel: this.config.slackChannel
            });
        }
    }
    /**
     * Start heartbeat loop
     */
    start() {
        if (!this.config.enabled) {
            logger_1.log.info('[Heartbeat] Not starting (disabled in config)');
            return;
        }
        if (this.interval) {
            logger_1.log.warn('[Heartbeat] Already running');
            return;
        }
        const intervalMs = this.config.intervalMinutes * 60 * 1000;
        this.interval = setInterval(async () => {
            try {
                const check = await this.performCheck();
                await this.sendAlert(check);
            }
            catch (error) {
                logger_1.log.error('[Heartbeat] Loop error', { error: error.message });
            }
        }, intervalMs);
        logger_1.log.info('[Heartbeat] Started', {
            intervalMinutes: this.config.intervalMinutes,
            nextCheck: new Date(Date.now() + intervalMs).toISOString()
        });
        // Perform initial check after 1 minute
        setTimeout(async () => {
            const check = await this.performCheck();
            await this.sendAlert(check);
        }, 60 * 1000);
    }
    /**
     * Stop heartbeat loop
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            logger_1.log.info('[Heartbeat] Stopped');
        }
    }
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Manual trigger (for testing)
     */
    async trigger() {
        logger_1.log.info('[Heartbeat] Manual trigger');
        const check = await this.performCheck();
        await this.sendAlert(check);
        return check;
    }
}
exports.HeartbeatManager = HeartbeatManager;
// Export singleton
let heartbeatInstance = null;
function getHeartbeatManager(app, claude, workspace, config) {
    if (!heartbeatInstance && app && claude && workspace) {
        heartbeatInstance = new HeartbeatManager(app, claude, workspace, config);
    }
    if (!heartbeatInstance) {
        throw new Error('HeartbeatManager not initialized. Call with parameters first.');
    }
    return heartbeatInstance;
}
