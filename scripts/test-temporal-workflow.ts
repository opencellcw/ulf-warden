#!/usr/bin/env tsx

/**
 * Test Temporal Workflow
 * 
 * Demonstrates how to start and monitor a workflow.
 * 
 * Usage:
 *   npx tsx scripts/test-temporal-workflow.ts
 * 
 * Prerequisites:
 *   1. Temporal server running (local or cloud)
 *   2. Worker running: npx tsx src/workflows/worker.ts
 *   3. .env configured
 */

import { getTemporal } from '../src/workflows/temporal-client';

async function test() {
  console.log('🧪 Testing Temporal workflow...\n');

  // Initialize client
  const temporal = await getTemporal();
  if (!temporal.isEnabled()) {
    console.error('❌ Temporal not configured. Please set:');
    console.log('   TEMPORAL_ENABLED=true');
    console.log('   TEMPORAL_ADDRESS=localhost:7233');
    console.log('   TEMPORAL_NAMESPACE=default');
    process.exit(1);
  }

  console.log('✅ Temporal client initialized\n');

  try {
    // Start bot deployment workflow
    const workflowId = `bot-deployment-test-${Date.now()}`;
    const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'opencell-tasks';

    console.log('🚀 Starting bot deployment workflow...');
    console.log(`   Workflow ID: ${workflowId}`);
    console.log(`   Task queue: ${taskQueue}\n`);

    const handle = await temporal.startWorkflow('botDeploymentWorkflow', {
      workflowId,
      taskQueue,
      args: [
        {
          botName: 'test-bot',
          botType: 'discord',
          config: {
            token: 'test-token-123',
          },
          owner: 'test-user',
        },
      ],
      searchAttributes: {
        BotName: 'test-bot',
        BotType: 'discord',
      },
    });

    console.log('✅ Workflow started!\n');

    // Query progress
    console.log('📊 Monitoring progress...\n');
    let completed = false;
    let lastProgress = -1;

    while (!completed) {
      try {
        // Query status
        const status = await temporal.queryWorkflow(workflowId, 'status');
        const progress = await temporal.queryWorkflow(workflowId, 'progress');

        if (progress !== lastProgress) {
          console.log(`   Progress: ${progress}% - ${status.step}`);
          lastProgress = progress;
        }

        if (status.status === 'completed' || status.status === 'failed') {
          completed = true;
        }
      } catch (error) {
        // Workflow might not be ready yet
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Get result
    console.log('\n⏳ Waiting for final result...\n');
    const result = await temporal.getWorkflowResult(workflowId);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 WORKFLOW RESULT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('');

    if (result.success) {
      console.log('✅ Deployment successful!');
      console.log(`   Bot ID: ${result.botId}\n`);
    } else {
      console.log('❌ Deployment failed');
      console.log(`   Error: ${result.error}\n`);
    }

    // Get workflow details
    const details = await temporal.describeWorkflow(workflowId);
    console.log('Workflow details:');
    console.log(`   Status: ${details.status}`);
    console.log(`   Execution time: ${details.executionTime}ms\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TEST COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Next steps:');
    console.log('1. View workflow in Web UI: http://localhost:8233');
    console.log('2. Check worker logs for activity execution');
    console.log('3. Try deploying a real bot!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Is Temporal server running?');
    console.error('2. Is the worker running?');
    console.error('3. Check logs for details\n');
    process.exit(1);
  } finally {
    await temporal.close();
  }
}

// Run test
test().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
