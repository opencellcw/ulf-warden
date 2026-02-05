/**
 * Database Migration System Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { existsSync, rmSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  MigrationManager,
  initializeMigrations,
  getMigrationManager,
  closeMigrations,
} from '../../src/core/migrations';

const TEST_DB = './data/test_migrations.db';
const TEST_MIGRATIONS_DIR = './test_migrations';
const TEST_SEEDS_DIR = './test_seeds';

describe('Database Migration System', () => {
  let manager: MigrationManager;

  beforeEach(async () => {
    // Clean up
    if (existsSync(TEST_DB)) {
      rmSync(TEST_DB);
    }
    if (existsSync(TEST_MIGRATIONS_DIR)) {
      rmSync(TEST_MIGRATIONS_DIR, { recursive: true });
    }
    if (existsSync(TEST_SEEDS_DIR)) {
      rmSync(TEST_SEEDS_DIR, { recursive: true });
    }

    // Initialize migration manager
    manager = await initializeMigrations({
      client: 'better-sqlite3',
      connection: {
        filename: TEST_DB,
      },
      useNullAsDefault: true, // Required for SQLite
      migrations: {
        directory: TEST_MIGRATIONS_DIR,
        tableName: 'test_migrations',
        extension: 'ts',
      },
      seeds: {
        directory: TEST_SEEDS_DIR,
      },
    });
  });

  afterEach(async () => {
    await closeMigrations();

    // Clean up
    if (existsSync(TEST_DB)) {
      rmSync(TEST_DB);
    }
    if (existsSync(TEST_MIGRATIONS_DIR)) {
      rmSync(TEST_MIGRATIONS_DIR, { recursive: true });
    }
    if (existsSync(TEST_SEEDS_DIR)) {
      rmSync(TEST_SEEDS_DIR, { recursive: true });
    }
  });

  describe('Initialization', () => {
    it('should initialize migration manager', () => {
      assert.ok(manager);
    });

    it('should create migrations directory', () => {
      assert.ok(existsSync(TEST_MIGRATIONS_DIR));
    });

    it('should create seeds directory', () => {
      assert.ok(existsSync(TEST_SEEDS_DIR));
    });

    it('should get singleton instance', async () => {
      const instance = getMigrationManager();
      assert.strictEqual(instance, manager);
    });
  });

  describe('Migration File Creation', () => {
    it('should create migration file', async () => {
      const filename = await manager.createMigration('create_users_table');

      assert.ok(filename.includes('create_users_table'));
      assert.ok(filename.endsWith('.ts'));

      const filepath = join(TEST_MIGRATIONS_DIR, filename);
      assert.ok(existsSync(filepath));
    });

    it('should create migration with timestamp', async () => {
      const filename = await manager.createMigration('test_migration');

      // Filename should start with timestamp (14 digits)
      const timestamp = filename.split('_')[0];
      assert.strictEqual(timestamp.length, 14);
      assert.ok(/^\d+$/.test(timestamp));
    });

    it('should create multiple migrations', async () => {
      const file1 = await manager.createMigration('migration_one');
      const file2 = await manager.createMigration('migration_two');

      assert.notStrictEqual(file1, file2);
      assert.ok(existsSync(join(TEST_MIGRATIONS_DIR, file1)));
      assert.ok(existsSync(join(TEST_MIGRATIONS_DIR, file2)));
    });
  });

  describe('Seed File Creation', () => {
    it('should create seed file', async () => {
      const filename = await manager.createSeed('initial_data');

      assert.ok(filename.includes('initial_data'));
      assert.ok(filename.endsWith('.ts'));

      const filepath = join(TEST_SEEDS_DIR, filename);
      assert.ok(existsSync(filepath));
    });

    it('should create seed with timestamp', async () => {
      const filename = await manager.createSeed('test_seed');

      const timestamp = filename.split('_')[0];
      assert.strictEqual(timestamp.length, 14);
      assert.ok(/^\d+$/.test(timestamp));
    });
  });

  describe('Migration Execution', () => {
    it('should run migrations when none exist', async () => {
      const [batch, migrations] = await manager.migrate();

      assert.strictEqual(migrations.length, 0);
    });

    it('should detect pending migrations', async () => {
      // Create a test migration
      await manager.createMigration('test_migration');

      const status = await manager.status();
      assert.strictEqual(status.pending.length, 1);
    });

    it('should get migration status', async () => {
      const status = await manager.status();

      assert.ok(status);
      assert.ok(Array.isArray(status.pending));
      assert.ok(Array.isArray(status.completed));
      assert.ok(status.current === null || typeof status.current === 'string');
    });
  });

  describe('Database Connection', () => {
    it('should get database connection', () => {
      const db = manager.getConnection();
      assert.ok(db);
    });

    it('should close database connection', async () => {
      await manager.close();
      // No error means success
      assert.ok(true);
    });
  });

  describe('Migration Manager Singleton', () => {
    it('should throw when getting manager before initialization', async () => {
      await closeMigrations();

      assert.throws(() => {
        getMigrationManager();
      }, /not initialized/);
    });

    it('should return same instance', async () => {
      const instance1 = getMigrationManager();
      const instance2 = getMigrationManager();

      assert.strictEqual(instance1, instance2);
    });
  });

  describe('File System Operations', () => {
    it('should list migration files', async () => {
      await manager.createMigration('migration_1');
      await manager.createMigration('migration_2');
      await manager.createMigration('migration_3');

      const files = readdirSync(TEST_MIGRATIONS_DIR);
      assert.strictEqual(files.length, 3);
    });

    it('should list seed files', async () => {
      await manager.createSeed('seed_1');
      await manager.createSeed('seed_2');

      const files = readdirSync(TEST_SEEDS_DIR);
      assert.strictEqual(files.length, 2);
    });
  });

  describe('Error Handling', () => {
    it('should handle migration errors gracefully', async () => {
      // Try to migrate with no migrations
      const [batch, migrations] = await manager.migrate();

      // Should not throw, just return empty
      assert.strictEqual(migrations.length, 0);
    });

    it('should handle rollback when no migrations exist', async () => {
      const [batch, migrations] = await manager.rollback();

      // Should not throw, just return empty
      assert.strictEqual(migrations.length, 0);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', async () => {
      await closeMigrations();

      const customManager = await initializeMigrations({
        client: 'better-sqlite3',
        connection: {
          filename: './data/test_custom.db',
        },
        useNullAsDefault: true,
        migrations: {
          directory: './custom_migrations',
          tableName: 'custom_migrations_table',
          extension: 'js',
        },
      });

      assert.ok(customManager);
      assert.ok(existsSync('./custom_migrations'));

      await customManager.close();

      // Cleanup
      if (existsSync('./data/test_custom.db')) {
        rmSync('./data/test_custom.db');
      }
      if (existsSync('./custom_migrations')) {
        rmSync('./custom_migrations', { recursive: true });
      }
    });
  });

  describe('Status Reporting', () => {
    it('should show correct status with no migrations', async () => {
      const status = await manager.status();

      assert.strictEqual(status.current, null);
      assert.strictEqual(status.pending.length, 0);
      assert.strictEqual(status.completed.length, 0);
    });

    it('should show pending migrations', async () => {
      await manager.createMigration('pending_1');
      await manager.createMigration('pending_2');

      const status = await manager.status();

      assert.strictEqual(status.pending.length, 2);
      assert.ok(status.pending[0].includes('pending_1'));
      assert.ok(status.pending[1].includes('pending_2'));
    });
  });

  describe('Directory Management', () => {
    it('should create directories if they do not exist', async () => {
      await closeMigrations();

      // Remove directories
      if (existsSync(TEST_MIGRATIONS_DIR)) {
        rmSync(TEST_MIGRATIONS_DIR, { recursive: true });
      }
      if (existsSync(TEST_SEEDS_DIR)) {
        rmSync(TEST_SEEDS_DIR, { recursive: true });
      }

      // Initialize should recreate them
      const newManager = await initializeMigrations({
        client: 'better-sqlite3',
        connection: { filename: TEST_DB },
        useNullAsDefault: true,
        migrations: { directory: TEST_MIGRATIONS_DIR },
        seeds: { directory: TEST_SEEDS_DIR },
      });

      assert.ok(existsSync(TEST_MIGRATIONS_DIR));
      assert.ok(existsSync(TEST_SEEDS_DIR));

      await newManager.close();
    });
  });

  describe('Performance', () => {
    it('should create many migrations efficiently', async () => {
      const start = Date.now();

      for (let i = 0; i < 50; i++) {
        await manager.createMigration(`migration_${i}`);
      }

      const duration = Date.now() - start;

      // Should complete in reasonable time (< 2 seconds for 50 migrations)
      assert.ok(duration < 2000);

      const files = readdirSync(TEST_MIGRATIONS_DIR);
      assert.strictEqual(files.length, 50);
    });
  });
});
