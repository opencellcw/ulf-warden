"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = exports.DatabaseManager = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class DatabaseManager {
    db = null;
    config;
    constructor(config) {
        this.config = {
            dataDir: config?.dataDir || process.env.DATA_DIR || './data',
            filename: config?.filename || 'ulf.db'
        };
    }
    async init() {
        try {
            // Ensure data directory exists
            if (!fs_1.default.existsSync(this.config.dataDir)) {
                fs_1.default.mkdirSync(this.config.dataDir, { recursive: true });
                console.log(`[Database] Created data directory: ${this.config.dataDir}`);
            }
            const dbPath = path_1.default.join(this.config.dataDir, this.config.filename);
            this.db = new better_sqlite3_1.default(dbPath);
            // Enable WAL mode for better concurrency
            this.db.pragma('journal_mode = WAL');
            console.log(`[Database] Connected to SQLite database: ${dbPath}`);
            // Create tables
            this.createTables();
            console.log('[Database] ✓ Database initialized');
        }
        catch (error) {
            console.error('[Database] Failed to initialize:', error);
            throw error;
        }
    }
    createTables() {
        if (!this.db)
            throw new Error('Database not initialized');
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
    getDb() {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
        return this.db;
    }
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('[Database] Connection closed');
        }
    }
    // Session operations
    saveSession(userId, messages, createdAt, lastActivity) {
        const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO sessions (userId, messages, createdAt, lastActivity)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(userId, messages, createdAt, lastActivity);
    }
    loadSession(userId) {
        const stmt = this.getDb().prepare('SELECT * FROM sessions WHERE userId = ?');
        return stmt.get(userId);
    }
    getAllSessions() {
        const stmt = this.getDb().prepare('SELECT * FROM sessions');
        return stmt.all();
    }
    // Memory operations
    saveDailyLog(date, content, type = 'daily_log', tags) {
        const stmt = this.getDb().prepare(`
      INSERT INTO memories (date, content, type, tags, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
        stmt.run(date, content, type, tags || null, new Date().toISOString());
    }
    getDailyLog(date) {
        const stmt = this.getDb().prepare('SELECT * FROM memories WHERE date = ? AND type = ?');
        return stmt.get(date, 'daily_log');
    }
    searchMemories(query, limit = 50) {
        const stmt = this.getDb().prepare(`
      SELECT * FROM memories
      WHERE content LIKE ?
      ORDER BY createdAt DESC
      LIMIT ?
    `);
        return stmt.all(`%${query}%`, limit);
    }
    // Tool execution operations
    logToolExecution(userId, toolName, input, output, status, errorMessage) {
        const stmt = this.getDb().prepare(`
      INSERT INTO tool_executions (userId, toolName, input, output, timestamp, status, errorMessage)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(userId, toolName, input, output, new Date().toISOString(), status, errorMessage || null);
    }
    getToolHistory(userId, limit = 20) {
        const stmt = this.getDb().prepare(`
      SELECT * FROM tool_executions
      WHERE userId = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
        return stmt.all(userId, limit);
    }
    getIncompleteToolExecutions() {
        const stmt = this.getDb().prepare(`
      SELECT * FROM tool_executions
      WHERE status = 'running'
      ORDER BY timestamp DESC
    `);
        return stmt.all();
    }
    // Config operations
    getConfig(key) {
        const stmt = this.getDb().prepare('SELECT value FROM config WHERE key = ?');
        const result = stmt.get(key);
        return result?.value || null;
    }
    getAllConfig() {
        const stmt = this.getDb().prepare('SELECT key, value FROM config');
        const rows = stmt.all();
        return Object.fromEntries(rows.map(row => [row.key, row.value]));
    }
    saveConfig(key, value) {
        const stmt = this.getDb().prepare(`
      INSERT OR REPLACE INTO config (key, value, updatedAt)
      VALUES (?, ?, ?)
    `);
        stmt.run(key, value, new Date().toISOString());
    }
}
exports.DatabaseManager = DatabaseManager;
// Singleton instance
exports.database = new DatabaseManager();
