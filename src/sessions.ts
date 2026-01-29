import { MessageParam } from '@anthropic-ai/sdk/resources/messages';

export interface Session {
  userId: string;
  messages: MessageParam[];
  createdAt: Date;
  lastActivity: Date;
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();

  getOrCreate(userId: string): Session {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        userId,
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date()
      });
      console.log(`[Sessions] Created new session for user: ${userId}`);
    }
    return this.sessions.get(userId)!;
  }

  get(userId: string): Session | undefined {
    return this.sessions.get(userId);
  }

  addMessage(userId: string, message: MessageParam): void {
    const session = this.getOrCreate(userId);
    session.messages.push(message);
    session.lastActivity = new Date();
  }

  getHistory(userId: string): MessageParam[] {
    const session = this.get(userId);
    return session ? session.messages : [];
  }

  clear(userId: string): void {
    this.sessions.delete(userId);
    console.log(`[Sessions] Cleared session for user: ${userId}`);
  }

  getActiveSessions(): number {
    return this.sessions.size;
  }
}

export const sessionManager = new SessionManager();
