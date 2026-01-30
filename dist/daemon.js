"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daemon = exports.DaemonManager = void 0;
const process_1 = require("./tools/process");
const logger_1 = require("./logger");
class DaemonManager {
    static instance;
    healthCheckIntervals = new Map();
    constructor() {
        this.startMonitoring();
    }
    static getInstance() {
        if (!DaemonManager.instance) {
            DaemonManager.instance = new DaemonManager();
        }
        return DaemonManager.instance;
    }
    startMonitoring() {
        // Check all managed processes every 30 seconds
        setInterval(() => {
            this.monitorProcesses();
        }, 30000);
        logger_1.log.info('[Daemon] Monitoring started');
    }
    monitorProcesses() {
        for (const [name, proc] of process_1.managedProcesses.entries()) {
            // Check if process is still alive
            try {
                // Sending signal 0 checks if process exists without killing it
                process.kill(proc.pid, 0);
                // Process is alive
            }
            catch (error) {
                // Process is dead but still in map
                logger_1.log.warn(`[Daemon] Process "${name}" (PID ${proc.pid}) is dead but still tracked`);
                process_1.managedProcesses.delete(name);
            }
        }
    }
    async watchProcess(name, options) {
        logger_1.log.info(`[Daemon] Watching process "${name}"`, { options });
        // If health check is provided, start periodic checking
        if (options.healthCheck && options.healthCheckInterval) {
            const intervalId = setInterval(async () => {
                try {
                    const healthy = await options.healthCheck();
                    if (!healthy) {
                        logger_1.log.warn(`[Daemon] Health check failed for "${name}"`);
                        // Process is unhealthy - could trigger restart here
                    }
                }
                catch (error) {
                    logger_1.log.error(`[Daemon] Health check error for "${name}"`, { error });
                }
            }, options.healthCheckInterval);
            this.healthCheckIntervals.set(name, intervalId);
        }
    }
    stopWatching(name) {
        const intervalId = this.healthCheckIntervals.get(name);
        if (intervalId) {
            clearInterval(intervalId);
            this.healthCheckIntervals.delete(name);
            logger_1.log.info(`[Daemon] Stopped watching process "${name}"`);
        }
    }
    getStatus() {
        const processCount = process_1.managedProcesses.size;
        const watchedCount = this.healthCheckIntervals.size;
        const lines = [
            'Daemon Manager Status:',
            `- Managed processes: ${processCount}`,
            `- Watched processes: ${watchedCount}`,
            ''
        ];
        if (processCount > 0) {
            lines.push('Active processes:');
            for (const [name, proc] of process_1.managedProcesses.entries()) {
                const uptime = Math.floor((Date.now() - proc.startedAt.getTime()) / 1000);
                lines.push(`  • ${name} (PID ${proc.pid}, uptime ${uptime}s, restarts: ${proc.restartCount})`);
            }
        }
        return lines.join('\n');
    }
    async shutdown() {
        logger_1.log.info('[Daemon] Shutting down...');
        // Stop all health checks
        for (const intervalId of this.healthCheckIntervals.values()) {
            clearInterval(intervalId);
        }
        this.healthCheckIntervals.clear();
        // Stop all managed processes
        for (const [name, proc] of process_1.managedProcesses.entries()) {
            try {
                logger_1.log.info(`[Daemon] Stopping process "${name}"...`);
                proc.process.kill('SIGTERM');
            }
            catch (error) {
                logger_1.log.error(`[Daemon] Failed to stop process "${name}"`, { error });
            }
        }
        // Wait for processes to exit
        await new Promise(resolve => setTimeout(resolve, 2000));
        logger_1.log.info('[Daemon] Shutdown complete');
    }
}
exports.DaemonManager = DaemonManager;
// Export singleton instance
exports.daemon = DaemonManager.getInstance();
