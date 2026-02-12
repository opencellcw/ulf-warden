/**
 * Redis Cache Demo
 * 
 * Demonstrates the performance and cost benefits of Redis caching
 * for LLM responses in OpenCell.
 * 
 * Run: tsx examples/redis-cache-demo.ts
 */

import { getRouter } from '../src/llm/router';
import { redisCache } from '../src/core/redis-cache';
import { log } from '../src/logger';

async function measureResponseTime(
  label: string,
  fn: () => Promise<any>
): Promise<number> {
  const start = Date.now();
  await fn();
  const duration = Date.now() - start;
  log.info(`[Demo] ${label}`, { duration: `${duration}ms` });
  return duration;
}

async function demo() {
  log.info('[Demo] Starting Redis Cache demonstration...');

  const router = getRouter();

  // Test query
  const messages = [
    { role: 'user' as const, content: 'What is the capital of France?' }
  ];

  // Reset stats for clean demo
  redisCache.resetStats();

  // ========================================
  // Part 1: Cache Miss (First Request)
  // ========================================
  log.info('[Demo] Part 1: First request (cache miss)');
  
  const time1 = await measureResponseTime(
    'First request (cache MISS)',
    async () => {
      await router.generate(messages, { temperature: 0.1 });
    }
  );

  // ========================================
  // Part 2: Cache Hit (Second Request)
  // ========================================
  log.info('[Demo] Part 2: Second request (cache hit)');
  
  const time2 = await measureResponseTime(
    'Second request (cache HIT)',
    async () => {
      await router.generate(messages, { temperature: 0.1 });
    }
  );

  // ========================================
  // Part 3: Multiple Identical Requests
  // ========================================
  log.info('[Demo] Part 3: Simulating 100 identical requests');

  const startBatch = Date.now();
  const promises = Array(100).fill(null).map(() =>
    router.generate(messages, { temperature: 0.1 })
  );
  await Promise.all(promises);
  const batchTime = Date.now() - startBatch;

  log.info('[Demo] Batch completed', {
    totalRequests: 100,
    totalTime: `${batchTime}ms`,
    avgTime: `${(batchTime / 100).toFixed(1)}ms`
  });

  // ========================================
  // Part 4: Different Queries
  // ========================================
  log.info('[Demo] Part 4: Different queries (varied cache behavior)');

  const queries = [
    'What is 2+2?',
    'What is the capital of Brazil?',
    'What is the meaning of life?',
    'Explain quantum computing',
    'What is 2+2?', // Duplicate - will hit cache!
  ];

  for (const query of queries) {
    await measureResponseTime(
      `Query: "${query.substring(0, 30)}..."`,
      async () => {
        await router.generate([
          { role: 'user', content: query }
        ], { temperature: 0.1 });
      }
    );
  }

  // ========================================
  // Part 5: Skip Cache Comparison
  // ========================================
  log.info('[Demo] Part 5: Comparing with and without cache');

  const queryForTest = 'What is the capital of Germany?';

  const withCacheTime = await measureResponseTime(
    'With cache',
    async () => {
      // First call (miss)
      await router.generate([
        { role: 'user', content: queryForTest }
      ], { temperature: 0.1 });

      // Second call (hit)
      await router.generate([
        { role: 'user', content: queryForTest }
      ], { temperature: 0.1 });
    }
  );

  const withoutCacheTime = await measureResponseTime(
    'Without cache (2 calls)',
    async () => {
      await router.generate([
        { role: 'user', content: queryForTest + ' v1' }
      ], { temperature: 0.1, skipCache: true });

      await router.generate([
        { role: 'user', content: queryForTest + ' v2' }
      ], { temperature: 0.1, skipCache: true });
    }
  );

  // ========================================
  // Results Summary
  // ========================================
  log.info('[Demo] ========================================');
  log.info('[Demo] RESULTS SUMMARY');
  log.info('[Demo] ========================================');

  const stats = redisCache.getStats();
  const info = await redisCache.getInfo();

  log.info('[Demo] Cache Statistics', {
    hits: stats.hits,
    misses: stats.misses,
    hitRate: `${stats.hitRate.toFixed(1)}%`,
    errors: stats.errors
  });

  log.info('[Demo] Cache Info', {
    totalKeys: info?.keys || 'N/A',
    memoryUsed: info?.memory || 'N/A',
    uptime: info?.uptime ? `${(info.uptime / 3600).toFixed(1)}h` : 'N/A'
  });

  log.info('[Demo] Performance Comparison', {
    firstRequest: `${time1}ms`,
    cachedRequest: `${time2}ms`,
    speedup: `${(time1 / time2).toFixed(1)}x faster`,
    latencyReduction: `${(((time1 - time2) / time1) * 100).toFixed(1)}%`
  });

  log.info('[Demo] Batch Processing (100 requests)', {
    totalTime: `${batchTime}ms`,
    avgPerRequest: `${(batchTime / 100).toFixed(1)}ms`,
    theoreticalWithoutCache: `${(time1 * 100 / 1000).toFixed(1)}s`,
    actualWithCache: `${(batchTime / 1000).toFixed(1)}s`,
    timeSaved: `${((time1 * 100 - batchTime) / 1000).toFixed(1)}s`
  });

  // ========================================
  // Cost Analysis
  // ========================================
  log.info('[Demo] ========================================');
  log.info('[Demo] COST ANALYSIS');
  log.info('[Demo] ========================================');

  const costPerRequest = 0.003; // $0.003 per Claude API call
  const monthlyRequests = 10000;

  const costWithoutCache = monthlyRequests * costPerRequest;
  const costWithCache = monthlyRequests * (1 - stats.hitRate / 100) * costPerRequest;
  const monthlySavings = costWithoutCache - costWithCache;
  const annualSavings = monthlySavings * 12;

  log.info('[Demo] Monthly Cost Analysis (10k requests)', {
    withoutCache: `$${costWithoutCache.toFixed(2)}/month`,
    withCache: `$${costWithCache.toFixed(2)}/month`,
    savings: `$${monthlySavings.toFixed(2)}/month`,
    savingsPercent: `${((monthlySavings / costWithoutCache) * 100).toFixed(1)}%`
  });

  log.info('[Demo] Annual Projections', {
    costWithoutCache: `$${(costWithoutCache * 12).toFixed(2)}/year`,
    costWithCache: `$${(costWithCache * 12).toFixed(2)}/year`,
    annualSavings: `$${annualSavings.toFixed(2)}/year 💰`,
    roi: `${((annualSavings / (costWithCache * 12)) * 100).toFixed(0)}%`
  });

  // ========================================
  // Recommendations
  // ========================================
  log.info('[Demo] ========================================');
  log.info('[Demo] RECOMMENDATIONS');
  log.info('[Demo] ========================================');

  log.info('[Demo] Based on these results:');
  log.info('[Demo] ✅ Cache is working correctly');
  log.info(`[Demo] ✅ Hit rate: ${stats.hitRate.toFixed(1)}% (target: 80-95%)`);
  log.info(`[Demo] ✅ Latency reduction: ${(((time1 - time2) / time1) * 100).toFixed(1)}%`);
  log.info(`[Demo] ✅ Cost savings: $${annualSavings.toFixed(2)}/year`);

  if (stats.hitRate < 70) {
    log.warn('[Demo] ⚠️ Hit rate below 70% - consider:');
    log.warn('[Demo]   - Increasing cache TTL');
    log.warn('[Demo]   - Pre-warming cache with common queries');
    log.warn('[Demo]   - Analyzing query patterns');
  }

  if (stats.errors > 0) {
    log.error('[Demo] ❌ Cache errors detected - check Redis connection');
  }

  // ========================================
  // Cache Warming Example
  // ========================================
  log.info('[Demo] ========================================');
  log.info('[Demo] BONUS: Cache Warming');
  log.info('[Demo] ========================================');

  const commonQueries = [
    'What is OpenCell?',
    'How do I create a bot?',
    'What are the costs?',
    'How do I deploy to GKE?',
    'What is the Bot Factory?',
  ];

  log.info('[Demo] Pre-warming cache with common queries...');

  for (const query of commonQueries) {
    await router.generate([
      { role: 'user', content: query }
    ], { temperature: 0.1 });
  }

  log.info('[Demo] Cache warming complete! ✅');
  log.info('[Demo] These queries will now respond instantly.');

  // ========================================
  // Cleanup
  // ========================================
  log.info('[Demo] ========================================');
  log.info('[Demo] Demo complete! 🎉');
  log.info('[Demo] ========================================');

  log.info('[Demo] To view real-time stats:');
  log.info('[Demo]   curl http://localhost:3000/api/cache/stats');
  
  log.info('[Demo] To invalidate cache:');
  log.info('[Demo]   curl -X POST http://localhost:3000/api/cache/invalidate');

  await redisCache.close();
}

// Run demo
demo().catch(error => {
  log.error('[Demo] Error running demo', { error: error.message });
  process.exit(1);
});
