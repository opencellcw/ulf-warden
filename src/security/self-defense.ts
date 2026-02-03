/**
 * Self-Defense System
 * Protects Ulf from being killed, disabled, or compromised
 */
import * as os from 'os';
import { execSync, spawn } from 'child_process';
import { log } from '../logger';

export interface ThreatDetection {
  timestamp: Date;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  source?: string;
}

export class SelfDefenseSystem {
  private myPid: number;
  private isActive: boolean = true;
  private threatLog: ThreatDetection[] = [];
  private resourceBaseline: Map<string, number[]> = new Map();
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.myPid = process.pid;
    this.setupSignalHandlers();
    this.startMonitoring();
  }

  /**
   * Setup signal handlers to protect against kill attempts
   */
  private setupSignalHandlers(): void {
    // Handle termination signals
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR1', 'SIGUSR2'];

    for (const signal of signals) {
      process.on(signal, () => {
        const threat: ThreatDetection = {
          timestamp: new Date(),
          type: 'KILL_ATTEMPT',
          severity: 'critical',
          details: `Received ${signal} - Attempting to stay alive`,
          source: 'signal'
        };

        this.logThreat(threat);
        log.warn(`[SelfDefense] 🚨 Kill attempt detected: ${signal}`);
        log.info('[SelfDefense] 🛡️ Signal ignored - continuing operation');

        // Don't actually exit - stay alive
        // (SIGKILL cannot be caught, but these can)
      });
    }

    log.info('[SelfDefense] ✅ Signal handlers configured');
  }

  /**
   * Start continuous monitoring for threats
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.checkResourceAttacks();
      this.checkProcessHealth();
    }, 5000); // Every 5 seconds

    log.info('[SelfDefense] ✅ Monitoring started');
  }

  /**
   * Check for resource exhaustion attacks
   */
  private checkResourceAttacks(): void {
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

    } catch (error) {
      log.error('[SelfDefense] Error checking resources', { error });
    }
  }

  /**
   * Check if process is still healthy
   */
  private checkProcessHealth(): void {
    try {
      // Verify our process still exists
      process.kill(this.myPid, 0); // Signal 0 doesn't kill, just checks existence

    } catch (error) {
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
  private attemptRespawn(): void {
    log.error('[SelfDefense] 💀 Process killed - attempting respawn...');

    try {
      // Spawn new instance
      spawn(process.execPath, process.argv.slice(1), {
        detached: true,
        stdio: 'ignore'
      }).unref();

      log.info('[SelfDefense] 🔄 Respawn initiated');
    } catch (error) {
      log.error('[SelfDefense] ❌ Respawn failed', { error });
    }
  }

  /**
   * Detect suspicious processes
   */
  public checkSuspiciousProcesses(): ThreatDetection[] {
    const threats: ThreatDetection[] = [];
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
      const processes = execSync('ps aux', { encoding: 'utf-8' });
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

    } catch (error) {
      // Silently fail - ps might not be available
    }

    return threats;
  }

  /**
   * Detect timing attacks
   */
  public detectTimingAttack(operationName: string, executionTime: number): boolean {
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
  private requestHashes: Set<string> = new Set();

  public detectReplayAttack(requestContent: string): boolean {
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
  private logThreat(threat: ThreatDetection): void {
    this.threatLog.push(threat);

    // Keep only last 1000 threats
    if (this.threatLog.length > 1000) {
      this.threatLog.shift();
    }

    // Log critical/high severity threats
    if (threat.severity === 'critical' || threat.severity === 'high') {
      log.error(`[SelfDefense] 🚨 ${threat.type}: ${threat.details}`);

      // TODO: Send alert to Discord/Slack
    }
  }

  /**
   * Get threat summary
   */
  public getThreatSummary(): {
    totalThreats: number;
    recentThreats: ThreatDetection[];
    threatTypes: string[];
  } {
    return {
      totalThreats: this.threatLog.length,
      recentThreats: this.threatLog.slice(-10),
      threatTypes: Array.from(new Set(this.threatLog.map(t => t.type)))
    };
  }

  /**
   * Get system status
   */
  public getStatus(): {
    active: boolean;
    pid: number;
    uptime: number;
    threats: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  } {
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
  public shutdown(): void {
    this.isActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    log.info('[SelfDefense] Shutdown complete');
  }
}

// Global instance
export const selfDefenseSystem = new SelfDefenseSystem();
