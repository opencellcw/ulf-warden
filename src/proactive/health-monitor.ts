import os from 'os';
import fs from 'fs';
import { cache } from '../core/cache';
import { log } from '../logger';
import { notificationManager } from './notification-manager';

/**
 * Health Monitor
 *
 * Advanced system health monitoring.
 * Checks Redis, disk, memory, CPU, APIs, and more.
 */

export interface HealthStatus {
  healthy: boolean;
  checks: {
    redis: boolean;
    disk: boolean;
    memory: boolean;
    database: boolean;
    apis: boolean;
  };
  metrics: {
    memoryUsagePercent: number;
    diskFreePercent?: number;
    redisConnected: boolean;
    uptime: number;
  };
  warnings: string[];
  errors: string[];
  timestamp: string;
}

export class HealthMonitor {
  private thresholds = {
    diskWarning: 20, // % free
    diskCritical: 10,
    memoryWarning: 80, // % used
    memoryCritical: 90
  };

  /**
   * Perform full health check
   */
  async check(): Promise<HealthStatus> {
    const status: HealthStatus = {
      healthy: true,
      checks: {
        redis: false,
        disk: false,
        memory: false,
        database: false,
        apis: false
      },
      metrics: {
        memoryUsagePercent: 0,
        redisConnected: false,
        uptime: process.uptime()
      },
      warnings: [],
      errors: [],
      timestamp: new Date().toISOString()
    };

    // Check Redis
    await this.checkRedis(status);

    // Check Disk
    await this.checkDisk(status);

    // Check Memory
    await this.checkMemory(status);

    // Check Database
    await this.checkDatabase(status);

    // Check APIs
    await this.checkAPIs(status);

    // Determine overall health
    status.healthy =
      status.checks.redis &&
      status.checks.disk &&
      status.checks.memory &&
      status.checks.database &&
      status.errors.length === 0;

    // Send notifications for critical issues
    if (!status.healthy && status.errors.length > 0) {
      await this.notifyCriticalIssues(status);
    }

    return status;
  }

  /**
   * Check Redis connection
   */
  private async checkRedis(status: HealthStatus): Promise<void> {
    try {
      const cacheStats = cache.getStats();
      status.checks.redis = cacheStats.redisConnected;
      status.metrics.redisConnected = cacheStats.redisConnected;

      if (!cacheStats.redisConnected) {
        status.errors.push('Redis disconnected');
      }
    } catch (error: any) {
      status.checks.redis = false;
      status.errors.push(`Redis check failed: ${error.message}`);
    }
  }

  /**
   * Check disk space
   */
  private async checkDisk(status: HealthStatus): Promise<void> {
    try {
      const stats = fs.statfsSync('/');
      const totalBlocks = stats.blocks;
      const freeBlocks = stats.bfree;
      const blockSize = stats.bsize;

      const totalBytes = totalBlocks * blockSize;
      const freeBytes = freeBlocks * blockSize;
      const usedBytes = totalBytes - freeBytes;

      const freePercent = (freeBytes / totalBytes) * 100;
      const usedPercent = (usedBytes / totalBytes) * 100;

      status.metrics.diskFreePercent = freePercent;

      if (freePercent <= this.thresholds.diskCritical) {
        status.checks.disk = false;
        status.errors.push(`Disk space critical: ${freePercent.toFixed(1)}% free`);
      } else if (freePercent <= this.thresholds.diskWarning) {
        status.checks.disk = true;
        status.warnings.push(`Disk space low: ${freePercent.toFixed(1)}% free`);
      } else {
        status.checks.disk = true;
      }
    } catch (error: any) {
      // Disk check not available (may not be on Linux)
      status.checks.disk = true;
      log.debug('[HealthMonitor] Disk check not available', { error: error.message });
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(status: HealthStatus): Promise<void> {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usedPercent = (usedMem / totalMem) * 100;

      status.metrics.memoryUsagePercent = usedPercent;

      if (usedPercent >= this.thresholds.memoryCritical) {
        status.checks.memory = false;
        status.errors.push(`Memory usage critical: ${usedPercent.toFixed(1)}%`);
      } else if (usedPercent >= this.thresholds.memoryWarning) {
        status.checks.memory = true;
        status.warnings.push(`Memory usage high: ${usedPercent.toFixed(1)}%`);
      } else {
        status.checks.memory = true;
      }
    } catch (error: any) {
      status.checks.memory = false;
      status.errors.push(`Memory check failed: ${error.message}`);
    }
  }

  /**
   * Check database connection
   */
  private async checkDatabase(status: HealthStatus): Promise<void> {
    try {
      // Check if database file exists and is accessible
      const dbPath = process.env.DATABASE_PATH || './data/ulf.db';

      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        status.checks.database = stats.size > 0;

        if (!status.checks.database) {
          status.errors.push('Database file is empty');
        }
      } else {
        status.checks.database = false;
        status.warnings.push('Database file not found (may not be initialized yet)');
      }
    } catch (error: any) {
      status.checks.database = false;
      status.errors.push(`Database check failed: ${error.message}`);
    }
  }

  /**
   * Check API keys configuration
   */
  private async checkAPIs(status: HealthStatus): Promise<void> {
    try {
      const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      const hasBrave = !!process.env.BRAVE_API_KEY;

      // Anthropic is required
      if (!hasAnthropic) {
        status.checks.apis = false;
        status.errors.push('Anthropic API key missing (required)');
      } else {
        status.checks.apis = true;

        // Optional APIs
        if (!hasOpenAI) {
          status.warnings.push('OpenAI API key not configured (optional)');
        }
        if (!hasBrave) {
          status.warnings.push('Brave Search API key not configured (optional)');
        }
      }
    } catch (error: any) {
      status.checks.apis = false;
      status.errors.push(`API check failed: ${error.message}`);
    }
  }

  /**
   * Notify about critical issues
   */
  private async notifyCriticalIssues(status: HealthStatus): Promise<void> {
    const criticalErrors = status.errors.filter(err =>
      err.includes('critical') || err.includes('missing') || err.includes('disconnected')
    );

    if (criticalErrors.length > 0) {
      const message = criticalErrors.join('\n');
      await notificationManager.notifyCritical('System Health Critical', message);
    }
  }

  /**
   * Get system info
   */
  getSystemInfo(): {
    platform: string;
    hostname: string;
    uptime: number;
    nodeVersion: string;
    memory: { total: number; free: number };
    cpus: number;
  } {
    return {
      platform: os.platform(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      nodeVersion: process.version,
      memory: {
        total: os.totalmem(),
        free: os.freemem()
      },
      cpus: os.cpus().length
    };
  }

  /**
   * Format health status as string
   */
  formatStatus(status: HealthStatus): string {
    const lines: string[] = [];

    lines.push(`**System Health:** ${status.healthy ? '✅ Healthy' : '🔴 Unhealthy'}`);
    lines.push('');

    // Checks
    lines.push('**Checks:**');
    for (const [check, passed] of Object.entries(status.checks)) {
      const icon = passed ? '✅' : '❌';
      lines.push(`${icon} ${check}: ${passed ? 'OK' : 'FAILED'}`);
    }
    lines.push('');

    // Metrics
    lines.push('**Metrics:**');
    lines.push(`Memory: ${status.metrics.memoryUsagePercent.toFixed(1)}%`);
    if (status.metrics.diskFreePercent !== undefined) {
      lines.push(`Disk Free: ${status.metrics.diskFreePercent.toFixed(1)}%`);
    }
    lines.push(`Redis: ${status.metrics.redisConnected ? 'Connected' : 'Disconnected'}`);
    lines.push(`Uptime: ${Math.floor(status.metrics.uptime / 60)}min`);
    lines.push('');

    // Warnings
    if (status.warnings.length > 0) {
      lines.push('**Warnings:**');
      status.warnings.forEach(w => lines.push(`⚠️ ${w}`));
      lines.push('');
    }

    // Errors
    if (status.errors.length > 0) {
      lines.push('**Errors:**');
      status.errors.forEach(e => lines.push(`🔴 ${e}`));
    }

    return lines.join('\n');
  }
}

// Export singleton
export const healthMonitor = new HealthMonitor();
