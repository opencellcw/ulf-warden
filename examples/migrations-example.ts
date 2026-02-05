/**
 * Database Migration System Examples
 *
 * Shows how to use the migration system with Knex.js
 */

import {
  initializeMigrations,
  getMigrationManager,
  closeMigrations,
} from '../src/core/migrations';

// ===== Example 1: Basic Setup =====

async function basicSetupExample() {
  console.log('=== Example 1: Basic Setup ===\n');

  // Initialize with SQLite
  const manager = await initializeMigrations({
    client: 'better-sqlite3',
    connection: {
      filename: './data/example.db',
    },
    useNullAsDefault: true,
    migrations: {
      directory: './example_migrations',
      tableName: 'migrations',
    },
    seeds: {
      directory: './example_seeds',
    },
  });

  console.log('Migration system initialized!');
  console.log();

  await closeMigrations();
}

// ===== Example 2: Create Migration Files =====

async function createMigrationExample() {
  console.log('=== Example 2: Create Migration Files ===\n');

  await initializeMigrations({
    client: 'better-sqlite3',
    connection: './data/example.db',
    useNullAsDefault: true,
  });

  const manager = getMigrationManager();

  // Create migrations
  const file1 = await manager.createMigration('create_users_table');
  console.log(`Created: ${file1}`);

  const file2 = await manager.createMigration('add_email_index');
  console.log(`Created: ${file2}`);

  console.log('\nEdit these files to define your schema changes!');
  console.log();

  await closeMigrations();
}

// ===== Example 3: Run Migrations =====

async function runMigrationsExample() {
  console.log('=== Example 3: Run Migrations ===\n');

  await initializeMigrations({
    client: 'better-sqlite3',
    connection: './data/example.db',
    useNullAsDefault: true,
  });

  const manager = getMigrationManager();

  console.log('Running migrations...');
  const [batch, migrations] = await manager.migrate();

  if (migrations.length === 0) {
    console.log('Already up to date!');
  } else {
    console.log(`Ran ${migrations.length} migration(s) in batch ${batch}:`);
    migrations.forEach((name) => console.log(`  - ${name}`));
  }

  console.log();

  await closeMigrations();
}

// ===== Example 4: Check Status =====

async function checkStatusExample() {
  console.log('=== Example 4: Check Migration Status ===\n');

  await initializeMigrations({
    client: 'better-sqlite3',
    connection: './data/example.db',
    useNullAsDefault: true,
  });

  const manager = getMigrationManager();

  const status = await manager.status();

  console.log('Migration Status:');
  console.log(`  Current: ${status.current || 'None'}`);
  console.log(`  Completed: ${status.completed.length}`);
  console.log(`  Pending: ${status.pending.length}`);

  if (status.pending.length > 0) {
    console.log('\nPending migrations:');
    status.pending.forEach((name) => console.log(`  - ${name}`));
  }

  console.log();

  await closeMigrations();
}

// ===== Example 5: Rollback =====

async function rollbackExample() {
  console.log('=== Example 5: Rollback Migrations ===\n');

  await initializeMigrations({
    client: 'better-sqlite3',
    connection: './data/example.db',
    useNullAsDefault: true,
  });

  const manager = getMigrationManager();

  console.log('Rolling back last batch...');
  const [batch, migrations] = await manager.rollback();

  if (migrations.length === 0) {
    console.log('Already at base migration');
  } else {
    console.log(`Rolled back ${migrations.length} migration(s) from batch ${batch}:`);
    migrations.forEach((name) => console.log(`  - ${name}`));
  }

  console.log();

  await closeMigrations();
}

// ===== Example 6: Create and Run Seeds =====

async function seedsExample() {
  console.log('=== Example 6: Seeds ===\n');

  await initializeMigrations({
    client: 'better-sqlite3',
    connection: './data/example.db',
    useNullAsDefault: true,
  });

  const manager = getMigrationManager();

  // Create seed file
  console.log('Creating seed file...');
  const seedFile = await manager.createSeed('initial_data');
  console.log(`Created: ${seedFile}`);

  // Run seeds
  console.log('\nRunning seeds...');
  const seeds = await manager.seed();
  console.log(`Ran ${seeds.length} seed(s)`);

  console.log();

  await closeMigrations();
}

// ===== Example 7: PostgreSQL Configuration =====

async function postgresConfigExample() {
  console.log('=== Example 7: PostgreSQL Config ===\n');

  // Example configuration for PostgreSQL
  const config = {
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 5432,
      user: 'myuser',
      password: 'mypassword',
      database: 'mydb',
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  };

  console.log('PostgreSQL configuration:');
  console.log(JSON.stringify(config, null, 2));
  console.log();

  // Note: Actual initialization would require pg package installed
  // await initializeMigrations(config);
}

// ===== Example 8: MySQL Configuration =====

async function mysqlConfigExample() {
  console.log('=== Example 8: MySQL Config ===\n');

  // Example configuration for MySQL
  const config = {
    client: 'mysql2',
    connection: {
      host: 'localhost',
      port: 3306,
      user: 'myuser',
      password: 'mypassword',
      database: 'mydb',
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
  };

  console.log('MySQL configuration:');
  console.log(JSON.stringify(config, null, 2));
  console.log();

  // Note: Actual initialization would require mysql2 package installed
  // await initializeMigrations(config);
}

// ===== Example 9: Database Operations =====

async function databaseOperationsExample() {
  console.log('=== Example 9: Database Operations ===\n');

  await initializeMigrations({
    client: 'better-sqlite3',
    connection: './data/example.db',
    useNullAsDefault: true,
  });

  const manager = getMigrationManager();
  const db = manager.getConnection();

  // You can use the Knex connection directly
  console.log('Running custom query...');

  try {
    // Check if table exists
    const hasTable = await db.schema.hasTable('users');
    console.log(`Users table exists: ${hasTable}`);

    if (hasTable) {
      // Query data
      const users = await db('users').select('*').limit(5);
      console.log(`Found ${users.length} user(s)`);
    }
  } catch (error) {
    console.log('Table does not exist yet, run migrations first');
  }

  console.log();

  await closeMigrations();
}

// ===== Example 10: Migration File Example =====

function showMigrationFileExample() {
  console.log('=== Example 10: Migration File Structure ===\n');

  console.log('Example migration file (create_users_table.ts):');
  console.log(`
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 255).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('password_hash', 255).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Create indexes
  await knex.schema.alterTable('users', (table) => {
    table.index('email');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
}
  `);
}

// ===== Example 11: Seed File Example =====

function showSeedFileExample() {
  console.log('=== Example 11: Seed File Structure ===\n');

  console.log('Example seed file (initial_users.ts):');
  console.log(`
import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries (optional)
  await knex('users').del();

  // Insert seed data
  await knex('users').insert([
    {
      email: 'admin@example.com',
      name: 'Admin User',
      password_hash: 'hashed_password_here',
      is_active: true,
    },
    {
      email: 'user@example.com',
      name: 'Regular User',
      password_hash: 'hashed_password_here',
      is_active: true,
    },
  ]);
}
  `);
}

// ===== Run All Examples =====

async function runAllExamples() {
  try {
    await basicSetupExample();
    await createMigrationExample();
    // await runMigrationsExample(); // Skip - requires actual migrations
    await checkStatusExample();
    // await rollbackExample(); // Skip - requires migrations to rollback
    // await seedsExample(); // Skip - requires migrations first
    postgresConfigExample();
    mysqlConfigExample();
    // await databaseOperationsExample(); // Skip - requires migrations
    showMigrationFileExample();
    showSeedFileExample();

    console.log('All examples completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllExamples();
}

/**
 * CLI Usage:
 *
 * 1. Add script to package.json:
 *    "migrate": "tsx src/cli/migrate.ts"
 *
 * 2. Run commands:
 *    npm run migrate -- status
 *    npm run migrate -- create add_users_table
 *    npm run migrate -- up
 *    npm run migrate -- down
 *    npm run migrate -- seed
 *
 * 3. Environment Variables:
 *    DB_CLIENT=pg
 *    DB_CONNECTION=postgres://user:pass@localhost/db
 *    MIGRATIONS_DIR=./migrations
 *    SEEDS_DIR=./seeds
 */
