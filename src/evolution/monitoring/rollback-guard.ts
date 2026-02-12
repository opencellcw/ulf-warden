import { HealthMonitor, HealthMetrics, HealthThresholds } from './health-monitor';
import { AlertManager } from './alerting';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface RollbackConfig {
  monitoringDuration: number; // seconds to monitor after deployment
  checkInterval: number; // seconds between health checks
  thresholds: HealthThresholds;
  autoRollback: boolean;
  notifyOnDegradation: boolean;
}

export interface RollbackDecision {
  shouldRollback: boolean;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metrics: HealthMetrics;
  violations: string[];
}

export class RollbackGuard {
  private healthMonitor: HealthMonitor;
  private alertManager: AlertManager;
  private deploymentName: string;
  private namespace: string;

  // Default config
  private defaultConfig: RollbackConfig = {
    monitoringDuration: 1800, // 30 minutes
    checkInterval: 60, // 1 minute
    thresholds: {
      maxErrorRate: 10, // 10%
      maxResponseTime: 5000, // 5 seconds
      maxCpuUsage: 90, // 90%
      maxMemoryUsage: 85, // 85%
      minRequestCount: 1 // at least 1 request/min
    },
    autoRollback: true,
    notifyOnDegradation: true
  };

  constructor(
    deploymentName: string = 'ulf-warden-agent',
    namespace: string = 'agents',
    alertManager?: AlertManager
  ) {
    this.deploymentName = deploymentName;
    this.namespace = namespace;
    this.healthMonitor = new HealthMonitor(deploymentName, namespace);
    this.alertManager = alertManager || new AlertManager();
  }

  /**
   * Monitor deployment health and auto-rollback if degraded
   */
  async monitorPostDeploy(
    baseline: HealthMetrics,
    config: Partial<RollbackConfig> = {}
  ): Promise<{
    success: boolean;
    rolledBack: boolean;
    reason?: string;
    finalMetrics: HealthMetrics;
  }> {
    const fullConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    const endTime = startTime + (fullConfig.monitoringDuration * 1000);

    console.log('[RollbackGuard] 🔍 Starting post-deployment monitoring...');
    console.log(`[RollbackGuard] Duration: ${fullConfig.monitoringDuration}s, Check interval: ${fullConfig.checkInterval}s`);

    // Wait for deployment to stabilize (30 seconds)
    console.log('[RollbackGuard] ⏳ Waiting 30s for deployment to stabilize...');
    await this.sleep(30000);

    let checkCount = 0;
    let consecutiveDegradations = 0;
    const maxConsecutiveDegradations = 3;

    while (Date.now() < endTime) {
      checkCount++;
      console.log(`[RollbackGuard] 📊 Health check ${checkCount}...`);

      // Check health
      const decision = await this.evaluateHealth(baseline, fullConfig.thresholds);

      if (decision.shouldRollback) {
        consecutiveDegradations++;
        console.warn(`[RollbackGuard] ⚠️ Degradation detected (${consecutiveDegradations}/${maxConsecutiveDegradations})`);
        console.warn(`[RollbackGuard] Reason: ${decision.reason}`);
        console.warn(`[RollbackGuard] Violations: ${decision.violations.join(', ')}`);

        // Notify
        if (fullConfig.notifyOnDegradation) {
          await this.alertManager.sendDegradationAlert({
            deployment: this.deploymentName,
            severity: decision.severity,
            reason: decision.reason,
            violations: decision.violations,
            metrics: decision.metrics,
            checkNumber: checkCount
          });
        }

        // Rollback if critical or consecutive degradations
        if (decision.severity === 'critical' || consecutiveDegradations >= maxConsecutiveDegradations) {
          if (fullConfig.autoRollback) {
            console.error('[RollbackGuard] 🔴 CRITICAL - Initiating auto-rollback!');
            
            await this.alertManager.sendRollbackAlert({
              deployment: this.deploymentName,
              reason: decision.reason,
              violations: decision.violations,
              metrics: decision.metrics,
              automatic: true
            });

            const rollbackSuccess = await this.performRollback();
            
            return {
              success: false,
              rolledBack: rollbackSuccess,
              reason: `Auto-rollback triggered: ${decision.reason}`,
              finalMetrics: decision.metrics
            };
          } else {
            console.error('[RollbackGuard] 🔴 CRITICAL - Auto-rollback disabled, manual intervention required!');
            return {
              success: false,
              rolledBack: false,
              reason: `Critical degradation: ${decision.reason} (auto-rollback disabled)`,
              finalMetrics: decision.metrics
            };
          }
        }
      } else {
        // Reset consecutive count if health is good
        if (consecutiveDegradations > 0) {
          console.log('[RollbackGuard] ✅ Health recovered');
          consecutiveDegradations = 0;
        }
      }

      // Wait for next check
      await this.sleep(fullConfig.checkInterval * 1000);
    }

    // Monitoring completed successfully
    const finalMetrics = await this.healthMonitor.collectMetrics();
    console.log('[RollbackGuard] ✅ Monitoring completed - Deployment is healthy!');

    await this.alertManager.sendSuccessAlert({
      deployment: this.deploymentName,
      duration: fullConfig.monitoringDuration,
      checks: checkCount,
      metrics: finalMetrics
    });

    return {
      success: true,
      rolledBack: false,
      finalMetrics
    };
  }

  /**
   * Evaluate current health and decide if rollback is needed
   */
  private async evaluateHealth(
    baseline: HealthMetrics,
    thresholds: HealthThresholds
  ): Promise<RollbackDecision> {
    // Check absolute thresholds
    const healthCheck = await this.healthMonitor.checkHealth(thresholds);
    
    // Check degradation vs baseline
    const comparison = await this.healthMonitor.compareWithBaseline(baseline);

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const allViolations = [...healthCheck.violations, ...comparison.differences];

    if (comparison.metrics.podStatus !== 'Running') {
      severity = 'critical';
    } else if (comparison.metrics.errorRate > 20) {
      severity = 'critical';
    } else if (comparison.degraded && healthCheck.violations.length > 2) {
      severity = 'high';
    } else if (comparison.degraded || healthCheck.violations.length > 0) {
      severity = 'medium';
    }

    // Decide if should rollback
    const shouldRollback = 
      severity === 'critical' || 
      (severity === 'high' && comparison.degraded);

    let reason = 'Deployment is healthy';
    if (shouldRollback) {
      if (comparison.degraded) {
        reason = 'Significant degradation vs baseline';
      } else if (!healthCheck.healthy) {
        reason = 'Health thresholds exceeded';
      }
    }

    return {
      shouldRollback,
      reason,
      severity,
      metrics: comparison.metrics,
      violations: allViolations
    };
  }

  /**
   * Perform rollback to previous deployment
   */
  private async performRollback(): Promise<boolean> {
    try {
      console.log('[RollbackGuard] 🔄 Rolling back deployment...');
      
      const { stdout } = await execAsync(
        `kubectl rollout undo deployment/${this.deploymentName} -n ${this.namespace}`
      );
      
      console.log(`[RollbackGuard] Rollback command output: ${stdout}`);
      
      // Wait for rollback to complete
      console.log('[RollbackGuard] ⏳ Waiting for rollback to complete...');
      await execAsync(
        `kubectl rollout status deployment/${this.deploymentName} -n ${this.namespace} --timeout=300s`
      );
      
      console.log('[RollbackGuard] ✅ Rollback completed successfully');
      return true;
    } catch (error: any) {
      console.error('[RollbackGuard] ❌ Rollback failed:', error.message);
      return false;
    }
  }

  /**
   * Get baseline metrics before deployment
   */
  async captureBaseline(): Promise<HealthMetrics> {
    console.log('[RollbackGuard] 📸 Capturing baseline metrics...');
    
    // Collect metrics 3 times over 1 minute for more accurate baseline
    const samples: HealthMetrics[] = [];
    for (let i = 0; i < 3; i++) {
      const metrics = await this.healthMonitor.collectMetrics();
      samples.push(metrics);
      if (i < 2) await this.sleep(30000); // 30 seconds between samples
    }

    // Use average
    const avg = this.healthMonitor.getAverageMetrics(3);
    const baseline: HealthMetrics = {
      timestamp: new Date(),
      errorRate: avg.errorRate || 0,
      responseTime: avg.responseTime || 100,
      cpuUsage: avg.cpuUsage || 0,
      memoryUsage: avg.memoryUsage || 0,
      requestCount: avg.requestCount || 0,
      activeConnections: avg.activeConnections || 0,
      podStatus: samples[samples.length - 1].podStatus,
      restartCount: samples[samples.length - 1].restartCount
    };

    console.log('[RollbackGuard] ✅ Baseline captured:', {
      errorRate: `${baseline.errorRate.toFixed(1)}%`,
      responseTime: `${baseline.responseTime}ms`,
      cpuUsage: `${baseline.cpuUsage.toFixed(1)}%`,
      memoryUsage: `${baseline.memoryUsage.toFixed(1)}%`,
      podStatus: baseline.podStatus
    });

    return baseline;
  }

  /**
   * Manual rollback trigger
   */
  async triggerManualRollback(reason: string): Promise<boolean> {
    console.log(`[RollbackGuard] 🔄 Manual rollback triggered: ${reason}`);
    
    const metrics = await this.healthMonitor.collectMetrics();
    
    await this.alertManager.sendRollbackAlert({
      deployment: this.deploymentName,
      reason,
      violations: [],
      metrics,
      automatic: false
    });

    return await this.performRollback();
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    metrics: HealthMetrics;
    violations: string[];
  }> {
    const check = await this.healthMonitor.checkHealth(this.defaultConfig.thresholds);
    return {
      healthy: check.healthy,
      metrics: check.metrics,
      violations: check.violations
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
