

# Database Migration System

Comprehensive database schema migration system using Knex.js for managing database changes across environments.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [CLI Commands](#cli-commands)
- [Migration Files](#migration-files)
- [Seed Files](#seed-files)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The migration system is built on **Knex.js**, providing:

- **Version control** for database schemas
- **Up/down migrations** for rolling changes forward and backward
- **Seed data** for populating databases
- **Multi-database support** (SQLite, PostgreSQL, MySQL, MSSQL)
- **CLI tools** for easy management
- **TypeScript support**
- **Transaction support** for atomic changes

## Quick Start

### 1. Initialize Migration System

```typescript
import { initializeMigrations } from './src/core/migrations';

const manager = await initializeMigrations({
  client: 'better-sqlite3',
  connection: {
    filename: './data/myapp.db',
  },
  useNullAsDefault: true, // Required for SQLite
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
});
```

### 2. Create a Migration

```bash
npm run migrate -- create create_users_table
```

This creates a new migration file: `migrations/20260205123456_create_users_table.ts`

### 3. Edit the Migration

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable().unique();
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
}
```

### 4. Run Migrations

```bash
npm run migrate -- up
```

## CLI Commands

### Setup

Add to your `package.json`:

```json
{
  "scripts": {
    "migrate": "tsx src/cli/migrate.ts"
  }
}
```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run migrate -- up` | Run all pending migrations |
| `npm run migrate -- down` | Rollback last batch of migrations |
| `npm run migrate -- reset` | Rollback all migrations |
| `npm run migrate -- status` | Show migration status |
| `npm run migrate -- create <name>` | Create new migration file |
| `npm run migrate -- seed` | Run all seed files |
| `npm run migrate -- seed:make <name>` | Create new seed file |
| `npm run migrate -- help` | Show help |

### Examples

```bash
# Create migration
npm run migrate -- create add_email_index

# Run migrations
npm run migrate -- up

# Check status
npm run migrate -- status

# Rollback
npm run migrate -- down

# Create seed
npm run migrate -- seed:make initial_data

# Run seeds
npm run migrate -- seed
```

## Migration Files

### File Structure

Migrations are automatically timestamped:

```
migrations/
├── 20260205123456_create_users_table.ts
├── 20260205124530_add_email_index.ts
└── 20260205130000_add_posts_table.ts
```

### Creating Tables

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    // Primary key
    table.increments('id').primary();

    // String columns
    table.string('email', 255).notNullable().unique();
    table.string('name', 255).notNullable();
    table.text('bio').nullable();

    // Integer columns
    table.integer('age').nullable();
    table.bigInteger('follower_count').defaultTo(0);

    // Boolean
    table.boolean('is_active').defaultTo(true);

    // Timestamps
    table.timestamps(true, true); // created_at, updated_at

    // Indexes
    table.index('email');
    table.index(['created_at', 'is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
}
```

### Altering Tables

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Add column
    table.string('phone_number', 20).nullable();

    // Add index
    table.index('phone_number');

    // Rename column (note: may not work on all databases)
    // table.renameColumn('old_name', 'new_name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('phone_number');
  });
}
```

### Adding Foreign Keys

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('posts', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('content').notNullable();

    // Foreign key
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');

    table.timestamps(true, true);

    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('posts');
}
```

### Data Migrations

```typescript
export async function up(knex: Knex): Promise<void> {
  // Add column with default value for existing rows
  await knex.schema.alterTable('users', (table) => {
    table.string('role').defaultTo('user');
  });

  // Update existing rows
  await knex('users')
    .where('email', 'like', '%@admin.com')
    .update({ role: 'admin' });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('role');
  });
}
```

## Seed Files

### Creating Seeds

```bash
npm run migrate -- seed:make initial_users
```

Creates: `seeds/20260205123456_initial_users.ts`

### Seed File Structure

```typescript
import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries
  await knex('users').del();

  // Insert seed data
  await knex('users').insert([
    {
      email: 'admin@example.com',
      name: 'Admin User',
      is_active: true,
    },
    {
      email: 'user@example.com',
      name: 'Regular User',
      is_active: true,
    },
  ]);
}
```

### Running Seeds

```bash
# Run all seeds
npm run migrate -- seed

# Run specific seed
npm run migrate -- seed specific_seed_file.ts
```

## Configuration

### SQLite

```typescript
{
  client: 'better-sqlite3',
  connection: {
    filename: './data/myapp.db',
  },
  useNullAsDefault: true,
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './seeds',
  },
}
```

### PostgreSQL

```typescript
{
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
  },
  seeds: {
    directory: './seeds',
  },
}
```

### MySQL

```typescript
{
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
  },
}
```

### Environment Variables

```bash
# Database configuration
DB_CLIENT=pg
DB_CONNECTION=postgres://user:pass@localhost:5432/mydb
DATABASE_URL=postgres://user:pass@localhost:5432/mydb

# Migration directories
MIGRATIONS_DIR=./migrations
SEEDS_DIR=./seeds
```

## Best Practices

### 1. Never Modify Existing Migrations

```typescript
// ❌ Bad - modifying existing migration
// migrations/20260101_create_users.ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id');
    table.string('email');
    table.string('phone'); // DON'T ADD THIS LATER
  });
}

// ✅ Good - create new migration
// migrations/20260202_add_phone_to_users.ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('phone');
  });
}
```

### 2. Always Write Down Migrations

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('posts', (table) => {
    table.increments('id');
    table.string('title');
  });
}

// ✅ Always implement down
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('posts');
}
```

### 3. Use Transactions for Data Migrations

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    // Add column
    await trx.schema.alterTable('users', (table) => {
      table.integer('post_count').defaultTo(0);
    });

    // Update counts
    const users = await trx('users').select('id');

    for (const user of users) {
      const count = await trx('posts').where('user_id', user.id).count('* as count');
      await trx('users').where('id', user.id).update({ post_count: count[0].count });
    }
  });
}
```

### 4. Test Migrations Locally First

```bash
# Test up migration
npm run migrate -- up

# Check status
npm run migrate -- status

# Test down migration
npm run migrate -- down

# Test again
npm run migrate -- up
```

### 5. Use Descriptive Names

```typescript
// ❌ Bad names
create_table1.ts
migration2.ts
update.ts

// ✅ Good names
create_users_table.ts
add_email_index_to_users.ts
add_posts_table_with_foreign_keys.ts
```

### 6. Keep Migrations Small

```typescript
// ❌ Bad - too much in one migration
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', ...);
  await knex.schema.createTable('posts', ...);
  await knex.schema.createTable('comments', ...);
  await knex.schema.createTable('likes', ...);
}

// ✅ Good - separate migrations
// 001_create_users_table.ts
// 002_create_posts_table.ts
// 003_create_comments_table.ts
// 004_create_likes_table.ts
```

## Troubleshooting

### Migration Failed

If a migration fails mid-execution:

1. **Check the error message**
2. **Manually fix database state** if needed
3. **Fix the migration file**
4. **Retry**:
   ```bash
   npm run migrate -- down
   npm run migrate -- up
   ```

### Locked Migration Table

If migrations are locked:

```sql
-- SQLite
DELETE FROM knex_migrations_lock;

-- PostgreSQL/MySQL
DELETE FROM knex_migrations_lock WHERE is_locked = 1;
```

### Out of Sync

If production is out of sync:

1. **Check status**:
   ```bash
   npm run migrate -- status
   ```

2. **Never skip migrations** - run them in order

3. **If needed, create a "repair" migration**

### Testing Migrations

```typescript
// Test file: tests/migrations/users.test.ts
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { initializeMigrations, closeMigrations } from '../../src/core/migrations';

describe('Users Migration', () => {
  beforeEach(async () => {
    const manager = await initializeMigrations({...});
    await manager.migrate();
  });

  afterEach(async () => {
    const manager = getMigrationManager();
    await manager.reset();
    await closeMigrations();
  });

  it('should create users table', async () => {
    const manager = getMigrationManager();
    const db = manager.getConnection();

    const hasTable = await db.schema.hasTable('users');
    assert.ok(hasTable);
  });
});
```

## Column Types Reference

| Knex Method | SQL Type | Description |
|-------------|----------|-------------|
| `increments('id')` | INTEGER/SERIAL | Auto-incrementing primary key |
| `string('name', 255)` | VARCHAR(255) | Variable-length string |
| `text('bio')` | TEXT | Long text |
| `integer('age')` | INTEGER | Integer number |
| `bigInteger('count')` | BIGINT | Large integer |
| `float('price')` | FLOAT | Floating point |
| `decimal('amount', 8, 2)` | DECIMAL(8,2) | Fixed-point decimal |
| `boolean('is_active')` | BOOLEAN | True/false |
| `date('birthday')` | DATE | Date only |
| `datetime('created_at')` | DATETIME | Date and time |
| `timestamp('updated_at')` | TIMESTAMP | Timestamp |
| `timestamps(true, true)` | - | created_at + updated_at |
| `json('data')` | JSON | JSON data |
| `jsonb('data')` | JSONB | Binary JSON (Postgres) |
| `uuid('id')` | UUID | UUID type |
| `binary('file')` | BLOB | Binary data |

## References

- [Knex.js Documentation](https://knexjs.org/)
- [Knex Schema Builder](https://knexjs.org/guide/schema-builder.html)
- [Knex Migrations](https://knexjs.org/guide/migrations.html)
- [Knex Seeds](https://knexjs.org/guide/migrations.html#seed-files)
