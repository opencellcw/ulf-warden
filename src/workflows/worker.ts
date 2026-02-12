#!/usr/bin/env node

/**
 * Temporal Worker
 * 
 * Runs workflows and activities.
 * 
 * Usage:
 *   npm run worker
 * 
 * or:
 *   npx tsx src/workflows/worker.ts
 * 
 * The worker polls Temporal server for tasks and executes them.
 */

import { Worker, NativeConnection } from '@temporalio/worker';
import { log } from '../logger';
import * as activities from './activities';

async function startWorker() {
  console.log('🚀 Starting Temporal worker...\n');

  // Check config
  if (process.env.TEMPORAL_ENABLED !== 'true') {
    console.error('❌ Temporal not enabled. Set TEMPORAL_ENABLED=true in .env');
    process.exit(1);
  }

  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
  const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'opencell-tasks';

  try {
    // Connect to Temporal
    console.log('📡 Connecting to Temporal...');
    console.log(`   Address: ${address}`);
    console.log(`   Namespace: ${namespace}`);
    console.log(`   Task queue: ${taskQueue}\n`);

    const connection = await NativeConnection.connect({ address });

    // Create worker
    const worker = await Worker.create({
      connection,
      namespace,
      taskQueue,
      workflowsPath: require.resolve('./definitions/bot-deployment.workflow'),
      activities,
      maxConcurrentActivityTaskExecutions: 10,
      maxConcurrentWorkflowTaskExecutions: 10,
    });

    console.log('✅ Worker created\n');

    // Handle shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down worker...');
      await worker.shutdown();
      await connection.close();
      console.log('✅ Worker shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start worker
    console.log('⚡ Worker running! Waiting for tasks...\n');
    console.log('Press Ctrl+C to stop\n');

    log.info('[Worker] Started successfully', {
      address,
      namespace,
      taskQueue,
    });

    await worker.run();

  } catch (error: any) {
    console.error('❌ Worker failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Is Temporal server running? (check http://localhost:8233)');
    console.error('2. Is the address correct?');
    console.error('3. Check worker logs for details\n');
    process.exit(1);
  }
}

// Run worker
startWorker().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
