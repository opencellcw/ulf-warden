/**
 * Replicate Auto-Sync System
 * 
 * Automatically syncs Replicate models daily:
 * - Discovers new models
 * - Updates existing models
 * - Tracks versions
 * - Maintains embeddings
 * 
 * Runs via cron: Every day at 3 AM
 */

import { getCronManager } from '../scheduler/cron-manager';
import { getReplicateRegistry } from './model-registry';
import { log } from '../logger';

export async function setupReplicateAutoSync(): Promise<void> {
  const cronManager = getCronManager();

  // Check if sync job already exists
  const existingJobs = cronManager.listJobs();
  const syncJob = existingJobs.find(j => j.name === 'replicate-model-sync');

  if (syncJob) {
    log.info('[ReplicateAutoSync] Sync job already exists', { jobId: syncJob.id });
    return;
  }

  // Create daily sync job (using Discord message as trigger for now)
  // In the future, we'll add a 'custom' task type for internal functions
  await cronManager.addJob({
    name: 'replicate-model-sync',
    expression: '0 3 * * *', // Every day at 3 AM
    task: {
      type: 'custom',
      data: {
        action: 'syncReplicateModels',
      },
    },
    metadata: {
      description: 'Sync Replicate models from API',
      autoCreated: true,
      internal: true,
    },
  });

  log.info('[ReplicateAutoSync] Daily sync job created');
}

/**
 * Execute sync (called by cron job)
 */
export async function syncReplicateModels(): Promise<void> {
  log.info('[ReplicateAutoSync] Starting scheduled sync');

  try {
    const registry = getReplicateRegistry();
    const result = await registry.syncModels();

    log.info('[ReplicateAutoSync] Sync completed', {
      added: result.added,
      updated: result.updated,
      errors: result.errors,
    });

    // Get updated stats
    const stats = registry.getStats();
    log.info('[ReplicateAutoSync] Registry stats', {
      totalModels: stats.totalModels,
      categories: Object.keys(stats.categories).length,
    });
  } catch (error: any) {
    log.error('[ReplicateAutoSync] Sync failed', {
      error: error.message,
    });
  }
}

/**
 * Manual sync trigger
 */
export async function triggerManualSync(): Promise<{
  success: boolean;
  message: string;
  stats?: any;
}> {
  try {
    log.info('[ReplicateAutoSync] Manual sync triggered');

    const registry = getReplicateRegistry();
    const result = await registry.syncModels(true); // Force full sync

    const stats = registry.getStats();

    return {
      success: true,
      message: `✅ Sync completed!\n\nAdded: ${result.added}\nUpdated: ${result.updated}\nErrors: ${result.errors}\n\nTotal models: ${stats.totalModels}`,
      stats,
    };
  } catch (error: any) {
    log.error('[ReplicateAutoSync] Manual sync failed', {
      error: error.message,
    });

    return {
      success: false,
      message: `❌ Sync failed: ${error.message}`,
    };
  }
}
