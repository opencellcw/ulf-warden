import { proxyActivities, sleep, defineSignal, defineQuery, setHandler } from '@temporalio/workflow';
import type * as activities from '../activities';

/**
 * Bot Deployment Workflow
 * 
 * Deploys a bot with automatic rollback on failure.
 * 
 * Steps:
 * 1. Validate configuration
 * 2. Create database records
 * 3. Deploy to platform (Discord/Slack/etc)
 * 4. Run health checks
 * 5. Notify completion (or rollback on error)
 * 
 * Features:
 * - Automatic retry (exponential backoff)
 * - Rollback on failure (compensating transactions)
 * - Progress tracking (queryable state)
 * - Pause/Resume support (signals)
 */

// Proxy activities with retry policy
const {
  validateBotConfig,
  createBotRecord,
  deployToDiscord,
  deployToSlack,
  runHealthCheck,
  sendNotification,
  rollbackBotRecord,
  rollbackDiscordBot,
  rollbackSlackBot,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '1 minute',
    maximumAttempts: 3,
  },
});

// Signals
export const pauseSignal = defineSignal('pause');
export const resumeSignal = defineSignal('resume');
export const cancelSignal = defineSignal('cancel');

// Queries
export const statusQuery = defineQuery<DeploymentStatus>('status');
export const progressQuery = defineQuery<number>('progress');

export interface BotDeploymentInput {
  botName: string;
  botType: 'discord' | 'slack' | 'telegram';
  config: Record<string, any>;
  owner: string;
}

export interface DeploymentStatus {
  step: string;
  progress: number; // 0-100
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export async function botDeploymentWorkflow(
  input: BotDeploymentInput
): Promise<{ success: boolean; botId?: string; error?: string }> {
  let status: DeploymentStatus = {
    step: 'starting',
    progress: 0,
    status: 'running',
  };

  let paused = false;
  let cancelled = false;
  let botId: string | undefined;

  // Signal handlers
  setHandler(pauseSignal, () => {
    paused = true;
    status.status = 'paused';
  });

  setHandler(resumeSignal, () => {
    paused = false;
    status.status = 'running';
  });

  setHandler(cancelSignal, () => {
    cancelled = true;
    status.status = 'cancelled';
  });

  // Query handlers
  setHandler(statusQuery, () => status);
  setHandler(progressQuery, () => status.progress);

  try {
    // Step 1: Validate configuration (10%)
    status.step = 'Validating configuration';
    status.progress = 10;
    await checkPauseOrCancel();
    
    const validationResult = await validateBotConfig(input);
    if (!validationResult.valid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Step 2: Create database record (30%)
    status.step = 'Creating database record';
    status.progress = 30;
    await checkPauseOrCancel();
    
    botId = await createBotRecord({
      name: input.botName,
      type: input.botType,
      config: input.config,
      owner: input.owner,
    });

    // Step 3: Deploy to platform (60%)
    status.step = 'Deploying to platform';
    status.progress = 60;
    await checkPauseOrCancel();
    
    let deploymentId: string;
    if (input.botType === 'discord') {
      deploymentId = await deployToDiscord(botId, input.config);
    } else if (input.botType === 'slack') {
      deploymentId = await deployToSlack(botId, input.config);
    } else {
      throw new Error(`Unsupported bot type: ${input.botType}`);
    }

    // Step 4: Health check (80%)
    status.step = 'Running health checks';
    status.progress = 80;
    await checkPauseOrCancel();
    
    const healthResult = await runHealthCheck(botId);
    if (!healthResult.healthy) {
      throw new Error(`Health check failed: ${healthResult.error}`);
    }

    // Step 5: Notify completion (100%)
    status.step = 'Sending notifications';
    status.progress = 100;
    await sendNotification({
      type: 'deployment_success',
      botId,
      botName: input.botName,
      owner: input.owner,
    });

    status.status = 'completed';
    status.step = 'Completed';

    return {
      success: true,
      botId,
    };

  } catch (error: any) {
    status.status = 'failed';
    status.error = error.message;
    status.step = 'Rolling back';

    // Rollback
    try {
      if (botId) {
        // Rollback platform deployment
        if (input.botType === 'discord') {
          await rollbackDiscordBot(botId);
        } else if (input.botType === 'slack') {
          await rollbackSlackBot(botId);
        }

        // Rollback database record
        await rollbackBotRecord(botId);
      }

      // Notify failure
      await sendNotification({
        type: 'deployment_failed',
        botName: input.botName,
        owner: input.owner,
        error: error.message,
      });
    } catch (rollbackError: any) {
      // Log rollback failure but don't throw
      console.error('[Workflow] Rollback failed:', rollbackError.message);
    }

    return {
      success: false,
      error: error.message,
    };
  }

  // Helper function to check pause/cancel
  async function checkPauseOrCancel() {
    if (cancelled) {
      throw new Error('Workflow cancelled by user');
    }

    // Wait while paused
    while (paused && !cancelled) {
      await sleep('1s');
    }

    if (cancelled) {
      throw new Error('Workflow cancelled by user');
    }
  }
}
