"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionManager = void 0;
const persistence_1 = require("./persistence");
const daily_logs_1 = require("./persistence/daily-logs");
const memory_curator_1 = require("./persistence/memory-curator");
class SessionManager {
    sessions = new Map();
    initialized = false;
    async init() {
        if (this.initialized)
            return;
        try {
            // Load all sessions from database
            const sessions = await persistence_1.persistence.getAllSessions();
            for (const session of sessions) {
                this.sessions.set(session.userId, session);
            }
            console.log(`[Sessions] ✓ Loaded ${sessions.length} sessions from database`);
            this.initialized = true;
        }
        catch (error) {
            console.error('[Sessions] Failed to load sessions:', error);
        }
    }
    async getOrCreate(userId) {
        // Ensure initialized
        if (!this.initialized) {
            await this.init();
        }
        // Try in-memory cache first
        if (this.sessions.has(userId)) {
            return this.sessions.get(userId);
        }
        // Try to load from database
        const loadedSession = await persistence_1.persistence.loadSession(userId);
        if (loadedSession) {
            this.sessions.set(userId, loadedSession);
            console.log(`[Sessions] Loaded session from database for user: ${userId}`);
            return loadedSession;
        }
        // Create new session
        const newSession = {
            userId,
            messages: [],
            createdAt: new Date(),
            lastActivity: new Date()
        };
        this.sessions.set(userId, newSession);
        console.log(`[Sessions] Created new session for user: ${userId}`);
        // Save immediately
        await persistence_1.persistence.saveSession(userId, newSession);
        return newSession;
    }
    get(userId) {
        return this.sessions.get(userId);
    }
    async addMessage(userId, message) {
        const session = await this.getOrCreate(userId);
        session.messages.push(message);
        session.lastActivity = new Date();
        // Keep only last 50 messages to avoid memory issues
        if (session.messages.length > 50) {
            session.messages = session.messages.slice(-50);
        }
        // Persist to database (async, non-blocking)
        persistence_1.persistence.saveSession(userId, session).catch(err => {
            console.error('[Sessions] Failed to persist session:', err);
        });
        // Log to daily log (async, non-blocking)
        daily_logs_1.dailyLog.logConversation(userId, message).catch(err => {
            console.error('[Sessions] Failed to log conversation:', err);
        });
        // Increment conversation count for memory curation
        if (typeof message === 'object' && 'role' in message && message.role === 'user') {
            memory_curator_1.memoryCurator.incrementConversationCount();
        }
    }
    async getHistory(userId) {
        const session = await this.getOrCreate(userId);
        return session.messages;
    }
    async clear(userId) {
        this.sessions.delete(userId);
        console.log(`[Sessions] Cleared session for user: ${userId}`);
    }
    getActiveSessions() {
        return this.sessions.size;
    }
    async flushAll() {
        console.log('[Sessions] Flushing all sessions to database...');
        const promises = [];
        for (const [userId, session] of this.sessions.entries()) {
            promises.push(persistence_1.persistence.saveSession(userId, session));
        }
        await Promise.all(promises);
        console.log(`[Sessions] ✓ Flushed ${promises.length} sessions`);
    }
}
exports.sessionManager = new SessionManager();
