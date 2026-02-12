import { Request, Response } from 'express';
import { redisCache } from '../core/redis-cache';
import { log } from '../logger';

/**
 * Cache monitoring endpoints
 * 
 * GET /api/cache/stats - Get cache statistics
 * POST /api/cache/invalidate - Invalidate cache (optional provider filter)
 * GET /api/cache/health - Health check
 */

export async function getCacheStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = redisCache.getStats();
    const info = await redisCache.getInfo();

    res.json({
      success: true,
      data: {
        stats,
        info,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    log.error('[CacheMonitor] Failed to get stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function invalidateCache(req: Request, res: Response): Promise<void> {
  try {
    const { provider } = req.body;

    await redisCache.invalidateLLMCache(provider);

    log.info('[CacheMonitor] Cache invalidated', { provider: provider || 'all' });

    res.json({
      success: true,
      message: `Cache invalidated for ${provider || 'all providers'}`
    });
  } catch (error: any) {
    log.error('[CacheMonitor] Failed to invalidate cache', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function getCacheHealth(req: Request, res: Response): Promise<void> {
  try {
    const healthy = await redisCache.healthCheck();

    res.json({
      success: true,
      healthy,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    log.error('[CacheMonitor] Health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Register cache routes
 */
export function registerCacheRoutes(app: any): void {
  app.get('/api/cache/stats', getCacheStats);
  app.post('/api/cache/invalidate', invalidateCache);
  app.get('/api/cache/health', getCacheHealth);

  log.info('[CacheMonitor] Routes registered');
}
