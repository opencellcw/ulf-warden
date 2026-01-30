"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = void 0;
exports.getMemoryManager = getMemoryManager;
const vector_store_1 = require("./vector-store");
const session_manager_1 = require("./session-manager");
const internet_bridge_1 = require("./internet-bridge");
const types_1 = require("./types");
const logger_1 = require("../logger");
/**
 * Memory Manager
 *
 * Coordinates all memory subsystems:
 * - Vector store for semantic memory
 * - Session manager for conversation context
 * - Internet bridge for web search
 * - Auto-save and compression
 */
class MemoryManager {
    vectorStore = (0, vector_store_1.getVectorStore)();
    sessionManager = (0, session_manager_1.getSessionManager)();
    internetBridge = (0, internet_bridge_1.getInternetBridge)();
    initialized = false;
    async init() {
        if (this.initialized)
            return;
        logger_1.log.info('[MemoryManager] Initializing...');
        // Initialize vector store
        await this.vectorStore.init();
        // Start auto-save
        this.sessionManager.startAutoSave(300000); // 5 minutes
        this.initialized = true;
        logger_1.log.info('[MemoryManager] Initialized successfully');
    }
    /**
     * Store a fact about the user
     */
    async storeFact(content, userId, tags) {
        return await this.vectorStore.store(content, {
            type: types_1.MemoryType.FACT,
            timestamp: new Date().toISOString(),
            userId,
            tags,
            importance: 8,
            source: 'user'
        });
    }
    /**
     * Store a learning/insight
     */
    async storeLearning(content, userId, project) {
        return await this.vectorStore.store(content, {
            type: types_1.MemoryType.LEARNING,
            timestamp: new Date().toISOString(),
            userId,
            project,
            importance: 7,
            source: 'auto'
        });
    }
    /**
     * Store conversation snippet
     */
    async storeConversation(content, userId, sessionId) {
        return await this.vectorStore.store(content, {
            type: types_1.MemoryType.CONVERSATION,
            timestamp: new Date().toISOString(),
            userId,
            tags: sessionId ? [sessionId] : [],
            importance: 5,
            source: 'system'
        });
    }
    /**
     * Store project context
     */
    async storeContext(content, userId, project) {
        return await this.vectorStore.store(content, {
            type: types_1.MemoryType.CONTEXT,
            timestamp: new Date().toISOString(),
            userId,
            project,
            importance: 9,
            source: 'user'
        });
    }
    /**
     * Semantic search across all memories
     */
    async recall(query, userId, limit = 5) {
        const filter = {};
        if (userId) {
            filter.userId = userId;
        }
        return await this.vectorStore.recall(query, limit, filter);
    }
    /**
     * Search memories by type
     */
    async recallByType(query, type, userId, limit = 5) {
        const filter = { type };
        if (userId) {
            filter.userId = userId;
        }
        return await this.vectorStore.recall(query, limit, filter);
    }
    /**
     * Get memory statistics
     */
    async getStats() {
        return await this.vectorStore.getStats();
    }
    /**
     * Create new session
     */
    createSession(userId) {
        return this.sessionManager.createSession(userId);
    }
    /**
     * Save current session
     */
    async saveSession(sessionId, messages) {
        await this.sessionManager.saveSession(sessionId, messages);
    }
    /**
     * Load session
     */
    async loadSession(sessionId) {
        return await this.sessionManager.loadSession(sessionId);
    }
    /**
     * List all sessions
     */
    listSessions() {
        return this.sessionManager.listSessions();
    }
    /**
     * Summarize session and extract insights
     */
    async summarizeSession(sessionId, messages) {
        return await this.sessionManager.summarizeSession(sessionId, messages);
    }
    /**
     * Auto-extract important memories from conversation
     */
    async autoExtractMemories(messages, userId, sessionId) {
        const memoryIds = [];
        try {
            // Get last few messages
            const recentMessages = messages.slice(-5);
            // Look for patterns that indicate important information
            for (const message of recentMessages) {
                if (message.role === 'user') {
                    const content = typeof message.content === 'string' ? message.content : '';
                    // Check for fact-like statements
                    if (content.match(/prefiro|gosto|uso|trabalho|projeto|sempre|nunca/i)) {
                        const id = await this.storeFact(content, userId, ['auto-extracted', sessionId]);
                        memoryIds.push(id);
                        logger_1.log.info('[MemoryManager] Auto-extracted fact', { id });
                    }
                    // Check for learning statements
                    if (content.match(/aprendi|descobri|entendi|percebi|funciona/i)) {
                        const id = await this.storeLearning(content, userId);
                        memoryIds.push(id);
                        logger_1.log.info('[MemoryManager] Auto-extracted learning', { id });
                    }
                }
            }
        }
        catch (error) {
            logger_1.log.error('[MemoryManager] Failed to auto-extract memories', {
                error: error.message
            });
        }
        return memoryIds;
    }
    /**
     * Search the web
     */
    async searchWeb(query, maxResults = 5) {
        return await this.internetBridge.searchWeb(query, maxResults);
    }
    /**
     * Fetch documentation
     */
    async fetchDocs(url) {
        return await this.internetBridge.fetchDocs(url);
    }
    /**
     * Search GitHub for code examples
     */
    async searchGitHub(query, language) {
        return await this.internetBridge.searchGitHub(query, language);
    }
    /**
     * Compress old sessions (background task)
     */
    async compressOldSessions() {
        return await this.sessionManager.compressOldSessions(7);
    }
    /**
     * Shutdown gracefully
     */
    async shutdown() {
        logger_1.log.info('[MemoryManager] Shutting down...');
        this.sessionManager.stopAutoSave();
        await this.sessionManager.compressOldSessions(30); // Compress sessions older than 30 days
        logger_1.log.info('[MemoryManager] Shutdown complete');
    }
}
exports.MemoryManager = MemoryManager;
// Export singleton
let memoryManagerInstance = null;
function getMemoryManager() {
    if (!memoryManagerInstance) {
        memoryManagerInstance = new MemoryManager();
    }
    return memoryManagerInstance;
}
