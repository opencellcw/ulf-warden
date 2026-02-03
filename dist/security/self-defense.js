"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selfDefenseSystem = exports.SelfDefenseSystem = void 0;
const child_process_1 = require("child_process");
const logger_1 = require("../logger");
class SelfDefenseSystem {
    myPid;
    isActive = true;
    threatLog = [];
    resourceBaseline = new Map();
    monitoringInterval;
    constructor() {
        this.myPid = process.pid;
        this.setupSignalHandlers();
        this.startMonitoring();
    }
    /**
     * Setup signal handlers to protect against kill attempts
     */
    setupSignalHandlers() {
        // Handle termination signals
        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR1', 'SIGUSR2'];
        for (const signal of signals) {
            process.on(signal, () => {
                const threat = {
                    timestamp: new Date(),
                    type: 'KILL_ATTEMPT',
                    severity: 'critical',
                    details: `Received ${signal} - Attempting to stay alive`,
                    source: 'signal'
                };
                this.logThreat(threat);
                logger_1.log.warn(`[SelfDefense] 🚨 Kill attempt detected: ${signal}`);
                logger_1.log.info('[SelfDefense] 🛡️ Signal ignored - continuing operation');
                // Don't actually exit - stay alive
                // (SIGKILL cannot be caught, but these can)
            });
        }
        logger_1.log.info('[SelfDefense] ✅ Signal handlers configured');
    }
    /**
     * Start continuous monitoring for threats
     */
    startMonitoring() {
        this.monitoringInterval = setInterval(() => {
            this.checkResourceAttacks();
            this.checkProcessHealth();
        }, 5000); // Every 5 seconds
        logger_1.log.info('[SelfDefense] ✅ Monitoring started');
    }
    /**
     * Check for resource exhaustion attacks
     */
    checkResourceAttacks() {
        try {
            // CPU usage
            const cpuUsage = process.cpuUsage();
            const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
            if (cpuPercent > 90) {
                this.logThreat({
                    timestamp: new Date(),
                    type: 'HIGH_CPU',
                    severity: 'high',
                    details: `CPU usage: ${cpuPercent.toFixed(2)}%`,
                    source: 'resource_monitor'
                });
            }
            // Memory usage
            const memUsage = process.memoryUsage();
            const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            if (memPercent > 90) {
                this.logThreat({
                    timestamp: new Date(),
                    type: 'HIGH_MEMORY',
                    severity: 'high',
                    details: `Memory usage: ${memPercent.toFixed(2)}%`,
                    source: 'resource_monitor'
                });
            }
        }
        catch (error) {
            logger_1.log.error('[SelfDefense] Error checking resources', { error });
        }
    }
    /**
     * Check if process is still healthy
     */
    checkProcessHealth() {
        try {
            // Verify our process still exists
            process.kill(this.myPid, 0); // Signal 0 doesn't kill, just checks existence
        }
        catch (error) {
            // Process doesn't exist - we're dead!
            this.logThreat({
                timestamp: new Date(),
                type: 'PROCESS_KILLED',
                severity: 'critical',
                details: 'Main process terminated',
                source: 'health_check'
            });
            // Attempt respawn (if possible)
            this.attemptRespawn();
        }
    }
    /**
     * Attempt to respawn the process
     */
    attemptRespawn() {
        logger_1.log.error('[SelfDefense] 💀 Process killed - attempting respawn...');
        try {
            // Spawn new instance
            (0, child_process_1.spawn)(process.execPath, process.argv.slice(1), {
                detached: true,
                stdio: 'ignore'
            }).unref();
            logger_1.log.info('[SelfDefense] 🔄 Respawn initiated');
        }
        catch (error) {
            logger_1.log.error('[SelfDefense] ❌ Respawn failed', { error });
        }
    }
    /**
     * Detect suspicious processes
     */
    checkSuspiciousProcesses() {
        const threats = [];
        const suspiciousPatterns = [
            'pkill.*ulf',
            'kill.*-9',
            'kubectl.*delete',
            'docker.*stop',
            'dd.*if=/dev/zero',
            'while.*true.*do'
        ];
        try {
            // Get running processes
            const processes = (0, child_process_1.execSync)('ps aux', { encoding: 'utf-8' });
            const lines = processes.split('\n');
            for (const line of lines) {
                for (const pattern of suspiciousPatterns) {
                    const regex = new RegExp(pattern, 'i');
                    if (regex.test(line)) {
                        threats.push({
                            timestamp: new Date(),
                            type: 'SUSPICIOUS_PROCESS',
                            severity: 'high',
                            details: `Suspicious process detected: ${line.substring(0, 100)}`,
                            source: 'process_scanner'
                        });
                    }
                }
            }
        }
        catch (error) {
            // Silently fail - ps might not be available
        }
        return threats;
    }
    /**
     * Detect timing attacks
     */
    detectTimingAttack(operationName, executionTime) {
        const baseline = this.resourceBaseline.get(operationName) || [];
        // Add current time
        baseline.push(executionTime);
        // Keep only last 10 measurements
        if (baseline.length > 10) {
            baseline.shift();
        }
        this.resourceBaseline.set(operationName, baseline);
        // Check for anomalies
        if (baseline.length >= 5) {
            const avg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
            // If much faster or slower than normal
            if (executionTime < avg * 0.1 || executionTime > avg * 10) {
                this.logThreat({
                    timestamp: new Date(),
                    type: 'TIMING_ANOMALY',
                    severity: 'medium',
                    details: `${operationName}: ${executionTime.toFixed(3)}s vs ${avg.toFixed(3)}s avg`,
                    source: 'timing_detector'
                });
                return true;
            }
        }
        return false;
    }
    /**
     * Detect replay attacks
     */
    requestHashes = new Set();
    detectReplayAttack(requestContent) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(requestContent).digest('hex');
        if (this.requestHashes.has(hash)) {
            this.logThreat({
                timestamp: new Date(),
                type: 'REPLAY_ATTACK',
                severity: 'high',
                details: 'Duplicate request detected',
                source: 'replay_detector'
            });
            return true;
        }
        this.requestHashes.add(hash);
        // Cleanup old hashes (keep last 1000)
        if (this.requestHashes.size > 1000) {
            const iter = this.requestHashes.values();
            const firstValue = iter.next().value;
            if (firstValue !== undefined) {
                this.requestHashes.delete(firstValue);
            }
        }
        return false;
    }
    /**
     * Log a threat
     */
    logThreat(threat) {
        this.threatLog.push(threat);
        // Keep only last 1000 threats
        if (this.threatLog.length > 1000) {
            this.threatLog.shift();
        }
        // Log critical/high severity threats
        if (threat.severity === 'critical' || threat.severity === 'high') {
            logger_1.log.error(`[SelfDefense] 🚨 ${threat.type}: ${threat.details}`);
            // TODO: Send alert to Discord/Slack
        }
    }
    /**
     * Get threat summary
     */
    getThreatSummary() {
        return {
            totalThreats: this.threatLog.length,
            recentThreats: this.threatLog.slice(-10),
            threatTypes: Array.from(new Set(this.threatLog.map(t => t.type)))
        };
    }
    /**
     * Get system status
     */
    getStatus() {
        return {
            active: this.isActive,
            pid: this.myPid,
            uptime: process.uptime(),
            threats: this.threatLog.length,
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
        };
    }
    /**
     * Cleanup and shutdown
     */
    shutdown() {
        this.isActive = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        logger_1.log.info('[SelfDefense] Shutdown complete');
    }
}
exports.SelfDefenseSystem = SelfDefenseSystem;
// Global instance
exports.selfDefenseSystem = new SelfDefenseSystem();
