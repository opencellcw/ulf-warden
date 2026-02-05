/**
 * Cache Middleware and Helper Functions
 *
 * Provides convenient wrappers and middleware for caching integration.
 */

import { Request, Response, NextFunction } from 'express';
import { cache, CacheNamespace } from './cache';
import { log } from '../logger';

export interface CacheOptions {
  namespace?: CacheNamespace | string;
  keyGenerator?: (...args: any[]) => string;
  ttl?: number;
}

/**
 * Wrap async function with caching
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CacheOptions = {}
): T {
  const namespace = options.namespace || CacheNamespace.API_RESPONSE;
  const keyGenerator = options.keyGenerator || ((...args: any[]) => JSON.stringify(args));
  const ttl = options.ttl;

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    return await cache.cached(namespace, key, () => fn(...args), ttl);
  }) as T;
}

/**
 * Decorator for caching method results
 */
export function Cached(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const namespace = options.namespace || CacheNamespace.API_RESPONSE;
    const keyGenerator = options.keyGenerator || ((self: any, ...args: any[]) =>
      `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`
    );
    const ttl = options.ttl;

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator(this, ...args);
      return await cache.cached(namespace, key, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}

/**
 * Express middleware for caching API responses
 */
export function apiCacheMiddleware(ttl: number = 600) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Build cache key from request
    const cacheKey = `${req.path}:${JSON.stringify(req.query)}`;

    try {
      // Check cache
      const cachedResponse = await cache.get<any>(CacheNamespace.API_RESPONSE, cacheKey);

      if (cachedResponse) {
        log.debug('[Cache Middleware] API cache HIT', { path: req.path });
        return res.json(cachedResponse);
      }

      // Cache miss - intercept response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        // Store in cache
        cache.set(CacheNamespace.API_RESPONSE, cacheKey, body, ttl).catch((error) => {
          log.error('[Cache Middleware] Failed to cache response', { error });
        });

        return originalJson(body);
      };

      next();
    } catch (error) {
      log.error('[Cache Middleware] Error', { error });
      next();
    }
  };
}

/**
 * Cache Invalidation Helpers
 */
export const CacheInvalidation = {
  /**
   * Invalidate session cache for a user
   */
  onSessionUpdate: async (userId: string): Promise<void> => {
    await cache.delete(CacheNamespace.SESSION, userId);
    log.info('[Cache] Invalidated session cache', { userId });
  },

  /**
   * Invalidate user data cache
   */
  onUserDataUpdate: async (userId: string): Promise<void> => {
    await cache.delete(CacheNamespace.USER_DATA, userId);
    log.info('[Cache] Invalidated user data cache', { userId });
  },

  /**
   * Invalidate tool result cache
   */
  onToolExecution: async (toolName: string, input: any): Promise<void> => {
    const key = `${toolName}:${JSON.stringify(input)}`;
    await cache.delete(CacheNamespace.TOOL_RESULT, key);
    log.info('[Cache] Invalidated tool cache', { toolName });
  },

  /**
   * Invalidate database query cache
   */
  onDatabaseUpdate: async (): Promise<void> => {
    await cache.deleteNamespace(CacheNamespace.DATABASE_QUERY);
    log.info('[Cache] Invalidated all database query cache');
  },

  /**
   * Invalidate workflow cache
   */
  onWorkflowUpdate: async (workflowId: string): Promise<void> => {
    await cache.delete(CacheNamespace.WORKFLOW, workflowId);
    log.info('[Cache] Invalidated workflow cache', { workflowId });
  },
};

/**
 * Convenience functions for common cache operations
 */

/**
 * Cache database query result
 */
export async function cacheQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return await cache.cached(CacheNamespace.DATABASE_QUERY, queryKey, queryFn, ttl);
}

/**
 * Cache LLM response
 */
export async function cacheLLM<T>(
  prompt: string,
  llmFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return await cache.cached(CacheNamespace.LLM_RESPONSE, prompt, llmFn, ttl);
}

/**
 * Cache tool execution result
 */
export async function cacheTool<T>(
  toolName: string,
  input: any,
  toolFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const key = `${toolName}:${JSON.stringify(input)}`;
  return await cache.cached(CacheNamespace.TOOL_RESULT, key, toolFn, ttl);
}

/**
 * Cache user session
 */
export async function cacheSession<T>(
  userId: string,
  sessionFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return await cache.cached(CacheNamespace.SESSION, userId, sessionFn, ttl);
}

/**
 * Cache workflow state
 */
export async function cacheWorkflow<T>(
  workflowId: string,
  workflowFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return await cache.cached(CacheNamespace.WORKFLOW, workflowId, workflowFn, ttl);
}
