import { MessageParam } from '@anthropic-ai/sdk/resources/messages';
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

    // Persist to database (async, non-blocking)
    persistence.saveSession(userId, session).catch(err => {
      console.error('[Sessions] Failed to persist session:', err);
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
}

export const sessionManager = new SessionManager();
