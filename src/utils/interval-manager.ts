/**
 * Interval Manager
 * 
 * Centralized management of all setInterval calls with automatic cleanup
 * Prevents memory leaks by tracking and clearing all intervals on exit
 */

import { log } from '../logger';

interface IntervalInfo {
  id: NodeJS.Timeout;
  name: string;
  intervalMs: number;
  createdAt: number;
  callCount: number;
}

class IntervalManager {
  private intervals: Map<string, IntervalInfo> = new Map();
  private isShuttingDown: boolean = false;

  /**
   * Register a setInterval with automatic tracking
   * 
   * @param name - Unique identifier for this interval
   * @param callback - Function to call
   * @param intervalMs - Interval in milliseconds
   * @returns Interval ID
   * 
   * @example
   * intervalManager.register(
   *   'heartbeat',
   *   () => checkHealth(),
   *   30000
   * );
   */
  register(
    name: string,
    callback: () => void | Promise<void>,
    intervalMs: number
  ): NodeJS.Timeout {
    // Clear existing interval with same name
    if (this.intervals.has(name)) {
      log.warn(`[IntervalManager] Replacing existing interval: ${name}`);
      this.clear(name);
    }

    // Create wrapped callback that tracks calls
    let callCount = 0;
    const wrappedCallback = async () => {
      if (this.isShuttingDown) {
        log.debug(`[IntervalManager] Skipping ${name} (shutting down)`);
        return;
      }

      callCount++;
      
      try {
        await callback();
      } catch (error: any) {
        log.error(`[IntervalManager] Error in interval ${name}`, {
          name,
          error: error.message,
          callCount
        });
      }
    };

    // Create interval
    const intervalId = setInterval(wrappedCallback, intervalMs);

    // Store info
    this.intervals.set(name, {
      id: intervalId,
      name,
      intervalMs,
      createdAt: Date.now(),
      callCount: 0
    });

    log.debug(`[IntervalManager] Registered interval: ${name}`, {
      name,
      intervalMs,
      totalIntervals: this.intervals.size
    });

    return intervalId;
  }

  /**
   * Clear a specific interval
   * 
   * @param name - Interval name
   * 
   * @example
   * intervalManager.clear('heartbeat');
   */
  clear(name: string): void {
    const info = this.intervals.get(name);
    
    if (info) {
      clearInterval(info.id);
      this.intervals.delete(name);
      
      log.debug(`[IntervalManager] Cleared interval: ${name}`, {
        name,
        callCount: info.callCount,
        uptime: Date.now() - info.createdAt
      });
    }
  }

  /**
   * Clear all intervals (called on process exit)
   */
  clearAll(): void {
    const count = this.intervals.size;
    
    if (count === 0) {
      return;
    }

    log.info(`[IntervalManager] Clearing ${count} intervals...`);
    
    this.intervals.forEach((info, name) => {
      try {
        clearInterval(info.id);
        
        log.debug(`[IntervalManager] Cleared: ${name}`, {
          name,
          callCount: info.callCount,
          uptime: Date.now() - info.createdAt
        });
      } catch (error: any) {
        log.error(`[IntervalManager] Error clearing ${name}`, {
          name,
          error: error.message
        });
      }
    });
    
    this.intervals.clear();
    log.info(`[IntervalManager] ✅ All intervals cleared`);
  }

  /**
   * Get info about all active intervals
   */
  getStats(): {
    total: number;
    intervals: Array<{
      name: string;
      intervalMs: number;
      uptime: number;
      callCount: number;
    }>;
  } {
    const now = Date.now();
    
    return {
      total: this.intervals.size,
      intervals: Array.from(this.intervals.values()).map(info => ({
        name: info.name,
        intervalMs: info.intervalMs,
        uptime: now - info.createdAt,
        callCount: info.callCount
      }))
    };
  }

  /**
   * Check if an interval exists
   */
  has(name: string): boolean {
    return this.intervals.has(name);
  }

  /**
   * Mark manager as shutting down (prevents new interval executions)
   */
  shutdown(): void {
    this.isShuttingDown = true;
    this.clearAll();
  }
}

// Singleton instance
export const intervalManager = new IntervalManager();

// Register cleanup handlers
process.on('exit', () => {
  log.info('[IntervalManager] Process exiting, cleaning up intervals...');
  intervalManager.shutdown();
});

process.on('SIGINT', () => {
  log.info('[IntervalManager] SIGINT received, cleaning up...');
  intervalManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log.info('[IntervalManager] SIGTERM received, cleaning up...');
  intervalManager.shutdown();
  process.exit(0);
});

// Unhandled rejection handler (prevents crashes)
process.on('unhandledRejection', (reason, promise) => {
  log.error('[IntervalManager] Unhandled Promise Rejection', {
    reason,
    promise
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  log.error('[IntervalManager] Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  // Give time to log before exiting
  setTimeout(() => {
    intervalManager.shutdown();
    process.exit(1);
  }, 1000);
});

/**
 * Helper function to create managed interval
 * 
 * @example
 * const cleanup = createManagedInterval(
 *   'my-task',
 *   () => doSomething(),
 *   5000
 * );
 * 
 * // Later...
 * cleanup();
 */
export function createManagedInterval(
  name: string,
  callback: () => void | Promise<void>,
  intervalMs: number
): () => void {
  intervalManager.register(name, callback, intervalMs);
  return () => intervalManager.clear(name);
}
