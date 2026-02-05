#!/usr/bin/env node

/**
 * Migration CLI Tool
 *
 * Command-line interface for database migrations
 *
 * Usage:
 *   npm run migrate -- up              Run all pending migrations
 *   npm run migrate -- down            Rollback last batch
 *   npm run migrate -- reset           Rollback all migrations
 *   npm run migrate -- status          Show migration status
 *   npm run migrate -- create <name>   Create new migration
 *   npm run migrate -- seed            Run all seeds
 *   npm run migrate -- seed:make <name> Create new seed
 */

import { initializeMigrations, closeMigrations } from '../core/migrations';
import { log } from '../logger';

// Default configuration (can be overridden via env vars)
const config = {
  client: process.env.DB_CLIENT || 'sqlite3',
  connection:
    process.env.DB_CONNECTION ||
    process.env.DATABASE_URL ||
    './data/opencell.db',
  migrations: {
    directory: process.env.MIGRATIONS_DIR || 'migrations',
    tableName: 'knex_migrations',
    extension: 'ts',
    loadExtensions: ['.ts', '.js'],
  },
  seeds: {
    directory: process.env.SEEDS_DIR || 'seeds',
    loadExtensions: ['.ts', '.js'],
  },
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];

  if (!command) {
    showHelp();
    process.exit(0);
  }

  try {
    const manager = await initializeMigrations(config);

    switch (command) {
      case 'up':
      case 'migrate':
        await runMigrations(manager);
        break;

      case 'down':
      case 'rollback':
        await rollbackMigrations(manager);
        break;

      case 'reset':
        await resetMigrations(manager);
        break;

      case 'status':
        await showStatus(manager);
        break;

      case 'create':
      case 'make':
        if (!param) {
          console.error('Error: Migration name required');
          console.error('Usage: npm run migrate -- create <name>');
          process.exit(1);
        }
        await createMigration(manager, param);
        break;

      case 'seed':
        await runSeeds(manager, param);
        break;

      case 'seed:make':
      case 'seed:create':
        if (!param) {
          console.error('Error: Seed name required');
          console.error('Usage: npm run migrate -- seed:make <name>');
          process.exit(1);
        }
        await createSeed(manager, param);
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }

    await closeMigrations();
    process.exit(0);
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    log.error('[Migrate CLI] Command failed', {
      command,
      error: error.message,
    });
    await closeMigrations();
    process.exit(1);
  }
}

async function runMigrations(manager: any) {
  console.log('Running migrations...\n');

  const [batch, migrations] = await manager.migrate();

  if (migrations.length === 0) {
    console.log('✓ Already up to date');
  } else {
    console.log(`✓ Ran ${migrations.length} migration(s) in batch ${batch}:\n`);
    migrations.forEach((name: string) => {
      console.log(`  - ${name}`);
    });
  }
}

async function rollbackMigrations(manager: any) {
  console.log('Rolling back last batch...\n');

  const [batch, migrations] = await manager.rollback();

  if (migrations.length === 0) {
    console.log('✓ Already at base migration');
  } else {
    console.log(`✓ Rolled back ${migrations.length} migration(s) from batch ${batch}:\n`);
    migrations.forEach((name: string) => {
      console.log(`  - ${name}`);
    });
  }
}

async function resetMigrations(manager: any) {
  console.log('Resetting all migrations...\n');

  await manager.reset();

  console.log('✓ All migrations rolled back');
}

async function showStatus(manager: any) {
  const status = await manager.status();

  console.log('Migration Status\n');
  console.log('================\n');

  if (status.current) {
    console.log(`Current: ${status.current}\n`);
  } else {
    console.log('Current: No migrations run yet\n');
  }

  if (status.completed.length > 0) {
    console.log(`Completed Migrations (${status.completed.length}):\n`);
    status.completed.forEach((migration: any) => {
      console.log(`  ✓ ${migration.name}`);
    });
    console.log();
  }

  if (status.pending.length > 0) {
    console.log(`Pending Migrations (${status.pending.length}):\n`);
    status.pending.forEach((name: string) => {
      console.log(`  - ${name}`);
    });
    console.log();
  } else {
    console.log('No pending migrations\n');
  }
}

async function createMigration(manager: any, name: string) {
  console.log(`Creating migration: ${name}\n`);

  const filename = await manager.createMigration(name);

  console.log(`✓ Created migration file: ${filename}`);
  console.log(`  Path: ${config.migrations.directory}/${filename}`);
}

async function createSeed(manager: any, name: string) {
  console.log(`Creating seed: ${name}\n`);

  const filename = await manager.createSeed(name);

  console.log(`✓ Created seed file: ${filename}`);
  console.log(`  Path: ${config.seeds.directory}/${filename}`);
}

async function runSeeds(manager: any, specific?: string) {
  console.log('Running seeds...\n');

  const seeds = await manager.seed(specific);

  console.log(`✓ Ran ${seeds.length} seed(s):\n`);
  seeds.forEach((name: string) => {
    console.log(`  - ${name}`);
  });
}

function showHelp() {
  console.log(`
Database Migration CLI

Usage:
  npm run migrate -- <command> [options]

Commands:
  up, migrate              Run all pending migrations
  down, rollback           Rollback the last batch of migrations
  reset                    Rollback all migrations
  status                   Show migration status
  create <name>            Create a new migration file
  seed [name]              Run seed files (optionally specify one)
  seed:make <name>         Create a new seed file
  help                     Show this help message

Examples:
  npm run migrate -- up
  npm run migrate -- create add_users_table
  npm run migrate -- status
  npm run migrate -- seed
  npm run migrate -- seed:make initial_data

Environment Variables:
  DB_CLIENT                Database client (default: sqlite3)
  DB_CONNECTION            Database connection string
  DATABASE_URL             Alternative to DB_CONNECTION
  MIGRATIONS_DIR           Migrations directory (default: migrations)
  SEEDS_DIR                Seeds directory (default: seeds)
`);
}

// Run CLI
if (require.main === module) {
  main();
}
