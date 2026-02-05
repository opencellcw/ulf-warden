/**
 * Database Migration System
 *
 * Manages database schema migrations using Knex.js
 */

import knex, { Knex } from 'knex';
import { join } from 'path';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { log } from '../logger';

export interface MigrationConfig {
  client: string;
  connection: string | Knex.ConnectionConfig;
  useNullAsDefault?: boolean;
  migrations?: {
    directory?: string;
    tableName?: string;
    extension?: string;
    loadExtensions?: string[];
  };
  seeds?: {
    directory?: string;
    loadExtensions?: string[];
  };
}

export interface MigrationInfo {
  name: string;
  batch: number;
  migration_time: Date;
}

export interface MigrationStatus {
  current: string | null;
  pending: string[];
  completed: MigrationInfo[];
}

/**
 * Migration Manager
 *
 * Handles database migrations and seeds using Knex.js
 */
export class MigrationManager {
  private db: Knex;
  private config: MigrationConfig;
  private migrationsDir: string;
  private seedsDir: string;

  constructor(config: MigrationConfig) {
    this.config = {
      ...config,
      migrations: {
        directory: config.migrations?.directory || 'migrations',
        tableName: config.migrations?.tableName || 'knex_migrations',
        extension: config.migrations?.extension || 'ts',
        loadExtensions: config.migrations?.loadExtensions || ['.ts', '.js'],
      },
      seeds: {
        directory: config.seeds?.directory || 'seeds',
        loadExtensions: config.seeds?.loadExtensions || ['.ts', '.js'],
      },
    };

    this.migrationsDir = this.config.migrations!.directory!;
    this.seedsDir = this.config.seeds!.directory!;

    // Initialize Knex
    this.db = knex(this.config as Knex.Config);
  }

  /**
   * Initialize migration directories
   */
  async initialize(): Promise<void> {
    // Create migrations directory
    if (!existsSync(this.migrationsDir)) {
      mkdirSync(this.migrationsDir, { recursive: true });
      log.info('[Migrations] Created migrations directory', {
        directory: this.migrationsDir,
      });
    }

    // Create seeds directory
    if (!existsSync(this.seedsDir)) {
      mkdirSync(this.seedsDir, { recursive: true });
      log.info('[Migrations] Created seeds directory', {
        directory: this.seedsDir,
      });
    }

    log.info('[Migrations] Migration system initialized');
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filename = `${timestamp}_${name}.${this.config.migrations!.extension}`;
    const filepath = join(this.migrationsDir, filename);

    const template = `import { Knex } from 'knex';

/**
 * Migration: ${name}
 */

export async function up(knex: Knex): Promise<void> {
  // TODO: Implement migration
  // Example:
  // await knex.schema.createTable('users', (table) => {
  //   table.increments('id').primary();
  //   table.string('email').notNullable().unique();
  //   table.string('name').notNullable();
  //   table.timestamps(true, true);
  // });
}

export async function down(knex: Knex): Promise<void> {
  // TODO: Implement rollback
  // Example:
  // await knex.schema.dropTable('users');
}
`;

    writeFileSync(filepath, template, 'utf-8');

    log.info('[Migrations] Created migration file', {
      name,
      filename,
      path: filepath,
    });

    return filename;
  }

  /**
   * Create a new seed file
   */
  async createSeed(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filename = `${timestamp}_${name}.${this.config.seeds!.loadExtensions![0].replace('.', '')}`;
    const filepath = join(this.seedsDir, filename);

    const template = `import { Knex } from 'knex';

/**
 * Seed: ${name}
 */

export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries (optional)
  // await knex('table_name').del();

  // Insert seed data
  // await knex('table_name').insert([
  //   { id: 1, name: 'Example 1' },
  //   { id: 2, name: 'Example 2' },
  // ]);
}
`;

    writeFileSync(filepath, template, 'utf-8');

    log.info('[Migrations] Created seed file', {
      name,
      filename,
      path: filepath,
    });

    return filename;
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<[number, string[]]> {
    log.info('[Migrations] Running migrations...');

    try {
      const [batchNo, migrations] = await this.db.migrate.latest({
        directory: this.migrationsDir,
        tableName: this.config.migrations!.tableName,
        extension: this.config.migrations!.extension,
        loadExtensions: this.config.migrations!.loadExtensions,
      });

      if (migrations.length === 0) {
        log.info('[Migrations] Already up to date');
      } else {
        log.info('[Migrations] Migrations completed', {
          batch: batchNo,
          count: migrations.length,
          migrations,
        });
      }

      return [batchNo, migrations];
    } catch (error: any) {
      log.error('[Migrations] Migration failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Rollback the last batch of migrations
   */
  async rollback(): Promise<[number, string[]]> {
    log.info('[Migrations] Rolling back last batch...');

    try {
      const [batchNo, migrations] = await this.db.migrate.rollback({
        directory: this.migrationsDir,
        tableName: this.config.migrations!.tableName,
        extension: this.config.migrations!.extension,
        loadExtensions: this.config.migrations!.loadExtensions,
      });

      if (migrations.length === 0) {
        log.info('[Migrations] Already at base migration');
      } else {
        log.info('[Migrations] Rollback completed', {
          batch: batchNo,
          count: migrations.length,
          migrations,
        });
      }

      return [batchNo, migrations];
    } catch (error: any) {
      log.error('[Migrations] Rollback failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Rollback all migrations
   */
  async reset(): Promise<void> {
    log.info('[Migrations] Resetting all migrations...');

    try {
      let hasMore = true;

      while (hasMore) {
        const [, migrations] = await this.db.migrate.rollback({
          directory: this.migrationsDir,
          tableName: this.config.migrations!.tableName,
          extension: this.config.migrations!.extension,
          loadExtensions: this.config.migrations!.loadExtensions,
        });

        hasMore = migrations.length > 0;
      }

      log.info('[Migrations] Reset completed');
    } catch (error: any) {
      log.error('[Migrations] Reset failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async status(): Promise<MigrationStatus> {
    try {
      const [completed, pending] = await Promise.all([
        this.db.migrate.list({
          directory: this.migrationsDir,
          tableName: this.config.migrations!.tableName,
          extension: this.config.migrations!.extension,
          loadExtensions: this.config.migrations!.loadExtensions,
        }),
        this.getPendingMigrations(),
      ]);

      const current =
        completed[0].length > 0 ? completed[0][completed[0].length - 1] : null;

      const completedMigrations: MigrationInfo[] = completed[0].map((name: string) => ({
        name,
        batch: 1, // Knex doesn't provide batch info in list
        migration_time: new Date(),
      }));

      return {
        current,
        pending,
        completed: completedMigrations,
      };
    } catch (error: any) {
      log.error('[Migrations] Failed to get status', { error: error.message });
      throw error;
    }
  }

  /**
   * Get list of pending migrations
   */
  private async getPendingMigrations(): Promise<string[]> {
    try {
      const [completed] = await this.db.migrate.list({
        directory: this.migrationsDir,
        tableName: this.config.migrations!.tableName,
        extension: this.config.migrations!.extension,
        loadExtensions: this.config.migrations!.loadExtensions,
      });

      const completedSet = new Set(completed[0]);

      // Get all migration files
      const allMigrations = readdirSync(this.migrationsDir)
        .filter((file) =>
          this.config.migrations!.loadExtensions!.some((ext) => file.endsWith(ext))
        )
        .sort();

      // Filter out completed migrations
      const pending = allMigrations.filter((file) => !completedSet.has(file));

      return pending;
    } catch (error: any) {
      // If migrations table doesn't exist yet, all migrations are pending
      if (
        error.message.includes('does not exist') ||
        error.code === 'SQLITE_ERROR' ||
        error.errno === 1
      ) {
        const allMigrations = readdirSync(this.migrationsDir)
          .filter((file) =>
            this.config.migrations!.loadExtensions!.some((ext) => file.endsWith(ext))
          )
          .sort();
        return allMigrations;
      }
      throw error;
    }
  }

  /**
   * Run seed files
   */
  async seed(specific?: string): Promise<string[]> {
    log.info('[Migrations] Running seeds...', { specific });

    try {
      const [seeds] = await this.db.seed.run({
        directory: this.seedsDir,
        loadExtensions: this.config.seeds!.loadExtensions,
        specific,
      });

      log.info('[Migrations] Seeds completed', {
        count: seeds.length,
        seeds,
      });

      return seeds;
    } catch (error: any) {
      log.error('[Migrations] Seed failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get database connection
   */
  getConnection(): Knex {
    return this.db;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.destroy();
    log.info('[Migrations] Database connection closed');
  }
}

// Singleton instance
let migrationManager: MigrationManager | null = null;

/**
 * Initialize migration manager
 */
export async function initializeMigrations(
  config: MigrationConfig
): Promise<MigrationManager> {
  if (migrationManager) {
    return migrationManager;
  }

  migrationManager = new MigrationManager(config);
  await migrationManager.initialize();

  return migrationManager;
}

/**
 * Get migration manager instance
 */
export function getMigrationManager(): MigrationManager {
  if (!migrationManager) {
    throw new Error('Migration manager not initialized. Call initializeMigrations() first.');
  }
  return migrationManager;
}

/**
 * Close migration manager
 */
export async function closeMigrations(): Promise<void> {
  if (migrationManager) {
    await migrationManager.close();
    migrationManager = null;
  }
}
