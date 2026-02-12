import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export class Memory {
  private db: Database.Database;
  private sessionId: string;
  
  constructor(sessionId?: string) {
    const dbPath = join(homedir(), '.opencell', 'memory.db');
    this.db = new Database(dbPath);
    this.sessionId = sessionId || this.getCurrentSession();
    
    this.init();
  }
  
  private init() {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        last_active INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_session 
      ON messages(session_id, timestamp);
    `);
    
    // Create or update current session
    const now = Date.now();
    this.db.prepare(`
      INSERT OR REPLACE INTO sessions (id, created_at, last_active)
      VALUES (?, ?, ?)
    `).run(this.sessionId, now, now);
  }
  
  private getCurrentSession(): string {
    const today = new Date().toISOString().split('T')[0];
    return `session-${today}`;
  }
  
  addMessage(role: 'user' | 'assistant' | 'system', content: string) {
    const timestamp = Date.now();
    
    this.db.prepare(`
      INSERT INTO messages (session_id, role, content, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(this.sessionId, role, content, timestamp);
    
    // Update session last_active
    this.db.prepare(`
      UPDATE sessions SET last_active = ? WHERE id = ?
    `).run(timestamp, this.sessionId);
  }
  
  getHistory(limit = 50): Message[] {
    const rows = this.db.prepare(`
      SELECT role, content, timestamp
      FROM messages
      WHERE session_id = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `).all(this.sessionId, limit);
    
    return rows as Message[];
  }
  
  getRecentMessages(count = 10): Message[] {
    const rows = this.db.prepare(`
      SELECT role, content, timestamp
      FROM messages
      WHERE session_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(this.sessionId, count);
    
    return (rows as Message[]).reverse();
  }
  
  clear() {
    this.db.prepare(`
      DELETE FROM messages WHERE session_id = ?
    `).run(this.sessionId);
  }
  
  clearAll() {
    this.db.exec('DELETE FROM messages; DELETE FROM sessions;');
  }
  
  getSessions(limit = 20): Array<{ id: string; created_at: number; last_active: number; count: number }> {
    const rows = this.db.prepare(`
      SELECT 
        s.id,
        s.created_at,
        s.last_active,
        COUNT(m.id) as count
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      GROUP BY s.id
      ORDER BY s.last_active DESC
      LIMIT ?
    `).all(limit);
    
    return rows as any[];
  }
  
  switchSession(sessionId: string) {
    this.sessionId = sessionId;
  }
  
  close() {
    this.db.close();
  }
}
