"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistence = exports.SQLitePersistence = void 0;
const database_1 = require("./database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class SQLitePersistence {
    db;
    fallbackDir;
    constructor(db, fallbackDir = './data/fallback') {
        this.db = db;
        this.fallbackDir = fallbackDir;
    }
    async init() {
        try {
            await this.db.init();
        }
        catch (error) {
            console.error('[Persistence] Database initialization failed, using fallback');
            // Ensure fallback directory exists
            if (!fs_1.default.existsSync(this.fallbackDir)) {
                fs_1.default.mkdirSync(this.fallbackDir, { recursive: true });
            }
        }
    }
    async close() {
        await this.db.close();
    }
    // Sessions
    async saveSession(userId, session) {
        try {
            const messages = JSON.stringify(session.messages);
            const createdAt = session.createdAt.toISOString();
            const lastActivity = session.lastActivity.toISOString();
            this.db.saveSession(userId, messages, createdAt, lastActivity);
        }
        catch (error) {
            console.error('[Persistence] Failed to save session, using fallback:', error);
            await this.fallbackSaveSession(userId, session);
        }
    }
    async loadSession(userId) {
        try {
            const row = this.db.loadSession(userId);
            if (!row)
                return null;
            return {
                userId: row.userId,
                messages: JSON.parse(row.messages),
                createdAt: new Date(row.createdAt),
                lastActivity: new Date(row.lastActivity)
            };
        }
        catch (error) {
            console.error('[Persistence] Failed to load session, trying fallback:', error);
            return await this.fallbackLoadSession(userId);
        }
    }
    async getAllSessions() {
        try {
            const rows = this.db.getAllSessions();
            return rows.map(row => ({
                userId: row.userId,
                messages: JSON.parse(row.messages),
                createdAt: new Date(row.createdAt),
                lastActivity: new Date(row.lastActivity)
            }));
        }
        catch (error) {
            console.error('[Persistence] Failed to load all sessions:', error);
            return [];
        }
    }
    // Memories
    async saveDailyLog(date, content) {
        try {
            // Save to database
            this.db.saveDailyLog(date, content, 'daily_log');
            // Also save to file for easy reading
            const memoryDir = path_1.default.join('./workspace/memory');
            if (!fs_1.default.existsSync(memoryDir)) {
                fs_1.default.mkdirSync(memoryDir, { recursive: true });
            }
            const logPath = path_1.default.join(memoryDir, `${date}.md`);
            // Append to existing log or create new
            if (fs_1.default.existsSync(logPath)) {
                fs_1.default.appendFileSync(logPath, `\n${content}\n`);
            }
            else {
                const header = `# ${date}\n\n`;
                fs_1.default.writeFileSync(logPath, header + content + '\n');
            }
        }
        catch (error) {
            console.error('[Persistence] Failed to save daily log:', error);
        }
    }
    async getDailyLog(date) {
        try {
            const row = this.db.getDailyLog(date);
            return row?.content || null;
        }
        catch (error) {
            console.error('[Persistence] Failed to get daily log:', error);
            return null;
        }
    }
    async updateMemory(content) {
        try {
            const memoryPath = path_1.default.join('./workspace', 'MEMORY.md');
            const current = fs_1.default.existsSync(memoryPath)
                ? fs_1.default.readFileSync(memoryPath, 'utf-8')
                : '';
            const updated = current ? `${current}\n\n${content}` : content;
            fs_1.default.writeFileSync(memoryPath, updated, 'utf-8');
            // Also save to database
            const date = new Date().toISOString().split('T')[0];
            this.db.saveDailyLog(date, content, 'curated');
        }
        catch (error) {
            console.error('[Persistence] Failed to update memory:', error);
        }
    }
    async getMemory() {
        try {
            const memoryPath = path_1.default.join('./workspace', 'MEMORY.md');
            if (fs_1.default.existsSync(memoryPath)) {
                return fs_1.default.readFileSync(memoryPath, 'utf-8');
            }
            return '';
        }
        catch (error) {
            console.error('[Persistence] Failed to get memory:', error);
            return '';
        }
    }
    async searchMemories(query) {
        try {
            return this.db.searchMemories(query);
        }
        catch (error) {
            console.error('[Persistence] Failed to search memories:', error);
            return [];
        }
    }
    // Tool executions
    async logToolExecution(exec) {
        try {
            this.db.logToolExecution(exec.userId, exec.toolName, exec.input, exec.output, exec.status, exec.errorMessage);
        }
        catch (error) {
            console.error('[Persistence] Failed to log tool execution:', error);
        }
    }
    async getToolHistory(userId, limit = 20) {
        try {
            return this.db.getToolHistory(userId, limit);
        }
        catch (error) {
            console.error('[Persistence] Failed to get tool history:', error);
            return [];
        }
    }
    async getIncompleteToolExecutions() {
        try {
            return this.db.getIncompleteToolExecutions();
        }
        catch (error) {
            console.error('[Persistence] Failed to get incomplete tool executions:', error);
            return [];
        }
    }
    // Fallback methods using JSON files
    async fallbackSaveSession(userId, session) {
        const filePath = path_1.default.join(this.fallbackDir, `session_${userId}.json`);
        fs_1.default.writeFileSync(filePath, JSON.stringify(session, null, 2));
    }
    async fallbackLoadSession(userId) {
        const filePath = path_1.default.join(this.fallbackDir, `session_${userId}.json`);
        if (!fs_1.default.existsSync(filePath))
            return null;
        const data = fs_1.default.readFileSync(filePath, 'utf-8');
        const session = JSON.parse(data);
        // Convert date strings back to Date objects
        session.createdAt = new Date(session.createdAt);
        session.lastActivity = new Date(session.lastActivity);
        return session;
    }
}
exports.SQLitePersistence = SQLitePersistence;
// Singleton instance
exports.persistence = new SQLitePersistence(database_1.database);
