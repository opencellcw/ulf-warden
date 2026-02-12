#!/usr/bin/env tsx

/**
 * Migrate data from SQLite to Supabase
 * 
 * This script migrates existing data from local SQLite database to Supabase.
 * 
 * Usage:
 *   npx tsx scripts/migrate-sqlite-to-supabase.ts
 * 
 * Prerequisites:
 *   1. Supabase project created
 *   2. Schema deployed (001_initial_schema.sql)
 *   3. .env configured with SUPABASE_URL and SUPABASE_ANON_KEY
 */

import Database from 'better-sqlite3';
import { getSupabase } from '../src/database/supabase';
import * as fs from 'fs';
import * as path from 'path';

const SQLITE_PATH = path.join(__dirname, '../data/opencell.db');
const DRY_RUN = process.argv.includes('--dry-run');

interface MigrationStats {
  bots: { total: number; migrated: number; errors: number };
  conversations: { total: number; migrated: number; errors: number };
  analytics: { total: number; migrated: number; errors: number };
}

async function migrate() {
  console.log('🚀 Starting migration from SQLite to Supabase...\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No data will be written\n');
  }

  // Check if SQLite database exists
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error('❌ SQLite database not found:', SQLITE_PATH);
    console.log('\nℹ️  If you have no data to migrate, you can skip this step.');
    process.exit(1);
  }

  // Initialize connections
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const supabase = getSupabase();

  if (!supabase.isEnabled()) {
    console.error('❌ Supabase not configured. Please set:');
    console.log('   SUPABASE_ENABLED=true');
    console.log('   SUPABASE_URL=https://xxx.supabase.co');
    console.log('   SUPABASE_ANON_KEY=eyJxxx...');
    process.exit(1);
  }

  const stats: MigrationStats = {
    bots: { total: 0, migrated: 0, errors: 0 },
    conversations: { total: 0, migrated: 0, errors: 0 },
    analytics: { total: 0, migrated: 0, errors: 0 },
  };

  try {
    // ========================================================================
    // 1. Migrate Bots
    // ========================================================================
    console.log('📦 Migrating bots...');
    
    const bots = sqlite.prepare('SELECT * FROM bots').all() as any[];
    stats.bots.total = bots.length;

    for (const bot of bots) {
      try {
        if (!DRY_RUN) {
          await supabase.createBot({
            name: bot.name,
            type: bot.type || 'conversational',
            owner_id: bot.owner_id || 'PLACEHOLDER', // Need to map to Supabase user ID
            tools: bot.tools ? JSON.parse(bot.tools) : [],
            config: bot.config ? JSON.parse(bot.config) : {},
            avatar_url: bot.avatar_url,
          });
        }
        
        stats.bots.migrated++;
        console.log(`  ✅ Migrated bot: ${bot.name}`);
      } catch (error: any) {
        stats.bots.errors++;
        console.log(`  ❌ Failed to migrate bot ${bot.name}: ${error.message}`);
      }
    }

    // ========================================================================
    // 2. Migrate Conversations
    // ========================================================================
    console.log('\n💬 Migrating conversations...');
    
    const conversations = sqlite.prepare('SELECT * FROM conversations LIMIT 1000').all() as any[];
    stats.conversations.total = conversations.length;

    for (const conv of conversations) {
      try {
        if (!DRY_RUN) {
          await supabase.storeConversation({
            bot_id: conv.bot_id,
            user_id: conv.user_id || 'PLACEHOLDER',
            platform: conv.platform || 'discord',
            messages: conv.messages ? JSON.parse(conv.messages) : [],
            metadata: conv.metadata ? JSON.parse(conv.metadata) : {},
          });
        }
        
        stats.conversations.migrated++;
        
        if (stats.conversations.migrated % 100 === 0) {
          console.log(`  ✅ Migrated ${stats.conversations.migrated}/${conversations.length} conversations...`);
        }
      } catch (error: any) {
        stats.conversations.errors++;
        // Don't log every error for conversations (too verbose)
      }
    }

    if (conversations.length > 0) {
      console.log(`  ✅ Migrated ${stats.conversations.migrated} conversations`);
    }

    // ========================================================================
    // 3. Migrate Analytics
    // ========================================================================
    console.log('\n📊 Migrating analytics...');
    
    // Check if analytics table exists
    const tableCheck = sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='bot_analytics'"
    ).get();

    if (tableCheck) {
      const analytics = sqlite.prepare('SELECT * FROM bot_analytics').all() as any[];
      stats.analytics.total = analytics.length;

      for (const record of analytics) {
        try {
          if (!DRY_RUN) {
            await supabase.storeBotAnalytics({
              bot_id: record.bot_id,
              date: record.date,
              requests_count: record.requests_count || 0,
              total_cost: record.total_cost || 0,
              avg_latency_ms: record.avg_latency_ms || 0,
              error_count: record.error_count || 0,
            });
          }
          
          stats.analytics.migrated++;
        } catch (error: any) {
          stats.analytics.errors++;
        }
      }

      console.log(`  ✅ Migrated ${stats.analytics.migrated} analytics records`);
    } else {
      console.log('  ℹ️  No analytics table found (skipping)');
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    sqlite.close();
  }

  // ========================================================================
  // Summary
  // ========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\nBots:');
  console.log(`  Total:    ${stats.bots.total}`);
  console.log(`  Migrated: ${stats.bots.migrated} ✅`);
  console.log(`  Errors:   ${stats.bots.errors} ${stats.bots.errors > 0 ? '❌' : '✅'}`);

  console.log('\nConversations:');
  console.log(`  Total:    ${stats.conversations.total}`);
  console.log(`  Migrated: ${stats.conversations.migrated} ✅`);
  console.log(`  Errors:   ${stats.conversations.errors} ${stats.conversations.errors > 0 ? '❌' : '✅'}`);

  console.log('\nAnalytics:');
  console.log(`  Total:    ${stats.analytics.total}`);
  console.log(`  Migrated: ${stats.analytics.migrated} ✅`);
  console.log(`  Errors:   ${stats.analytics.errors} ${stats.analytics.errors > 0 ? '❌' : '✅'}`);

  const totalMigrated = stats.bots.migrated + stats.conversations.migrated + stats.analytics.migrated;
  const totalErrors = stats.bots.errors + stats.conversations.errors + stats.analytics.errors;

  console.log('\nOverall:');
  console.log(`  Total migrated: ${totalMigrated} ✅`);
  console.log(`  Total errors:   ${totalErrors} ${totalErrors > 0 ? '❌' : '✅'}`);

  console.log('\n' + '='.repeat(60));

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. No data was written.');
    console.log('   Remove --dry-run flag to perform actual migration.\n');
  } else {
    console.log('\n✅ Migration complete!\n');
    console.log('Next steps:');
    console.log('  1. Verify data in Supabase dashboard');
    console.log('  2. Update .env to enable Supabase: SUPABASE_ENABLED=true');
    console.log('  3. Restart OpenCell');
    console.log('  4. (Optional) Backup and remove SQLite database\n');
  }
}

// Run migration
migrate().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
