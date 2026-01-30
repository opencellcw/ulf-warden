import { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { Session } from '../sessions';
import { database, DatabaseManager } from './database';
import fs from 'fs';
import path from 'path';

export interface Memory {
  id: number;
  date: string;
  content: string;
  type: string;
  tags?: string;
  createdAt: string;
}

export interface ToolExecution {
  id?: number;
  userId: string;
  toolName: string;
  input: string;
  output: string | null;
  timestamp: string;
  status: 'running' | 'success' | 'error';
  errorMessage?: string;
}

export interface PersistenceLayer {
  // Initialization
  init(): Promise<void>;
  close(): Promise<void>;

  // Sessions
  saveSession(userId: string, session: Session): Promise<void>;
  loadSession(userId: string): Promise<Session | null>;
  getAllSessions(): Promise<Session[]>;

  // Memories
  saveDailyLog(date: string, content: string): Promise<void>;
  getDailyLog(date: string): Promise<string | null>;
  updateMemory(content: string): Promise<void>;
  getMemory(): Promise<string>;
  searchMemories(query: string): Promise<Memory[]>;

  // Tool executions (audit trail)
  logToolExecution(exec: ToolExecution): Promise<void>;
  getToolHistory(userId: string, limit?: number): Promise<ToolExecution[]>;
  getIncompleteToolExecutions(): Promise<ToolExecution[]>;
}

export class SQLitePersistence implements PersistenceLayer {
  private db: DatabaseManager;
  private fallbackDir: string;

  constructor(db: DatabaseManager, fallbackDir: string = './data/fallback') {
    this.db = db;
    this.fallbackDir = fallbackDir;
  }

  async init(): Promise<void> {
    try {
      await this.db.init();
    } catch (error) {
      console.error('[Persistence] Database initialization failed, using fallback');
      // Ensure fallback directory exists
      if (!fs.existsSync(this.fallbackDir)) {
        fs.mkdirSync(this.fallbackDir, { recursive: true });
      }
    }
  }

  async close(): Promise<void> {
    await this.db.close();
  }

  // Sessions
  async saveSession(userId: string, session: Session): Promise<void> {
    try {
      const messages = JSON.stringify(session.messages);
      const createdAt = session.createdAt.toISOString();
      const lastActivity = session.lastActivity.toISOString();

      this.db.saveSession(userId, messages, createdAt, lastActivity);
    } catch (error) {
      console.error('[Persistence] Failed to save session, using fallback:', error);
      await this.fallbackSaveSession(userId, session);
    }
  }

  async loadSession(userId: string): Promise<Session | null> {
    try {
      const row = this.db.loadSession(userId);
      if (!row) return null;

      return {
        userId: row.userId,
        messages: JSON.parse(row.messages),
        createdAt: new Date(row.createdAt),
        lastActivity: new Date(row.lastActivity)
      };
    } catch (error) {
      console.error('[Persistence] Failed to load session, trying fallback:', error);
      return await this.fallbackLoadSession(userId);
    }
  }

  async getAllSessions(): Promise<Session[]> {
    try {
      const rows = this.db.getAllSessions();
      return rows.map(row => ({
        userId: row.userId,
        messages: JSON.parse(row.messages),
        createdAt: new Date(row.createdAt),
        lastActivity: new Date(row.lastActivity)
      }));
    } catch (error) {
      console.error('[Persistence] Failed to load all sessions:', error);
      return [];
    }
  }

  // Memories
  async saveDailyLog(date: string, content: string): Promise<void> {
    try {
      // Save to database
      this.db.saveDailyLog(date, content, 'daily_log');

      // Also save to file for easy reading
      const memoryDir = path.join('./workspace/memory');
      if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
      }

      const logPath = path.join(memoryDir, `${date}.md`);

      // Append to existing log or create new
      if (fs.existsSync(logPath)) {
        fs.appendFileSync(logPath, `\n${content}\n`);
      } else {
        const header = `# ${date}\n\n`;
        fs.writeFileSync(logPath, header + content + '\n');
      }
    } catch (error) {
      console.error('[Persistence] Failed to save daily log:', error);
    }
  }

  async getDailyLog(date: string): Promise<string | null> {
    try {
      const row = this.db.getDailyLog(date);
      return row?.content || null;
    } catch (error) {
      console.error('[Persistence] Failed to get daily log:', error);
      return null;
    }
  }

  async updateMemory(content: string): Promise<void> {
    try {
      const memoryPath = path.join('./workspace', 'MEMORY.md');
      const current = fs.existsSync(memoryPath)
        ? fs.readFileSync(memoryPath, 'utf-8')
        : '';

      const updated = current ? `${current}\n\n${content}` : content;
      fs.writeFileSync(memoryPath, updated, 'utf-8');

      // Also save to database
      const date = new Date().toISOString().split('T')[0];
      this.db.saveDailyLog(date, content, 'curated');
    } catch (error) {
      console.error('[Persistence] Failed to update memory:', error);
    }
  }

  async getMemory(): Promise<string> {
    try {
      const memoryPath = path.join('./workspace', 'MEMORY.md');
      if (fs.existsSync(memoryPath)) {
        return fs.readFileSync(memoryPath, 'utf-8');
      }
      return '';
    } catch (error) {
      console.error('[Persistence] Failed to get memory:', error);
      return '';
    }
  }

  async searchMemories(query: string): Promise<Memory[]> {
    try {
      return this.db.searchMemories(query);
    } catch (error) {
      console.error('[Persistence] Failed to search memories:', error);
      return [];
    }
  }

  // Tool executions
  async logToolExecution(exec: ToolExecution): Promise<void> {
    try {
      this.db.logToolExecution(
        exec.userId,
        exec.toolName,
        exec.input,
        exec.output,
        exec.status,
        exec.errorMessage
      );
    } catch (error) {
      console.error('[Persistence] Failed to log tool execution:', error);
    }
  }

  async getToolHistory(userId: string, limit: number = 20): Promise<ToolExecution[]> {
    try {
      return this.db.getToolHistory(userId, limit);
    } catch (error) {
      console.error('[Persistence] Failed to get tool history:', error);
      return [];
    }
  }

  async getIncompleteToolExecutions(): Promise<ToolExecution[]> {
    try {
      return this.db.getIncompleteToolExecutions();
    } catch (error) {
      console.error('[Persistence] Failed to get incomplete tool executions:', error);
      return [];
    }
  }

  // Fallback methods using JSON files
  private async fallbackSaveSession(userId: string, session: Session): Promise<void> {
    const filePath = path.join(this.fallbackDir, `session_${userId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
  }

  private async fallbackLoadSession(userId: string): Promise<Session | null> {
    const filePath = path.join(this.fallbackDir, `session_${userId}.json`);
    if (!fs.existsSync(filePath)) return null;

    const data = fs.readFileSync(filePath, 'utf-8');
    const session = JSON.parse(data);

    // Convert date strings back to Date objects
    session.createdAt = new Date(session.createdAt);
    session.lastActivity = new Date(session.lastActivity);

    return session;
  }
}

// Singleton instance
export const persistence = new SQLitePersistence(database);
