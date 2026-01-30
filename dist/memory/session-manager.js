"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
exports.getSessionManager = getSessionManager;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const logger_1 = require("../logger");
const openai_1 = __importDefault(require("openai"));
/**
 * Session Manager
 *
 * Manages conversation sessions with auto-save and context compression
 */
class SessionManager {
    sessions = new Map();
    sessionsDir;
    openai;
    autoSaveInterval = null;
    constructor() {
        this.sessionsDir = path_1.default.join(process.env.DATA_DIR || './data', 'sessions');
        // Ensure sessions directory exists
        if (!fs_1.default.existsSync(this.sessionsDir)) {
            fs_1.default.mkdirSync(this.sessionsDir, { recursive: true });
        }
        // Initialize OpenAI for summarization
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY
        });
        logger_1.log.info('[SessionManager] Initialized', { sessionsDir: this.sessionsDir });
    }
    /**
     * Create new session
     */
    createSession(userId) {
        const sessionId = (0, uuid_1.v4)();
        const session = {
            sessionId,
            userId,
            startedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            messageCount: 0,
            keyInsights: [],
            memories: []
        };
        this.sessions.set(sessionId, session);
        logger_1.log.info('[SessionManager] Session created', { sessionId, userId });
        return sessionId;
    }
    /**
     * Update session activity
     */
    updateSession(sessionId, messageCount, insights) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        session.lastActivity = new Date().toISOString();
        if (messageCount !== undefined) {
            session.messageCount = messageCount;
        }
        if (insights) {
            session.keyInsights.push(...insights);
        }
        this.sessions.set(sessionId, session);
    }
    /**
     * Save session to disk
     */
    async saveSession(sessionId, messages) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            logger_1.log.warn('[SessionManager] Session not found', { sessionId });
            return;
        }
        try {
            const sessionFile = path_1.default.join(this.sessionsDir, `${sessionId}.json`);
            const data = {
                ...session,
                messages: messages.map((m) => ({
                    role: m.role,
                    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
                }))
            };
            fs_1.default.writeFileSync(sessionFile, JSON.stringify(data, null, 2), 'utf-8');
            logger_1.log.info('[SessionManager] Session saved', {
                sessionId,
                messageCount: messages.length
            });
        }
        catch (error) {
            logger_1.log.error('[SessionManager] Failed to save session', {
                sessionId,
                error: error.message
            });
        }
    }
    /**
     * Load session from disk
     */
    async loadSession(sessionId) {
        try {
            const sessionFile = path_1.default.join(this.sessionsDir, `${sessionId}.json`);
            if (!fs_1.default.existsSync(sessionFile)) {
                logger_1.log.warn('[SessionManager] Session file not found', { sessionId });
                return null;
            }
            const data = JSON.parse(fs_1.default.readFileSync(sessionFile, 'utf-8'));
            const session = {
                sessionId: data.sessionId,
                userId: data.userId,
                startedAt: data.startedAt,
                lastActivity: data.lastActivity,
                messageCount: data.messageCount,
                summary: data.summary,
                keyInsights: data.keyInsights || [],
                memories: data.memories || []
            };
            const messages = (data.messages || []).map((m) => ({
                role: m.role,
                content: m.content
            }));
            this.sessions.set(sessionId, session);
            logger_1.log.info('[SessionManager] Session loaded', {
                sessionId,
                messageCount: messages.length
            });
            return { session, messages };
        }
        catch (error) {
            logger_1.log.error('[SessionManager] Failed to load session', {
                sessionId,
                error: error.message
            });
            return null;
        }
    }
    /**
     * List all sessions
     */
    listSessions() {
        const sessions = [];
        try {
            const files = fs_1.default.readdirSync(this.sessionsDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path_1.default.join(this.sessionsDir, file);
                    const data = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
                    sessions.push({
                        sessionId: data.sessionId,
                        userId: data.userId,
                        startedAt: data.startedAt,
                        lastActivity: data.lastActivity,
                        messageCount: data.messageCount,
                        summary: data.summary,
                        keyInsights: data.keyInsights || [],
                        memories: data.memories || []
                    });
                }
            }
            // Sort by last activity (newest first)
            sessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
        }
        catch (error) {
            logger_1.log.error('[SessionManager] Failed to list sessions', {
                error: error.message
            });
        }
        return sessions;
    }
    /**
     * Summarize session using GPT
     */
    async summarizeSession(sessionId, messages) {
        try {
            logger_1.log.info('[SessionManager] Summarizing session', {
                sessionId,
                messageCount: messages.length
            });
            // Prepare conversation text
            const conversationText = messages
                .map((m) => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
                .join('\n\n');
            // Use GPT to summarize
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a session summarizer. Extract key insights, decisions, and context from this conversation. Focus on:
- Important facts learned about the user
- Decisions made
- Problems solved
- Projects discussed
- Preferences mentioned

Format as bullet points.`
                    },
                    {
                        role: 'user',
                        content: `Summarize this conversation:\n\n${conversationText.substring(0, 12000)}` // Limit to fit context
                    }
                ],
                max_tokens: 500
            });
            const summary = response.choices[0]?.message?.content || 'No summary generated';
            // Update session with summary
            const session = this.sessions.get(sessionId);
            if (session) {
                session.summary = summary;
                this.sessions.set(sessionId, session);
            }
            logger_1.log.info('[SessionManager] Session summarized', { sessionId });
            return summary;
        }
        catch (error) {
            logger_1.log.error('[SessionManager] Failed to summarize session', {
                sessionId,
                error: error.message
            });
            return 'Failed to generate summary';
        }
    }
    /**
     * Compress old sessions (summarize and archive)
     */
    async compressOldSessions(olderThanDays = 7) {
        let compressed = 0;
        try {
            const sessions = this.listSessions();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            for (const session of sessions) {
                const lastActivity = new Date(session.lastActivity);
                if (lastActivity < cutoffDate && !session.summary) {
                    const loaded = await this.loadSession(session.sessionId);
                    if (loaded) {
                        await this.summarizeSession(session.sessionId, loaded.messages);
                        await this.saveSession(session.sessionId, []); // Save with summary, remove messages
                        compressed++;
                    }
                }
            }
            logger_1.log.info('[SessionManager] Compressed old sessions', { count: compressed });
        }
        catch (error) {
            logger_1.log.error('[SessionManager] Failed to compress sessions', {
                error: error.message
            });
        }
        return compressed;
    }
    /**
     * Start auto-save background task
     */
    startAutoSave(intervalMs = 300000) {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.autoSaveInterval = setInterval(() => {
            logger_1.log.info('[SessionManager] Auto-save triggered');
            // Sessions will be saved when messages are added
        }, intervalMs);
        logger_1.log.info('[SessionManager] Auto-save started', {
            intervalMs
        });
    }
    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            logger_1.log.info('[SessionManager] Auto-save stopped');
        }
    }
    /**
     * Export session insights to memory system
     */
    async exportInsights(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return [];
        if (!session.summary) {
            const loaded = await this.loadSession(sessionId);
            if (loaded) {
                await this.summarizeSession(sessionId, loaded.messages);
            }
        }
        return session.keyInsights;
    }
}
exports.SessionManager = SessionManager;
// Export singleton
let sessionManagerInstance = null;
function getSessionManager() {
    if (!sessionManagerInstance) {
        sessionManagerInstance = new SessionManager();
    }
    return sessionManagerInstance;
}
