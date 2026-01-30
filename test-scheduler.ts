#!/usr/bin/env tsx
/**
 * Test Scheduler System
 *
 * Este script testa o sistema de agendamento criando um reminder de 2 minutos
 */

import 'dotenv/config';
import { getCronManager } from './src/scheduler/cron-manager';
import { log } from './src/logger';

async function testScheduler() {
  console.log('🧪 Testing Scheduler System...\n');

  try {
    const cronManager = getCronManager();

    // Test 1: Schedule a task for 2 minutes from now
    console.log('📅 Test 1: Scheduling reminder for 2 minutes...');

    const job = await cronManager.addJob({
      name: 'Test Reminder - 2 minutes',
      expression: 'in 2 minutes',
      task: {
        type: 'slack_message',
        data: {
          channel: 'test-channel',
          message: '🔔 Test reminder: Your 2-minute timer is up!'
        }
      },
      userId: 'test-user',
      metadata: {
        test: true,
        createdBy: 'test-scheduler.ts'
      }
    });

    console.log('✅ Job scheduled successfully!');
    console.log('   ID:', job.id);
    console.log('   Name:', job.name);
    console.log('   Expression:', job.expression);
    console.log('   Next run:', job.nextRun);
    console.log('');

    // Test 2: List all jobs
    console.log('📋 Test 2: Listing all jobs...');
    const jobs = cronManager.listJobs();
    console.log(`   Found ${jobs.length} job(s):`);
    jobs.forEach(j => {
      const status = j.enabled ? '✅ Active' : '⏸️ Paused';
      console.log(`   - ${j.name} (${j.id.substring(0, 8)}) - ${status}`);
      console.log(`     Expression: ${j.expression}`);
      console.log(`     Created: ${new Date(j.createdAt).toLocaleString('pt-BR')}`);
      if (j.lastRun) {
        console.log(`     Last run: ${new Date(j.lastRun).toLocaleString('pt-BR')}`);
      }
      console.log('');
    });

    // Test 3: Parse relative time
    console.log('🕐 Test 3: Testing relative time parsing...');
    const examples = [
      'in 30 seconds',
      'in 5 minutes',
      'in 2 hours',
      'in 1 day'
    ];

    for (const expr of examples) {
      const parsed = cronManager.parseRelativeTime(expr);
      if (parsed) {
        const { expression, executeAt } = cronManager.relativeToCron(parsed);
        console.log(`   "${expr}":`);
        console.log(`     → Cron: ${expression}`);
        console.log(`     → Execute at: ${executeAt.toLocaleString('pt-BR')}`);
      }
    }
    console.log('');

    // Wait for 2 minutes to see the job execute
    console.log('⏰ Waiting for 2 minutes to see job execute...');
    console.log('   (Press Ctrl+C to cancel)');
    console.log('');

    // Wait and log countdown
    for (let i = 120; i > 0; i--) {
      if (i % 30 === 0) {
        console.log(`   ⏳ ${i} seconds remaining...`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('');
    console.log('✅ Test completed!');
    console.log('   Check if the job executed above.');
    console.log('   Note: Slack message will fail if Slack is not configured.');
    console.log('');

    // Test 4: Cleanup
    console.log('🧹 Test 4: Cleaning up test jobs...');
    const testJobs = cronManager.listJobs('test-user');
    for (const j of testJobs) {
      await cronManager.removeJob(j.id);
      console.log(`   ✅ Removed job: ${j.name}`);
    }

    console.log('');
    console.log('🎉 All tests completed successfully!');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testScheduler();
