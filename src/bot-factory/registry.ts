import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Bot, BotStatus, BotConfig } from './types';
import { log } from '../logger';

export class BotRegistry {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(process.env.DATA_DIR || './data', 'ulf.db');

    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initTable();
  }

  private initTable(): void {
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
    log.info('[BotRegistry] Database initialized');
  }

  async createBot(
    id: string,
    name: string,
    personality: string,
    creatorDiscordId: string,
    config: BotConfig
  ): Promise<Bot> {
    const bot: Bot = {
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
    `).run(
      bot.id,
      bot.name,
      bot.personality,
      bot.creatorDiscordId,
      bot.createdAt,
      bot.status,
      bot.helmReleaseName,
      bot.deploymentConfig
    );

    log.info('[BotRegistry] Bot registered', { id, name });
    return bot;
  }

  async exists(name: string): Promise<boolean> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM bots WHERE name = ?').get(name) as any;
    return result.count > 0;
  }

  async getBot(id: string): Promise<Bot | null> {
    const row = this.db.prepare('SELECT * FROM bots WHERE id = ?').get(id) as any;
    return row ? this.rowToBot(row) : null;
  }

  async getBotByName(name: string): Promise<Bot | null> {
    const row = this.db.prepare('SELECT * FROM bots WHERE name = ?').get(name) as any;
    return row ? this.rowToBot(row) : null;
  }

  async listBots(): Promise<Bot[]> {
    const rows = this.db.prepare('SELECT * FROM bots ORDER BY created_at DESC').all() as any[];
    return rows.map(row => this.rowToBot(row));
  }

  async updateStatus(id: string, status: BotStatus): Promise<void> {
    this.db.prepare('UPDATE bots SET status = ? WHERE id = ?').run(status, id);
    log.info('[BotRegistry] Bot status updated', { id, status });
  }

  async updateHealthCheck(id: string): Promise<void> {
    this.db.prepare('UPDATE bots SET last_health_check = ? WHERE id = ?')
      .run(new Date().toISOString(), id);
  }

  async deleteBot(id: string): Promise<void> {
    this.db.prepare('DELETE FROM bots WHERE id = ?').run(id);
    log.info('[BotRegistry] Bot deleted from registry', { id });
  }

  async countBotsByCreator(creatorDiscordId: string): Promise<number> {
    const result = this.db.prepare(
      'SELECT COUNT(*) as count FROM bots WHERE creator_discord_id = ?'
    ).get(creatorDiscordId) as any;
    return result.count;
  }

  private rowToBot(row: any): Bot {
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

// Singleton instance
export const botRegistry = new BotRegistry();
