import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../logger';
import { SessionContext } from './types';
import { MessageParam } from '@anthropic-ai/sdk/resources';
import OpenAI from 'openai';

/**
 * Session Manager
 *
 * Manages conversation sessions with auto-save and context compression
 */
export class SessionManager {
  private sessions: Map<string, SessionContext> = new Map();
  private sessionsDir: string;
  private openai: OpenAI;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionsDir = path.join(process.env.DATA_DIR || './data', 'sessions');

    // Ensure sessions directory exists
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }

    // Initialize OpenAI for summarization
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    log.info('[SessionManager] Initialized', { sessionsDir: this.sessionsDir });
  }

  /**
   * Create new session
   */
  createSession(userId: string): string {
    const sessionId = uuidv4();

    const session: SessionContext = {
      sessionId,
      userId,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messageCount: 0,
      keyInsights: [],
      memories: []
    };

    this.sessions.set(sessionId, session);

    log.info('[SessionManager] Session created', { sessionId, userId });

    return sessionId;
  }

  /**
   * Update session activity
   */
  updateSession(sessionId: string, messageCount?: number, insights?: string[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

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
  async saveSession(sessionId: string, messages: MessageParam[]): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      log.warn('[SessionManager] Session not found', { sessionId });
      return;
    }

    try {
      const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);

      const data = {
        ...session,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        }))
      };

      fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2), 'utf-8');

      log.info('[SessionManager] Session saved', {
        sessionId,
        messageCount: messages.length
      });
    } catch (error: any) {
      log.error('[SessionManager] Failed to save session', {
        sessionId,
        error: error.message
      });
    }
  }

  /**
   * Load session from disk
   */
  async loadSession(sessionId: string): Promise<{
    session: SessionContext;
    messages: MessageParam[];
  } | null> {
    try {
      const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);

      if (!fs.existsSync(sessionFile)) {
        log.warn('[SessionManager] Session file not found', { sessionId });
        return null;
      }

      const data = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));

      const session: SessionContext = {
        sessionId: data.sessionId,
        userId: data.userId,
        startedAt: data.startedAt,
        lastActivity: data.lastActivity,
        messageCount: data.messageCount,
        summary: data.summary,
        keyInsights: data.keyInsights || [],
        memories: data.memories || []
      };

      const messages: MessageParam[] = (data.messages || []).map((m: any) => ({
        role: m.role,
        content: m.content
      }));

      this.sessions.set(sessionId, session);

      log.info('[SessionManager] Session loaded', {
        sessionId,
        messageCount: messages.length
      });

      return { session, messages };
    } catch (error: any) {
      log.error('[SessionManager] Failed to load session', {
        sessionId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * List all sessions
   */
  listSessions(): SessionContext[] {
    const sessions: SessionContext[] = [];

    try {
      const files = fs.readdirSync(this.sessionsDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.sessionsDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

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
      sessions.sort((a, b) =>
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
    } catch (error: any) {
      log.error('[SessionManager] Failed to list sessions', {
        error: error.message
      });
    }

    return sessions;
  }

  /**
   * Summarize session using GPT
   */
  async summarizeSession(sessionId: string, messages: MessageParam[]): Promise<string> {
    try {
      log.info('[SessionManager] Summarizing session', {
        sessionId,
        messageCount: messages.length
      });

      // Prepare conversation text
      const conversationText = messages
        .map((m: any) => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
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

      log.info('[SessionManager] Session summarized', { sessionId });

      return summary;
    } catch (error: any) {
      log.error('[SessionManager] Failed to summarize session', {
        sessionId,
        error: error.message
      });
      return 'Failed to generate summary';
    }
  }

  /**
   * Compress old sessions (summarize and archive)
   */
  async compressOldSessions(olderThanDays: number = 7): Promise<number> {
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

      log.info('[SessionManager] Compressed old sessions', { count: compressed });
    } catch (error: any) {
      log.error('[SessionManager] Failed to compress sessions', {
        error: error.message
      });
    }

    return compressed;
  }

  /**
   * Start auto-save background task
   */
  startAutoSave(intervalMs: number = 300000): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      log.info('[SessionManager] Auto-save triggered');
      // Sessions will be saved when messages are added
    }, intervalMs);

    log.info('[SessionManager] Auto-save started', {
      intervalMs
    });
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      log.info('[SessionManager] Auto-save stopped');
    }
  }

  /**
   * Export session insights to memory system
   */
  async exportInsights(sessionId: string): Promise<string[]> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    if (!session.summary) {
      const loaded = await this.loadSession(sessionId);
      if (loaded) {
        await this.summarizeSession(sessionId, loaded.messages);
      }
    }

    return session.keyInsights;
  }
}

// Export singleton
let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}
