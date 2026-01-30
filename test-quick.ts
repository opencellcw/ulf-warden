#!/usr/bin/env tsx
/**
 * Quick Scheduler Test
 * Tests the scheduler with a 30-second reminder
 */

import 'dotenv/config';
import { getCronManager } from './src/scheduler/cron-manager';

async function quickTest() {
  console.log('\n🧪 Quick Scheduler Test (30 seconds)\n');

  const cronManager = getCronManager();

  // Clean up any existing test jobs first
  const existingJobs = cronManager.listJobs('test-quick');
  for (const job of existingJobs) {
    await cronManager.removeJob(job.id);
  }

  // Schedule a 30-second reminder
  console.log('📅 Scheduling reminder for 30 seconds from now...');
  const job = await cronManager.addJob({
    name: 'Quick Test - 30 seconds',
    expression: 'in 30 seconds',
    task: {
      type: 'slack_message',
      data: {
        channel: 'test-channel',
        message: '✅ 30-second test reminder executed!'
      }
    },
    userId: 'test-quick'
  });

  console.log('✅ Job scheduled!');
  console.log('   ID:', job.id);
  console.log('   Expression:', job.expression);
  console.log('   Next run:', job.nextRun);
  console.log('');

  // Countdown
  console.log('⏰ Waiting 30 seconds...\n');
  for (let i = 30; i > 0; i--) {
    if (i <= 10 || i % 10 === 0) {
      process.stdout.write(`   ${i}... `);
      if (i % 10 === 0 && i !== 30) console.log('');
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\n⏰ Time\'s up! Checking job status...\n');

  // Wait a bit more for execution
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check job status
  const updatedJob = cronManager.getJob(job.id);
  if (updatedJob) {
    console.log('📊 Job Status:');
    console.log('   Enabled:', updatedJob.enabled);
    console.log('   Last run:', updatedJob.lastRun || 'Never');
    console.log('');

    if (updatedJob.lastRun) {
      console.log('✅ Job executed successfully!');
      console.log('   Note: Slack message failed (expected - no Slack configured in test)');
    } else {
      console.log('⚠️  Job did not execute yet. Check logs.');
    }
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await cronManager.removeJob(job.id);
  console.log('✅ Test job removed');

  console.log('\n🎉 Quick test completed!\n');

  // Keep process alive for a moment to see final logs
  await new Promise(resolve => setTimeout(resolve, 1000));

  process.exit(0);
}

quickTest().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
