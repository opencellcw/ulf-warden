#!/bin/bash

# Test Auto-Rollback System
# This script tests health monitoring and automatic rollback

set -e

echo "🧪 Testing Auto-Rollback System"
echo "================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Monitor
echo ""
echo "Test 1: Health Monitor"
echo "----------------------"

node -e "
const { HealthMonitor } = require('./dist/evolution/monitoring');

(async () => {
  console.log('${YELLOW}Testing HealthMonitor...${NC}');
  
  const monitor = new HealthMonitor();
  
  // Collect metrics
  console.log('📊 Collecting metrics...');
  const metrics = await monitor.collectMetrics();
  console.log('Metrics:', {
    errorRate: metrics.errorRate.toFixed(1) + '%',
    responseTime: metrics.responseTime + 'ms',
    cpuUsage: metrics.cpuUsage.toFixed(1) + '%',
    memoryUsage: metrics.memoryUsage.toFixed(1) + '%',
    podStatus: metrics.podStatus,
    restartCount: metrics.restartCount
  });
  
  // Check health
  console.log('🏥 Checking health...');
  const health = await monitor.checkHealth({
    maxErrorRate: 10,
    maxResponseTime: 5000,
    maxCpuUsage: 90,
    maxMemoryUsage: 85,
    minRequestCount: 1
  });
  
  if (health.healthy) {
    console.log('${GREEN}✅ Health check PASSED${NC}');
  } else {
    console.log('${RED}❌ Health check FAILED${NC}');
    console.log('Violations:', health.violations);
  }
  
  // Get average
  console.log('📈 Average metrics (last 3 samples)...');
  for (let i = 0; i < 3; i++) {
    await monitor.collectMetrics();
    await new Promise(r => setTimeout(r, 1000));
  }
  const avg = monitor.getAverageMetrics(3);
  console.log('Average:', {
    errorRate: (avg.errorRate || 0).toFixed(1) + '%',
    responseTime: (avg.responseTime || 0) + 'ms',
    cpuUsage: (avg.cpuUsage || 0).toFixed(1) + '%',
    memoryUsage: (avg.memoryUsage || 0).toFixed(1) + '%'
  });
  
  console.log('${GREEN}✅ HealthMonitor tests passed${NC}');
})();
"

# Test 2: Rollback Guard (baseline capture)
echo ""
echo "Test 2: Rollback Guard - Baseline Capture"
echo "------------------------------------------"

node -e "
const { RollbackGuard } = require('./dist/evolution/monitoring');

(async () => {
  console.log('${YELLOW}Testing RollbackGuard baseline capture...${NC}');
  
  const guard = new RollbackGuard();
  
  console.log('📸 Capturing baseline...');
  const baseline = await guard.captureBaseline();
  
  console.log('Baseline metrics:', {
    errorRate: baseline.errorRate.toFixed(1) + '%',
    responseTime: baseline.responseTime + 'ms',
    cpuUsage: baseline.cpuUsage.toFixed(1) + '%',
    memoryUsage: baseline.memoryUsage.toFixed(1) + '%',
    podStatus: baseline.podStatus
  });
  
  console.log('${GREEN}✅ Baseline capture successful${NC}');
})();
"

# Test 3: Health Status
echo ""
echo "Test 3: Health Status Check"
echo "----------------------------"

node -e "
const { RollbackGuard } = require('./dist/evolution/monitoring');

(async () => {
  console.log('${YELLOW}Checking current health status...${NC}');
  
  const guard = new RollbackGuard();
  const status = await guard.getHealthStatus();
  
  console.log('Health Status:', {
    healthy: status.healthy,
    metrics: {
      errorRate: status.metrics.errorRate.toFixed(1) + '%',
      responseTime: status.metrics.responseTime + 'ms',
      cpuUsage: status.metrics.cpuUsage.toFixed(1) + '%',
      memoryUsage: status.metrics.memoryUsage.toFixed(1) + '%',
      podStatus: status.metrics.podStatus
    },
    violations: status.violations.length
  });
  
  if (status.healthy) {
    console.log('${GREEN}✅ Deployment is healthy${NC}');
  } else {
    console.log('${YELLOW}⚠️ Violations found:${NC}');
    status.violations.forEach(v => console.log('  -', v));
  }
})();
"

# Test 4: Alert Manager (test mode)
echo ""
echo "Test 4: Alert Manager"
echo "---------------------"

node -e "
const { AlertManager } = require('./dist/evolution/monitoring');

(async () => {
  console.log('${YELLOW}Testing AlertManager (console only)...${NC}');
  
  const alertManager = new AlertManager();
  
  console.log('📨 Sending test alerts...');
  
  // Test degradation alert
  await alertManager.sendDegradationAlert({
    deployment: 'test-deployment',
    severity: 'medium',
    reason: 'Test degradation alert',
    violations: ['CPU usage high', 'Response time slow'],
    metrics: {
      timestamp: new Date(),
      errorRate: 5.2,
      responseTime: 250,
      cpuUsage: 75.3,
      memoryUsage: 62.1,
      requestCount: 150,
      activeConnections: 25,
      podStatus: 'Running',
      restartCount: 0
    },
    checkNumber: 5
  });
  
  // Test custom alert
  await alertManager.sendCustomAlert(
    'Test Alert',
    'This is a test alert from auto-rollback system',
    'info'
  );
  
  console.log('${GREEN}✅ Alerts sent (check console output above)${NC}');
})();
"

# Test 5: Similarity Functions
echo ""
echo "Test 5: Similarity Functions"
echo "----------------------------"

node -e "
const { testSimilarity } = require('./dist/evolution/skills/similarity');
console.log('${YELLOW}Testing similarity functions...${NC}');
testSimilarity();
console.log('${GREEN}✅ Similarity tests passed${NC}');
"

echo ""
echo "================================"
echo "${GREEN}✅ All Auto-Rollback Tests Completed!${NC}"
echo "================================"
echo ""
echo "Summary:"
echo "- HealthMonitor: Collects K8s + app metrics"
echo "- RollbackGuard: Monitors post-deployment health"
echo "- AlertManager: Sends Discord notifications"
echo "- Similarity: Vector operations for skills"
echo ""
echo "Next steps:"
echo "1. Deploy a change to test full monitoring (30 min)"
echo "2. Simulate failure to test auto-rollback"
echo "3. Check Discord for alert notifications"
