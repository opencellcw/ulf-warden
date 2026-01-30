"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyLog = exports.DailyLogManager = void 0;
const index_1 = require("./index");
class DailyLogManager {
    static instance;
    currentDate = '';
    constructor() {
        this.updateCurrentDate();
        // Update date at midnight
        setInterval(() => this.updateCurrentDate(), 60000); // Check every minute
    }
    static getInstance() {
        if (!DailyLogManager.instance) {
            DailyLogManager.instance = new DailyLogManager();
        }
        return DailyLogManager.instance;
    }
    updateCurrentDate() {
        const newDate = new Date().toISOString().split('T')[0];
        if (newDate !== this.currentDate) {
            this.currentDate = newDate;
            console.log(`[DailyLog] Date changed to ${this.currentDate}`);
        }
    }
    getCurrentDate() {
        return this.currentDate;
    }
    async logConversation(userId, message) {
        try {
            const date = this.getCurrentDate();
            const role = typeof message === 'object' && 'role' in message ? message.role : 'unknown';
            let content = '';
            if (typeof message === 'object' && 'content' in message) {
                if (typeof message.content === 'string') {
                    content = message.content;
                }
                else if (Array.isArray(message.content)) {
                    content = message.content
                        .map(c => {
                        if (typeof c === 'object' && 'text' in c)
                            return c.text;
                        if (typeof c === 'object' && 'type' in c)
                            return `[${c.type}]`;
                        return '';
                    })
                        .join(' ');
                }
            }
            // Truncate very long messages
            if (content.length > 500) {
                content = content.substring(0, 500) + '...';
            }
            const logEntry = `## Conversation\n- User: ${userId}\n- Role: ${role}\n- Preview: ${content.split('\n')[0]}\n- Time: ${new Date().toISOString()}`;
            await index_1.persistence.saveDailyLog(date, logEntry);
        }
        catch (error) {
            console.error('[DailyLog] Failed to log conversation:', error);
        }
    }
    async logToolExecution(userId, toolName, input, output, status) {
        try {
            const date = this.getCurrentDate();
            const inputStr = typeof input === 'object' ? JSON.stringify(input) : String(input);
            const outputStr = output ? (typeof output === 'object' ? JSON.stringify(output).substring(0, 200) : String(output).substring(0, 200)) : 'N/A';
            const logEntry = `## Tool Execution\n- User: ${userId}\n- Tool: ${toolName}\n- Input: ${inputStr.substring(0, 200)}\n- Output: ${outputStr}\n- Status: ${status}\n- Time: ${new Date().toISOString()}`;
            await index_1.persistence.saveDailyLog(date, logEntry);
        }
        catch (error) {
            console.error('[DailyLog] Failed to log tool execution:', error);
        }
    }
    async logLearning(userId, learning) {
        try {
            const date = this.getCurrentDate();
            const logEntry = `## Learning\n- User: ${userId}\n- Content: ${learning}\n- Time: ${new Date().toISOString()}`;
            await index_1.persistence.saveDailyLog(date, logEntry);
        }
        catch (error) {
            console.error('[DailyLog] Failed to log learning:', error);
        }
    }
    async logError(userId, error, context) {
        try {
            const date = this.getCurrentDate();
            const logEntry = `## Error\n- User: ${userId}\n- Error: ${error}\n- Context: ${context || 'N/A'}\n- Time: ${new Date().toISOString()}`;
            await index_1.persistence.saveDailyLog(date, logEntry);
        }
        catch (error) {
            console.error('[DailyLog] Failed to log error:', error);
        }
    }
    async getTodayLog() {
        return await index_1.persistence.getDailyLog(this.getCurrentDate());
    }
    async getLogForDate(date) {
        return await index_1.persistence.getDailyLog(date);
    }
}
exports.DailyLogManager = DailyLogManager;
// Export singleton instance
exports.dailyLog = DailyLogManager.getInstance();
