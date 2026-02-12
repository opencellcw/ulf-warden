/**
 * Async Helpers
 * 
 * Utilities for safer async operations with automatic error handling
 */

import { log } from '../logger';

/**
 * Wrap async function in try/catch with automatic logging
 * 
 * @param fn - Async function to wrap
 * @param context - Context for error logging
 * @returns Result or null if error
 * 
 * @example
 * const result = await asyncSafe(
 *   () => fetchData(url),
 *   'Fetching data from API'
 * );
 */
export async function asyncSafe<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (error: any) {
    log.error(`[AsyncSafe] ${context} failed`, {
      context,
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

/**
 * Execute async function with retries
 * 
 * @param fn - Async function to retry
 * @param options - Retry options
 * @returns Result
 * @throws Error if all retries fail
 * 
 * @example
 * const data = await withRetry(
 *   () => fetch(url),
 *   { retries: 3, delay: 1000, backoff: 2 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: number; // Multiplier for delay
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    onRetry
  } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt < retries - 1) {
        const waitTime = delay * Math.pow(backoff, attempt);
        
        log.warn(`[Retry] Attempt ${attempt + 1}/${retries} failed, retrying in ${waitTime}ms`, {
          attempt: attempt + 1,
          maxRetries: retries,
          waitTime,
          error: error.message
        });
        
        if (onRetry) {
          onRetry(attempt + 1, error);
        }
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  log.error(`[Retry] All ${retries} attempts failed`, {
    retries,
    error: lastError?.message
  });
  
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Execute async function with timeout
 * 
 * @param fn - Async function
 * @param timeoutMs - Timeout in milliseconds
 * @returns Result or throws timeout error
 * 
 * @example
 * const result = await withTimeout(
 *   () => slowOperation(),
 *   5000 // 5 seconds
 * );
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    )
  ]);
}

/**
 * Execute multiple promises with graceful error handling
 * Uses Promise.allSettled to avoid failing all on single error
 * 
 * @param promises - Array of promises
 * @returns Array of results (null for failed promises)
 * 
 * @example
 * const results = await allSettled([
 *   fetch1(),
 *   fetch2(),
 *   fetch3()
 * ]);
 * // results = [data1, null, data3] (fetch2 failed)
 */
export async function allSettledSafe<T>(
  promises: Promise<T>[]
): Promise<(T | null)[]> {
  const results = await Promise.allSettled(promises);
  
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failureCount = results.filter(r => r.status === 'rejected').length;
  
  if (failureCount > 0) {
    log.warn(`[AllSettled] Some promises failed`, {
      total: promises.length,
      success: successCount,
      failures: failureCount
    });
  }
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      log.error(`[AllSettled] Promise ${index} failed`, {
        index,
        error: result.reason?.message
      });
      return null;
    }
  });
}

/**
 * Debounce async function calls
 * 
 * @param fn - Async function to debounce
 * @param delayMs - Delay in milliseconds
 * @returns Debounced function
 * 
 * @example
 * const debouncedSearch = debounceAsync(
 *   (query: string) => searchAPI(query),
 *   300
 * );
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<ReturnType<T>> | null = null;
  
  return function(this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    if (!pendingPromise) {
      pendingPromise = new Promise((resolve, reject) => {
        timeout = setTimeout(async () => {
          try {
            const result = await fn.apply(this, args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            pendingPromise = null;
            timeout = null;
          }
        }, delayMs);
      });
    }
    
    return pendingPromise;
  };
}

/**
 * Execute async function and cache result for specified duration
 * 
 * @param fn - Async function
 * @param cacheKey - Cache key
 * @param cacheDurationMs - Cache duration
 * @returns Result (cached or fresh)
 * 
 * @example
 * const data = await cachedAsync(
 *   () => expensiveOperation(),
 *   'operation-key',
 *   60000 // 1 minute
 * );
 */
const asyncCache = new Map<string, { value: any; expires: number }>();

export async function cachedAsync<T>(
  fn: () => Promise<T>,
  cacheKey: string,
  cacheDurationMs: number = 60000
): Promise<T> {
  const now = Date.now();
  const cached = asyncCache.get(cacheKey);
  
  if (cached && cached.expires > now) {
    log.debug(`[CachedAsync] Cache hit for ${cacheKey}`);
    return cached.value;
  }
  
  log.debug(`[CachedAsync] Cache miss for ${cacheKey}, executing...`);
  const value = await fn();
  
  asyncCache.set(cacheKey, {
    value,
    expires: now + cacheDurationMs
  });
  
  return value;
}

/**
 * Clear async cache
 */
export function clearAsyncCache(key?: string): void {
  if (key) {
    asyncCache.delete(key);
  } else {
    asyncCache.clear();
  }
}

/**
 * Execute async operations in parallel with concurrency limit
 * 
 * @param items - Items to process
 * @param fn - Async function to apply to each item
 * @param concurrency - Max concurrent operations
 * @returns Array of results
 * 
 * @example
 * const results = await parallelLimit(
 *   urls,
 *   (url) => fetch(url),
 *   3 // Max 3 concurrent requests
 * );
 */
export async function parallelLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  
  for (const item of items) {
    const promise = fn(item).then(result => {
      results.push(result);
    });
    
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }
  
  await Promise.all(executing);
  return results;
}
