import { managedProcesses } from './tools/process';
import { log } from './logger';

export interface WatchOptions {
  autoRestart: boolean;
  maxRestarts?: number;
  restartDelay?: number; // milliseconds
  healthCheck?: () => Promise<boolean>;
  healthCheckInterval?: number; // milliseconds
}

export class DaemonManager {
  private static instance: DaemonManager;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): DaemonManager {
    if (!DaemonManager.instance) {
      DaemonManager.instance = new DaemonManager();
    }
    return DaemonManager.instance;
  }

  private startMonitoring(): void {
    // Check all managed processes every 30 seconds
    setInterval(() => {
      this.monitorProcesses();
    }, 30000);

    log.info('[Daemon] Monitoring started');
  }

  private monitorProcesses(): void {
    for (const [name, proc] of managedProcesses.entries()) {
      // Check if process is still alive
      try {
        // Sending signal 0 checks if process exists without killing it
        process.kill(proc.pid, 0);
        // Process is alive
      } catch (error) {
        // Process is dead but still in map
        log.warn(`[Daemon] Process "${name}" (PID ${proc.pid}) is dead but still tracked`);
        managedProcesses.delete(name);
      }
    }
  }

  async watchProcess(name: string, options: WatchOptions): Promise<void> {
    log.info(`[Daemon] Watching process "${name}"`, { options });

    // If health check is provided, start periodic checking
    if (options.healthCheck && options.healthCheckInterval) {
      const intervalId = setInterval(async () => {
        try {
          const healthy = await options.healthCheck!();
          if (!healthy) {
            log.warn(`[Daemon] Health check failed for "${name}"`);
            // Process is unhealthy - could trigger restart here
          }
        } catch (error) {
          log.error(`[Daemon] Health check error for "${name}"`, { error });
        }
      }, options.healthCheckInterval);

      this.healthCheckIntervals.set(name, intervalId);
    }
  }

  stopWatching(name: string): void {
    const intervalId = this.healthCheckIntervals.get(name);
    if (intervalId) {
      clearInterval(intervalId);
      this.healthCheckIntervals.delete(name);
      log.info(`[Daemon] Stopped watching process "${name}"`);
    }
  }

  getStatus(): string {
    const processCount = managedProcesses.size;
    const watchedCount = this.healthCheckIntervals.size;

    const lines = [
      'Daemon Manager Status:',
      `- Managed processes: ${processCount}`,
      `- Watched processes: ${watchedCount}`,
      ''
    ];

    if (processCount > 0) {
      lines.push('Active processes:');
      for (const [name, proc] of managedProcesses.entries()) {
        const uptime = Math.floor((Date.now() - proc.startedAt.getTime()) / 1000);
        lines.push(`  • ${name} (PID ${proc.pid}, uptime ${uptime}s, restarts: ${proc.restartCount})`);
      }
    }

    return lines.join('\n');
  }

  async shutdown(): Promise<void> {
    log.info('[Daemon] Shutting down...');

    // Stop all health checks
    for (const intervalId of this.healthCheckIntervals.values()) {
      clearInterval(intervalId);
    }
    this.healthCheckIntervals.clear();

    // Stop all managed processes
    for (const [name, proc] of managedProcesses.entries()) {
      try {
        log.info(`[Daemon] Stopping process "${name}"...`);
        proc.process.kill('SIGTERM');
      } catch (error) {
        log.error(`[Daemon] Failed to stop process "${name}"`, { error });
      }
    }

    // Wait for processes to exit
    await new Promise(resolve => setTimeout(resolve, 2000));

    log.info('[Daemon] Shutdown complete');
  }
}

// Export singleton instance
export const daemon = DaemonManager.getInstance();
