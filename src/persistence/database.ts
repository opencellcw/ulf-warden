import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface DatabaseConfig {
  dataDir: string;
  filename: string;
}

export class DatabaseManager {
  private db: Database.Database | null = null;
  private config: DatabaseConfig;

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = {
      dataDir: config?.dataDir || process.env.DATA_DIR || './data',
      filename: config?.filename || 'ulf.db'
    };
  }

  async init(): Promise<void> {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.config.dataDir)) {
        fs.mkdirSync(this.config.dataDir, { recursive: true });
        console.log(`[Database] Created data directory: ${this.config.dataDir}`);
      }

      const dbPath = path.join(this.config.dataDir, this.config.filename);
      this.db = new Database(dbPath);

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      console.log(`[Database] Connected to SQLite database: ${dbPath}`);

      // Create tables
      this.createTables();

      console.log('[Database] ✓ Database initialized');
    } catch (error) {
      console.error('[Database] Failed to initialize:', error);
      throw error;
    }
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        userId TEXT PRIMARY KEY,
        messages TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        lastActivity TEXT NOT NULL
      )
    `);

    // Memories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        tags TEXT,
        createdAt TEXT NOT NULL
      )
    `);

    // Create index on date for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date)
    `);

    // Tool executions table (audit trail)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tool_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        toolName TEXT NOT NULL,
        input TEXT NOT NULL,
        output TEXT,
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL,
        errorMessage TEXT
      )
    `);

    // Create index on userId and timestamp
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tool_executions_user ON tool_executions(userId)
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tool_executions_timestamp ON tool_executions(timestamp)
    `);

    // Config table for dynamic configuration
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    console.log('[Database] ✓ Tables created/verified');
  }

  getDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[Database] Connection closed');
    }
  }

  // Session operations
  saveSession(userId: string, messages: string, createdAt: string, lastActivity: string): void {
    const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO sessions (userId, messages, createdAt, lastActivity)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(userId, messages, createdAt, lastActivity);
  }

  loadSession(userId: string): any | null {
    const stmt = this.getDb().prepare('SELECT * FROM sessions WHERE userId = ?');
    return stmt.get(userId);
  }

  getAllSessions(): any[] {
    const stmt = this.getDb().prepare('SELECT * FROM sessions');
    return stmt.all();
  }

  // Memory operations
  saveDailyLog(date: string, content: string, type: string = 'daily_log', tags?: string): void {
    const stmt = this.getDb().prepare(`
      INSERT INTO memories (date, content, type, tags, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(date, content, type, tags || null, new Date().toISOString());
  }

  getDailyLog(date: string): any | null {
    const stmt = this.getDb().prepare('SELECT * FROM memories WHERE date = ? AND type = ?');
    return stmt.get(date, 'daily_log');
  }

  searchMemories(query: string, limit: number = 50): any[] {
    const stmt = this.getDb().prepare(`
      SELECT * FROM memories
      WHERE content LIKE ?
      ORDER BY createdAt DESC
      LIMIT ?
    `);
    return stmt.all(`%${query}%`, limit);
  }

  // Tool execution operations
  logToolExecution(
    userId: string,
    toolName: string,
    input: string,
    output: string | null,
    status: string,
    errorMessage?: string
  ): void {
    const stmt = this.getDb().prepare(`
      INSERT INTO tool_executions (userId, toolName, input, output, timestamp, status, errorMessage)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      userId,
      toolName,
      input,
      output,
      new Date().toISOString(),
      status,
      errorMessage || null
    );
  }

  getToolHistory(userId: string, limit: number = 20): any[] {
    const stmt = this.getDb().prepare(`
      SELECT * FROM tool_executions
      WHERE userId = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  }

  getIncompleteToolExecutions(): any[] {
    const stmt = this.getDb().prepare(`
      SELECT * FROM tool_executions
      WHERE status = 'running'
      ORDER BY timestamp DESC
    `);
    return stmt.all();
  }

  // Config operations
  getConfig(key: string): string | null {
    const stmt = this.getDb().prepare('SELECT value FROM config WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value || null;
  }

  getAllConfig(): Record<string, string> {
    const stmt = this.getDb().prepare('SELECT key, value FROM config');
    const rows = stmt.all() as Array<{ key: string; value: string }>;
    return Object.fromEntries(rows.map(row => [row.key, row.value]));
  }

  saveConfig(key: string, value: string): void {
    const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO config (key, value, updatedAt)
      VALUES (?, ?, ?)
    `);
    stmt.run(key, value, new Date().toISOString());
  }
}

// Singleton instance
export const database = new DatabaseManager();
