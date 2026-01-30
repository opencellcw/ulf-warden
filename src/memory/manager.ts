import { getVectorStore } from './vector-store';
import { getSessionManager } from './session-manager';
import { getInternetBridge } from './internet-bridge';
import { Memory, MemoryType, MemoryMetadata, SearchResult } from './types';
import { log } from '../logger';
import { MessageParam } from '@anthropic-ai/sdk/resources';

/**
 * Memory Manager
 *
 * Coordinates all memory subsystems:
 * - Vector store for semantic memory
 * - Session manager for conversation context
 * - Internet bridge for web search
 * - Auto-save and compression
 */
export class MemoryManager {
  private vectorStore = getVectorStore();
  private sessionManager = getSessionManager();
  private internetBridge = getInternetBridge();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    log.info('[MemoryManager] Initializing...');

    // Initialize vector store
    await this.vectorStore.init();

    // Start auto-save
    this.sessionManager.startAutoSave(300000); // 5 minutes

    this.initialized = true;

    log.info('[MemoryManager] Initialized successfully');
  }

  /**
   * Store a fact about the user
   */
  async storeFact(content: string, userId: string, tags?: string[]): Promise<string> {
    return await this.vectorStore.store(content, {
      type: MemoryType.FACT,
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
  async storeLearning(content: string, userId: string, project?: string): Promise<string> {
    return await this.vectorStore.store(content, {
      type: MemoryType.LEARNING,
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
  async storeConversation(content: string, userId: string, sessionId?: string): Promise<string> {
    return await this.vectorStore.store(content, {
      type: MemoryType.CONVERSATION,
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
  async storeContext(content: string, userId: string, project: string): Promise<string> {
    return await this.vectorStore.store(content, {
      type: MemoryType.CONTEXT,
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
  async recall(query: string, userId?: string, limit: number = 5): Promise<SearchResult[]> {
    const filter: any = {};

    if (userId) {
      filter.userId = userId;
    }

    return await this.vectorStore.recall(query, limit, filter);
  }

  /**
   * Search memories by type
   */
  async recallByType(query: string, type: MemoryType, userId?: string, limit: number = 5): Promise<SearchResult[]> {
    const filter: any = { type };

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
  createSession(userId: string): string {
    return this.sessionManager.createSession(userId);
  }

  /**
   * Save current session
   */
  async saveSession(sessionId: string, messages: MessageParam[]): Promise<void> {
    await this.sessionManager.saveSession(sessionId, messages);
  }

  /**
   * Load session
   */
  async loadSession(sessionId: string) {
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
  async summarizeSession(sessionId: string, messages: MessageParam[]): Promise<string> {
    return await this.sessionManager.summarizeSession(sessionId, messages);
  }

  /**
   * Auto-extract important memories from conversation
   */
  async autoExtractMemories(messages: MessageParam[], userId: string, sessionId: string): Promise<string[]> {
    const memoryIds: string[] = [];

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
            log.info('[MemoryManager] Auto-extracted fact', { id });
          }

          // Check for learning statements
          if (content.match(/aprendi|descobri|entendi|percebi|funciona/i)) {
            const id = await this.storeLearning(content, userId);
            memoryIds.push(id);
            log.info('[MemoryManager] Auto-extracted learning', { id });
          }
        }
      }
    } catch (error: any) {
      log.error('[MemoryManager] Failed to auto-extract memories', {
        error: error.message
      });
    }

    return memoryIds;
  }

  /**
   * Search the web
   */
  async searchWeb(query: string, maxResults: number = 5) {
    return await this.internetBridge.searchWeb(query, maxResults);
  }

  /**
   * Fetch documentation
   */
  async fetchDocs(url: string) {
    return await this.internetBridge.fetchDocs(url);
  }

  /**
   * Search GitHub for code examples
   */
  async searchGitHub(query: string, language?: string) {
    return await this.internetBridge.searchGitHub(query, language);
  }

  /**
   * Compress old sessions (background task)
   */
  async compressOldSessions(): Promise<number> {
    return await this.sessionManager.compressOldSessions(7);
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    log.info('[MemoryManager] Shutting down...');
    this.sessionManager.stopAutoSave();
    await this.sessionManager.compressOldSessions(30); // Compress sessions older than 30 days
    log.info('[MemoryManager] Shutdown complete');
  }
}

// Export singleton
let memoryManagerInstance: MemoryManager | null = null;

export function getMemoryManager(): MemoryManager {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManager();
  }
  return memoryManagerInstance;
}
