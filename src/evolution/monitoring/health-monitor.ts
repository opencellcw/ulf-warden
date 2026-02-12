import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface HealthMetrics {
  timestamp: Date;
  errorRate: number;
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  requestCount: number;
  activeConnections: number;
  podStatus: 'Running' | 'Pending' | 'Failed' | 'Unknown';
  restartCount: number;
}

export interface HealthThresholds {
  maxErrorRate: number; // percentage
  maxResponseTime: number; // milliseconds
  maxCpuUsage: number; // percentage
  maxMemoryUsage: number; // percentage
  minRequestCount: number; // requests/min
}

export class HealthMonitor {
  private metrics: HealthMetrics[] = [];
  private readonly maxHistorySize = 100;
  private deploymentName: string;
  private namespace: string;

  constructor(deploymentName: string = 'ulf-warden-agent', namespace: string = 'agents') {
    this.deploymentName = deploymentName;
    this.namespace = namespace;
  }

  /**
   * Collect current health metrics from K8s and application
   */
  async collectMetrics(): Promise<HealthMetrics> {
    const [k8sMetrics, appMetrics] = await Promise.all([
      this.getK8sMetrics(),
      this.getAppMetrics()
    ]);

    const metrics: HealthMetrics = {
      timestamp: new Date(),
      errorRate: appMetrics.errorRate,
      responseTime: appMetrics.responseTime,
      cpuUsage: k8sMetrics.cpuUsage,
      memoryUsage: k8sMetrics.memoryUsage,
      requestCount: appMetrics.requestCount,
      activeConnections: appMetrics.activeConnections,
      podStatus: k8sMetrics.podStatus,
      restartCount: k8sMetrics.restartCount
    };

    // Store in history
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }

    return metrics;
  }

  /**
   * Get K8s pod metrics
   */
  private async getK8sMetrics(): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    podStatus: 'Running' | 'Pending' | 'Failed' | 'Unknown';
    restartCount: number;
  }> {
    try {
      // Get pod status
      const { stdout: statusOutput } = await execAsync(
        `kubectl get pods -n ${this.namespace} -l app=${this.deploymentName} -o json`
      );
      
      const pods = JSON.parse(statusOutput);
      if (!pods.items || pods.items.length === 0) {
        return {
          cpuUsage: 0,
          memoryUsage: 0,
          podStatus: 'Unknown',
          restartCount: 0
        };
      }

      const pod = pods.items[0];
      const podStatus = pod.status.phase as any;
      const restartCount = pod.status.containerStatuses?.[0]?.restartCount || 0;

      // Get resource usage
      const { stdout: metricsOutput } = await execAsync(
        `kubectl top pod -n ${this.namespace} -l app=${this.deploymentName} --no-headers`
      );

      // Parse metrics: NAME CPU(cores) MEMORY(bytes)
      const parts = metricsOutput.trim().split(/\s+/);
      const cpuStr = parts[1] || '0m';
      const memStr = parts[2] || '0Mi';

      // Convert CPU (e.g., "250m" -> 25%)
      const cpuValue = parseInt(cpuStr.replace('m', '')) / 10; // 1000m = 100%
      
      // Convert Memory (e.g., "512Mi" -> percentage of 2Gi limit)
      const memValue = parseInt(memStr.replace(/Mi|Gi/, ''));
      const memUnit = memStr.includes('Gi') ? 1024 : 1;
      const memoryPercentage = (memValue * memUnit / 2048) * 100; // 2Gi limit

      return {
        cpuUsage: cpuValue,
        memoryUsage: memoryPercentage,
        podStatus,
        restartCount
      };
    } catch (error) {
      console.error('[HealthMonitor] Error getting K8s metrics:', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        podStatus: 'Unknown',
        restartCount: 0
      };
    }
  }

  /**
   * Get application metrics (from ActivityTracker or logs)
   */
  private async getAppMetrics(): Promise<{
    errorRate: number;
    responseTime: number;
    requestCount: number;
    activeConnections: number;
  }> {
    try {
      // Try to get metrics from ActivityTracker via HTTP
      // For now, return mock/default values
      // TODO: Implement proper metrics collection endpoint
      
      return {
        errorRate: 0, // percentage
        responseTime: 100, // ms
        requestCount: 10, // requests/min
        activeConnections: 5
      };
    } catch (error) {
      console.error('[HealthMonitor] Error getting app metrics:', error);
      return {
        errorRate: 0,
        responseTime: 0,
        requestCount: 0,
        activeConnections: 0
      };
    }
  }

  /**
   * Check if current health is within thresholds
   */
  async checkHealth(thresholds: HealthThresholds): Promise<{
    healthy: boolean;
    violations: string[];
    metrics: HealthMetrics;
  }> {
    const metrics = await this.collectMetrics();
    const violations: string[] = [];

    if (metrics.errorRate > thresholds.maxErrorRate) {
      violations.push(`Error rate ${metrics.errorRate.toFixed(1)}% exceeds threshold ${thresholds.maxErrorRate}%`);
    }

    if (metrics.responseTime > thresholds.maxResponseTime) {
      violations.push(`Response time ${metrics.responseTime}ms exceeds threshold ${thresholds.maxResponseTime}ms`);
    }

    if (metrics.cpuUsage > thresholds.maxCpuUsage) {
      violations.push(`CPU usage ${metrics.cpuUsage.toFixed(1)}% exceeds threshold ${thresholds.maxCpuUsage}%`);
    }

    if (metrics.memoryUsage > thresholds.maxMemoryUsage) {
      violations.push(`Memory usage ${metrics.memoryUsage.toFixed(1)}% exceeds threshold ${thresholds.maxMemoryUsage}%`);
    }

    if (metrics.requestCount < thresholds.minRequestCount && metrics.requestCount > 0) {
      violations.push(`Request count ${metrics.requestCount}/min below threshold ${thresholds.minRequestCount}/min`);
    }

    if (metrics.podStatus !== 'Running') {
      violations.push(`Pod status is ${metrics.podStatus}, expected Running`);
    }

    return {
      healthy: violations.length === 0,
      violations,
      metrics
    };
  }

  /**
   * Compare current metrics with baseline (pre-deployment)
   */
  async compareWithBaseline(baseline: HealthMetrics): Promise<{
    degraded: boolean;
    differences: string[];
    metrics: HealthMetrics;
  }> {
    const current = await this.collectMetrics();
    const differences: string[] = [];
    let degraded = false;

    // Error rate increase of 50% is critical
    const errorRateIncrease = current.errorRate - baseline.errorRate;
    if (errorRateIncrease > baseline.errorRate * 0.5) {
      differences.push(`Error rate increased by ${errorRateIncrease.toFixed(1)}% (${baseline.errorRate.toFixed(1)}% → ${current.errorRate.toFixed(1)}%)`);
      degraded = true;
    }

    // Response time increase of 100% is critical
    const responseTimeIncrease = ((current.responseTime - baseline.responseTime) / baseline.responseTime) * 100;
    if (responseTimeIncrease > 100) {
      differences.push(`Response time increased by ${responseTimeIncrease.toFixed(0)}% (${baseline.responseTime}ms → ${current.responseTime}ms)`);
      degraded = true;
    }

    // Restart count increase
    if (current.restartCount > baseline.restartCount) {
      differences.push(`Pod restarted ${current.restartCount - baseline.restartCount} times`);
      degraded = true;
    }

    // Pod not running
    if (current.podStatus !== 'Running' && baseline.podStatus === 'Running') {
      differences.push(`Pod status changed from Running to ${current.podStatus}`);
      degraded = true;
    }

    return {
      degraded,
      differences,
      metrics: current
    };
  }

  /**
   * Get metrics history
   */
  getHistory(): HealthMetrics[] {
    return [...this.metrics];
  }

  /**
   * Calculate average metrics over last N samples
   */
  getAverageMetrics(samples: number = 10): Partial<HealthMetrics> {
    const recentMetrics = this.metrics.slice(-samples);
    if (recentMetrics.length === 0) {
      return {};
    }

    const sum = recentMetrics.reduce((acc, m) => ({
      errorRate: acc.errorRate + m.errorRate,
      responseTime: acc.responseTime + m.responseTime,
      cpuUsage: acc.cpuUsage + m.cpuUsage,
      memoryUsage: acc.memoryUsage + m.memoryUsage,
      requestCount: acc.requestCount + m.requestCount,
      activeConnections: acc.activeConnections + m.activeConnections
    }), {
      errorRate: 0,
      responseTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      requestCount: 0,
      activeConnections: 0
    });

    const count = recentMetrics.length;
    return {
      errorRate: sum.errorRate / count,
      responseTime: sum.responseTime / count,
      cpuUsage: sum.cpuUsage / count,
      memoryUsage: sum.memoryUsage / count,
      requestCount: sum.requestCount / count,
      activeConnections: sum.activeConnections / count
    };
  }

  /**
   * Reset metrics history
   */
  reset(): void {
    this.metrics = [];
  }
}
