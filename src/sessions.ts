import { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { intervalManager } from './utils/interval-manager';
import { persistence } from './persistence';
import { dailyLog } from './persistence/daily-logs';
import { memoryCurator } from './persistence/memory-curator';

export interface Session {
  userId: string;
  messages: MessageParam[];
  createdAt: Date;
  lastActivity: Date;
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private initialized: boolean = false;
  private autoFlushInterval: NodeJS.Timeout | null = null;
  private flushThreshold: number = 10; // Flush after N messages
  private idleThreshold: number = 5 * 60 * 1000; // 5 minutes idle = flush
  private gcInterval: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load all sessions from database
      const sessions = await persistence.getAllSessions();
      for (const session of sessions) {
        this.sessions.set(session.userId, session);
      }
      console.log(`[Sessions] ✓ Loaded ${sessions.length} sessions from database`);
      this.initialized = true;
    } catch (error) {
      console.error('[Sessions] Failed to load sessions:', error);
    }
  }

  async getOrCreate(userId: string): Promise<Session> {
    // Ensure initialized
    if (!this.initialized) {
      await this.init();
    }

    // Try in-memory cache first
    if (this.sessions.has(userId)) {
      return this.sessions.get(userId)!;
    }

    // Try to load from database
    const loadedSession = await persistence.loadSession(userId);
    if (loadedSession) {
      this.sessions.set(userId, loadedSession);
      console.log(`[Sessions] Loaded session from database for user: ${userId}`);
      return loadedSession;
    }

    // Create new session
    const newSession: Session = {
      userId,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };
    this.sessions.set(userId, newSession);
    console.log(`[Sessions] Created new session for user: ${userId}`);

    // Save immediately
    await persistence.saveSession(userId, newSession);

    return newSession;
  }

  get(userId: string): Session | undefined {
    return this.sessions.get(userId);
  }

  async addMessage(userId: string, message: MessageParam): Promise<void> {
    const session = await this.getOrCreate(userId);
    session.messages.push(message);
    session.lastActivity = new Date();

    // Keep only last 50 messages to avoid memory issues
    if (session.messages.length > 50) {
      session.messages = session.messages.slice(-50);
    }

    // Smart flush (conditional, based on criteria)
    this.smartFlush(userId, session).catch(err => {
      console.error('[Sessions] Smart flush failed:', err);
    });

    // Log to daily log (async, non-blocking)
    dailyLog.logConversation(userId, message).catch(err => {
      console.error('[Sessions] Failed to log conversation:', err);
    });

    // Increment conversation count for memory curation
    if (typeof message === 'object' && 'role' in message && message.role === 'user') {
      memoryCurator.incrementConversationCount();
    }
  }

  async getHistory(userId: string): Promise<MessageParam[]> {
    const session = await this.getOrCreate(userId);
    return session.messages;
  }

  async clear(userId: string): Promise<void> {
    this.sessions.delete(userId);
    console.log(`[Sessions] Cleared session for user: ${userId}`);
  }

  getActiveSessions(): number {
    return this.sessions.size;
  }

  async flushAll(): Promise<void> {
    console.log('[Sessions] Flushing all sessions to database...');
    const promises: Promise<void>[] = [];

    for (const [userId, session] of this.sessions.entries()) {
      promises.push(persistence.saveSession(userId, session));
    }

    await Promise.all(promises);
    console.log(`[Sessions] ✓ Flushed ${promises.length} sessions`);
  }

  /**
   * Start auto-flush: periodically save sessions to persistent storage
   */
  startAutoFlush(intervalMs: number = 60000): void {
    if (this.autoFlushInterval) {
      intervalManager.clear('session-auto-flush');
    }

    this.autoFlushInterval = intervalManager.register('session-auto-flush', async () => {
      try {
        await this.flushAll();
        console.log('[Sessions] Auto-flush completed');
      } catch (error) {
        console.error('[Sessions] Auto-flush failed:', error);
      }
    }, intervalMs);

    console.log(`[Sessions] ✓ Auto-flush started (interval: ${intervalMs}ms = ${intervalMs / 1000}s)`);
  }

  /**
   * Stop auto-flush
   */
  stopAutoFlush(): void {
    if (this.autoFlushInterval) {
      intervalManager.clear('session-auto-flush');
      this.autoFlushInterval = null;
      console.log('[Sessions] Auto-flush stopped');
    }
  }

  /**
   * Smart flush: flush session if it meets criteria
   */
  private async smartFlush(userId: string, session: Session): Promise<void> {
    const messageCount = session.messages.length;
    const idleTime = Date.now() - session.lastActivity.getTime();

    // Flush if message threshold reached
    if (messageCount >= this.flushThreshold && messageCount % this.flushThreshold === 0) {
      console.log(`[Sessions] Smart flush: ${userId} (${messageCount} messages)`);
      await persistence.saveSession(userId, session);
    }

    // Flush if idle for too long
    if (idleTime >= this.idleThreshold) {
      console.log(`[Sessions] Smart flush: ${userId} (idle ${Math.round(idleTime / 1000)}s)`);
      await persistence.saveSession(userId, session);
    }
  }

  /**
   * Start garbage collection: clean up old sessions
   */
  startGarbageCollection(intervalMs: number = 3600000, maxAgeHours: number = 24): void {
    if (this.gcInterval) {
      intervalManager.clear('session-gc');
    }

    this.gcInterval = intervalManager.register('session-gc', async () => {
      try {
        await this.collectGarbage(maxAgeHours);
      } catch (error) {
        console.error('[Sessions] Garbage collection failed:', error);
      }
    }, intervalMs);

    console.log(`[Sessions] ✓ Garbage collection started (interval: ${intervalMs / 1000 / 60}min, max age: ${maxAgeHours}h)`);
  }

  /**
   * Stop garbage collection
   */
  stopGarbageCollection(): void {
    if (this.gcInterval) {
      intervalManager.clear('session-gc');
      this.gcInterval = null;
      console.log('[Sessions] Garbage collection stopped');
    }
  }

  /**
   * Collect garbage: remove old inactive sessions
   */
  private async collectGarbage(maxAgeHours: number): Promise<number> {
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    let collected = 0;

    for (const [userId, session] of this.sessions.entries()) {
      const age = now - session.lastActivity.getTime();

      if (age > maxAge) {
        // Flush before removing
        await persistence.saveSession(userId, session);
        this.sessions.delete(userId);
        collected++;
        console.log(`[Sessions] GC: Removed old session ${userId} (age: ${Math.round(age / 1000 / 60)}min)`);
      }
    }

    if (collected > 0) {
      console.log(`[Sessions] ✓ Garbage collection: removed ${collected} old sessions`);
    }

    return collected;
  }

  /**
   * Shutdown gracefully: flush all and stop timers
   */
  async shutdown(): Promise<void> {
    console.log('[Sessions] Shutting down...');

    // Stop timers
    this.stopAutoFlush();
    this.stopGarbageCollection();

    // Final flush
    await this.flushAll();

    console.log('[Sessions] ✓ Shutdown complete');
  }
}

export const sessionManager = new SessionManager();
