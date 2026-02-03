"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.botRegistry = exports.BotRegistry = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("../logger");
class BotRegistry {
    db;
    constructor() {
        const dbPath = path_1.default.join(process.env.DATA_DIR || './data', 'ulf.db');
        // Ensure data directory exists
        const dir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        this.db = new better_sqlite3_1.default(dbPath);
        this.initTable();
    }
    initTable() {
        const schema = `
      CREATE TABLE IF NOT EXISTS bots (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        personality TEXT NOT NULL,
        creator_discord_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'deploying',
        helm_release_name TEXT NOT NULL,
        deployment_config TEXT NOT NULL,
        last_health_check TIMESTAMP
      );
    `;
        this.db.exec(schema);
        logger_1.log.info('[BotRegistry] Database initialized');
    }
    async createBot(id, name, personality, creatorDiscordId, config) {
        const bot = {
            id,
            name,
            personality,
            creatorDiscordId,
            createdAt: new Date().toISOString(),
            status: 'deploying',
            helmReleaseName: id,
            deploymentConfig: JSON.stringify(config)
        };
        this.db.prepare(`
      INSERT INTO bots (
        id, name, personality, creator_discord_id, created_at,
        status, helm_release_name, deployment_config
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(bot.id, bot.name, bot.personality, bot.creatorDiscordId, bot.createdAt, bot.status, bot.helmReleaseName, bot.deploymentConfig);
        logger_1.log.info('[BotRegistry] Bot registered', { id, name });
        return bot;
    }
    async exists(name) {
        const result = this.db.prepare('SELECT COUNT(*) as count FROM bots WHERE name = ?').get(name);
        return result.count > 0;
    }
    async getBot(id) {
        const row = this.db.prepare('SELECT * FROM bots WHERE id = ?').get(id);
        return row ? this.rowToBot(row) : null;
    }
    async getBotByName(name) {
        const row = this.db.prepare('SELECT * FROM bots WHERE name = ?').get(name);
        return row ? this.rowToBot(row) : null;
    }
    async listBots() {
        const rows = this.db.prepare('SELECT * FROM bots ORDER BY created_at DESC').all();
        return rows.map(row => this.rowToBot(row));
    }
    async updateStatus(id, status) {
        this.db.prepare('UPDATE bots SET status = ? WHERE id = ?').run(status, id);
        logger_1.log.info('[BotRegistry] Bot status updated', { id, status });
    }
    async updateHealthCheck(id) {
        this.db.prepare('UPDATE bots SET last_health_check = ? WHERE id = ?')
            .run(new Date().toISOString(), id);
    }
    async deleteBot(id) {
        this.db.prepare('DELETE FROM bots WHERE id = ?').run(id);
        logger_1.log.info('[BotRegistry] Bot deleted from registry', { id });
    }
    async countBotsByCreator(creatorDiscordId) {
        const result = this.db.prepare('SELECT COUNT(*) as count FROM bots WHERE creator_discord_id = ?').get(creatorDiscordId);
        return result.count;
    }
    rowToBot(row) {
        return {
            id: row.id,
            name: row.name,
            personality: row.personality,
            creatorDiscordId: row.creator_discord_id,
            createdAt: row.created_at,
            status: row.status,
            helmReleaseName: row.helm_release_name,
            deploymentConfig: row.deployment_config,
            lastHealthCheck: row.last_health_check
        };
    }
}
exports.BotRegistry = BotRegistry;
// Singleton instance
exports.botRegistry = new BotRegistry();
