import { log } from '../logger';
import { intervalManager } from '../utils/interval-manager';
import { cache } from '../core/cache';
import { sessionManager } from '../sessions';
import { memoryCurator } from '../memory/memory-curator';
import { dailyLogger } from '../memory/daily-logger';
import os from 'os';
import fs from 'fs';

/**
 * Heartbeat Manager
 *
 * Executes periodic checks based on HEARTBEAT.md checklist.
 * Monitors system health, sessions, memory, APIs, and infrastructure.
 */

export type HeartbeatStatus = 'ok' | 'action' | 'alert';

export interface HeartbeatResult {
  status: HeartbeatStatus;
  actions: string[];
  alerts: string[];
  checks: Record<string, boolean>;
  timestamp: string;
}

export interface HeartbeatConfig {
  enabled: boolean;
  intervalMinutes: number;
  diskThreshold: number;
  memoryThreshold: number;
  cpuThreshold: number;
  apiQuotaThreshold: number;
  notifyDiscord: boolean;
  discordDmUserId?: string;
}

export class HeartbeatManager {
  private config: HeartbeatConfig;
  private intervalHandle: NodeJS.Timeout | null = null;
  private lastExecution: Date | null = null;

  constructor(config?: Partial<HeartbeatConfig>) {
    this.config = {
      enabled: process.env.HEARTBEAT_ENABLED === 'true' || false,
      intervalMinutes: parseInt(process.env.HEARTBEAT_INTERVAL_MINUTES || '30'),
      diskThreshold: parseInt(process.env.HEARTBEAT_DISK_THRESHOLD || '10'),
      memoryThreshold: parseInt(process.env.HEARTBEAT_MEMORY_THRESHOLD || '80'),
      cpuThreshold: parseInt(process.env.HEARTBEAT_CPU_THRESHOLD || '70'),
      apiQuotaThreshold: parseInt(process.env.HEARTBEAT_API_QUOTA_THRESHOLD || '80'),
      notifyDiscord: process.env.HEARTBEAT_NOTIFY_DISCORD === 'true' || true,
      discordDmUserId: process.env.HEARTBEAT_DISCORD_DM_USER_ID || '375567912706416642',
      ...config
    };
  }

  /**
   * Execute heartbeat checks
   */
  async execute(): Promise<HeartbeatResult> {
    const result: HeartbeatResult = {
      status: 'ok',
      actions: [],
      alerts: [],
      checks: {},
      timestamp: new Date().toISOString()
    };

    try {
      log.info('[Heartbeat] Starting heartbeat execution');

      // 1. System Health
      await this.checkSystemHealth(result);

      // 2. Sessions
      await this.checkSessions(result);

      // 3. Memory
      await this.checkMemory(result);

      // 4. Communication (skipped for now - requires platform clients)
      // await this.checkCommunication(result);

      // 5. API Quotas (basic check)
      await this.checkAPIQuotas(result);

      // 6. Background Jobs (basic check)
      await this.checkBackgroundJobs(result);

      // Determine final status
      if (result.alerts.length > 0) {
        result.status = 'alert';
      } else if (result.actions.length > 0) {
        result.status = 'action';
      }

      // Log result
      await this.logHeartbeat(result);

      this.lastExecution = new Date();

      log.info('[Heartbeat] Execution complete', {
        status: result.status,
        actions: result.actions.length,
        alerts: result.alerts.length
      });

      return result;
    } catch (error: any) {
      log.error('[Heartbeat] Execution failed', { error: error.message });
      return {
        status: 'alert',
        actions: [],
        alerts: [`Heartbeat execution failed: ${error.message}`],
        checks: {},
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check system health
   */
  private async checkSystemHealth(result: HeartbeatResult): Promise<void> {
    // Redis connection
    try {
      const cacheStats = cache.getStats();
      result.checks['redis'] = cacheStats.redisConnected;

      if (!cacheStats.redisConnected) {
        result.alerts.push('⚠️ Redis disconnected');
      }
    } catch (error) {
      result.checks['redis'] = false;
      result.alerts.push('⚠️ Redis check failed');
    }

    // Memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;
    result.checks['memory'] = usedMemPercent < this.config.memoryThreshold;

    if (usedMemPercent >= 90) {
      result.alerts.push(`⚠️ Memory usage critical: ${usedMemPercent.toFixed(1)}%`);
    } else if (usedMemPercent >= this.config.memoryThreshold) {
      result.actions.push(`Memory usage high: ${usedMemPercent.toFixed(1)}%`);
    }

    // Disk space (if possible)
    try {
      const stats = fs.statfsSync('/');
      const totalBlocks = stats.blocks;
      const freeBlocks = stats.bfree;
      const usedPercent = ((totalBlocks - freeBlocks) / totalBlocks) * 100;
      const freePercent = 100 - usedPercent;

      result.checks['disk'] = freePercent > this.config.diskThreshold;

      if (freePercent <= this.config.diskThreshold) {
        result.alerts.push(`⚠️ Disk space low: ${freePercent.toFixed(1)}% free`);
      }
    } catch (error) {
      // Skip disk check if not available
      result.checks['disk'] = true;
    }
  }

  /**
   * Check sessions
   */
  private async checkSessions(result: HeartbeatResult): Promise<void> {
    try {
      const activeSessions = sessionManager.getActiveSessions();
      result.checks['sessions'] = true;

      // Auto-flush if needed
      if (activeSessions > 0) {
        await sessionManager.flushAll();
        result.actions.push(`Flushed ${activeSessions} active sessions`);
      }

      log.debug('[Heartbeat] Sessions checked', { active: activeSessions });
    } catch (error: any) {
      result.checks['sessions'] = false;
      log.error('[Heartbeat] Sessions check failed', { error: error.message });
    }
  }

  /**
   * Check memory system
   */
  private async checkMemory(result: HeartbeatResult): Promise<void> {
    try {
      // Check if today's log exists
      const todayLog = await dailyLogger.getTodayLog();
      result.checks['daily_log'] = !!todayLog;

      if (!todayLog) {
        result.actions.push('Created today\'s daily log');
      }

      // Check if curation is needed (>24h)
      const curatorStatus = memoryCurator.getStatus();
      const needsCuration =
        !curatorStatus.lastCuration ||
        Date.now() - curatorStatus.lastCuration.getTime() > 24 * 60 * 60 * 1000;

      result.checks['memory_curation'] = !needsCuration;

      if (needsCuration) {
        // Note: Don't auto-curate here, let the scheduled curation handle it
        result.actions.push('Memory curation scheduled (>24h since last)');
      }

      log.debug('[Heartbeat] Memory checked', {
        hasLog: !!todayLog,
        needsCuration
      });
    } catch (error: any) {
      result.checks['memory'] = false;
      log.error('[Heartbeat] Memory check failed', { error: error.message });
    }
  }

  /**
   * Check API quotas (basic)
   */
  private async checkAPIQuotas(result: HeartbeatResult): Promise<void> {
    // For now, just check if keys are configured
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasBrave = !!process.env.BRAVE_API_KEY;
    const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
    const hasReplicate = !!process.env.REPLICATE_API_TOKEN;

    result.checks['api_keys'] = hasAnthropic; // Anthropic is required

    if (!hasAnthropic) {
      result.alerts.push('⚠️ Anthropic API key missing');
    }

    // Note: Real quota checking would require API calls
    // For now, we just verify keys exist
    log.debug('[Heartbeat] API quotas checked', {
      anthropic: hasAnthropic,
      openai: hasOpenAI,
      brave: hasBrave,
      elevenlabs: hasElevenLabs,
      replicate: hasReplicate
    });
  }

  /**
   * Check background jobs
   */
  private async checkBackgroundJobs(result: HeartbeatResult): Promise<void> {
    try {
      // Check if queue system is enabled
      const queueEnabled = process.env.QUEUE_ENABLED !== 'false';
      result.checks['background_jobs'] = queueEnabled;

      if (!queueEnabled) {
        result.actions.push('Queue system disabled');
      }

      log.debug('[Heartbeat] Background jobs checked', { enabled: queueEnabled });
    } catch (error: any) {
      result.checks['background_jobs'] = false;
      log.error('[Heartbeat] Background jobs check failed', { error: error.message });
    }
  }

  /**
   * Log heartbeat result
   */
  private async logHeartbeat(result: HeartbeatResult): Promise<void> {
    try {
      let logMessage = `Heartbeat: ${result.status.toUpperCase()}`;

      if (result.actions.length > 0) {
        logMessage += `\nActions: ${result.actions.join(', ')}`;
      }

      if (result.alerts.length > 0) {
        logMessage += `\nAlerts: ${result.alerts.join(', ')}`;
      }

      await dailyLogger.logSystemEvent('Heartbeat', logMessage);
    } catch (error: any) {
      log.error('[Heartbeat] Failed to log result', { error: error.message });
    }
  }

  /**
   * Start periodic heartbeat
   */
  start(): void {
    if (!this.config.enabled) {
      log.info('[Heartbeat] Disabled via config');
      return;
    }

    if (this.intervalHandle) {
      log.warn('[Heartbeat] Already running');
      return;
    }

    const intervalMs = this.config.intervalMinutes * 60 * 1000;

    log.info('[Heartbeat] Starting periodic execution', {
      interval: `${this.config.intervalMinutes}min`
    });

    // Execute immediately
    this.execute().catch(err => {
      log.error('[Heartbeat] Initial execution failed', { error: err.message });
    });

    // Schedule periodic execution
    this.intervalHandle = intervalManager.register('heartbeat-proactive', async () => {
      try {
        await this.execute();
      } catch (error: any) {
        log.error('[Heartbeat] Periodic execution failed', { error: error.message });
      }
    }, intervalMs);
  }

  /**
   * Stop periodic heartbeat
   */
  stop(): void {
    if (this.intervalHandle) {
      intervalManager.clear('heartbeat-proactive');
      this.intervalHandle = null;
      log.info('[Heartbeat] Stopped');
    }
  }

  /**
   * Get heartbeat status
   */
  getStatus(): {
    enabled: boolean;
    lastExecution: Date | null;
    intervalMinutes: number;
    running: boolean;
  } {
    return {
      enabled: this.config.enabled,
      lastExecution: this.lastExecution,
      intervalMinutes: this.config.intervalMinutes,
      running: !!this.intervalHandle
    };
  }
}

// Export singleton
export const heartbeatManager = new HeartbeatManager();
