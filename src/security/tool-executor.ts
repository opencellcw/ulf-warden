/**
 * Secure Tool Executor
 *
 * Implements OpenClaw-Security best practices:
 * 1. Tool execution timeouts (30s default)
 * 2. Concurrent tool limits (5 per user)
 * 3. Tool blocklist checking
 *
 * Inspired by: https://github.com/cloudwalk/openclaw-security
 */

import { log } from '../logger';
import { isToolBlocked, getToolSecurityInfo, logBlockedToolAttempt } from '../config/blocked-tools';
import { retryEngine } from '../core/retry-engine';
import { featureFlags, Feature } from '../core/feature-flags';

// Configuration
const TOOL_TIMEOUT_MS = parseInt(process.env.TOOL_TIMEOUT_MS || '30000'); // 30 seconds
const MAX_CONCURRENT_TOOLS = parseInt(process.env.MAX_CONCURRENT_TOOLS || '5'); // 5 tools per user

// Track concurrent tool executions per user
const userToolCounts = new Map<string, number>();

// Track active tool executions for cleanup
const activeTools = new Map<string, NodeJS.Timeout>();

/**
 * Execute a tool with timeout and concurrency control
 */
export async function executeToolSecurely<T>(
  toolName: string,
  userId: string,
  executor: () => Promise<T>
): Promise<T> {
  // 1. Check if tool is blocked
  const securityInfo = getToolSecurityInfo(toolName);
  if (securityInfo.blocked) {
    logBlockedToolAttempt(toolName, userId, securityInfo.reason || 'Security policy');
    throw new Error(
      `Tool "${toolName}" is blocked by security policy.\n` +
      `Reason: ${securityInfo.reason}\n` +
      `Contact admin if you need access to this tool.`
    );
  }

  // 2. Check concurrent tool limit
  const currentCount = userToolCounts.get(userId) || 0;
  if (currentCount >= MAX_CONCURRENT_TOOLS) {
    log.warn('[ToolExecutor] Concurrent tool limit reached', {
      tool: toolName,
      userId: userId.substring(0, 12) + '...',
      current: currentCount,
      max: MAX_CONCURRENT_TOOLS
    });
    throw new Error(
      `Too many concurrent tool executions (${currentCount}/${MAX_CONCURRENT_TOOLS}).\n` +
      `Please wait for previous tools to complete.`
    );
  }

  // 3. Increment concurrent count
  userToolCounts.set(userId, currentCount + 1);
  const executionId = `${userId}_${toolName}_${Date.now()}`;

  log.debug('[ToolExecutor] Tool execution started', {
    tool: toolName,
    userId: userId.substring(0, 12) + '...',
    executionId,
    concurrentTools: currentCount + 1,
    timeout: `${TOOL_TIMEOUT_MS}ms`
  });

  try {
    // 4. Execute with timeout and optional retry logic
    let result: T;

    if (featureFlags.isEnabled(Feature.RETRY_ENGINE)) {
      // Execute with retry engine
      log.debug('[ToolExecutor] Using retry engine', { tool: toolName });
      result = await retryEngine.executeWithRetry(
        toolName,
        async () => {
          return await executeWithTimeout(
            executor,
            TOOL_TIMEOUT_MS,
            `Tool "${toolName}" execution exceeded ${TOOL_TIMEOUT_MS}ms timeout`
          );
        }
      );
    } else {
      // Execute without retry (legacy behavior)
      result = await executeWithTimeout(
        executor,
        TOOL_TIMEOUT_MS,
        `Tool "${toolName}" execution exceeded ${TOOL_TIMEOUT_MS}ms timeout`
      );
    }

    log.debug('[ToolExecutor] Tool execution completed', {
      tool: toolName,
      userId: userId.substring(0, 12) + '...',
      executionId
    });

    return result;
  } catch (error: any) {
    log.error('[ToolExecutor] Tool execution failed', {
      tool: toolName,
      userId: userId.substring(0, 12) + '...',
      executionId,
      error: error.message
    });
    throw error;
  } finally {
    // 5. Decrement concurrent count
    const newCount = (userToolCounts.get(userId) || 1) - 1;
    if (newCount <= 0) {
      userToolCounts.delete(userId);
    } else {
      userToolCounts.set(userId, newCount);
    }

    // Cleanup timeout tracking
    activeTools.delete(executionId);
  }
}

/**
 * Execute function with timeout
 */
function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // Create timeout
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    // Execute function
    fn()
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Get current concurrent tool count for user
 */
export function getUserToolCount(userId: string): number {
  return userToolCounts.get(userId) || 0;
}

/**
 * Get statistics about tool executor
 */
export function getToolExecutorStats(): {
  activeUsers: number;
  totalConcurrentTools: number;
  maxConcurrentTools: number;
  toolTimeoutMs: number;
  userStats: Array<{ userId: string; concurrentTools: number }>;
} {
  let totalTools = 0;
  const userStats: Array<{ userId: string; concurrentTools: number }> = [];

  for (const [userId, count] of userToolCounts.entries()) {
    totalTools += count;
    userStats.push({
      userId: userId.substring(0, 12) + '...',
      concurrentTools: count
    });
  }

  return {
    activeUsers: userToolCounts.size,
    totalConcurrentTools: totalTools,
    maxConcurrentTools: MAX_CONCURRENT_TOOLS,
    toolTimeoutMs: TOOL_TIMEOUT_MS,
    userStats
  };
}

/**
 * Initialize tool executor and log configuration
 */
export function initializeToolExecutor(): void {
  log.info('[ToolExecutor] Initialized', {
    toolTimeout: `${TOOL_TIMEOUT_MS}ms`,
    maxConcurrentTools: MAX_CONCURRENT_TOOLS,
    config: {
      TOOL_TIMEOUT_MS: process.env.TOOL_TIMEOUT_MS || 'default (30000)',
      MAX_CONCURRENT_TOOLS: process.env.MAX_CONCURRENT_TOOLS || 'default (5)'
    }
  });

  // Periodic cleanup of stale entries (every 5 minutes)
  setInterval(() => {
    // Cleanup users with 0 tools (shouldn't happen but just in case)
    for (const [userId, count] of userToolCounts.entries()) {
      if (count <= 0) {
        userToolCounts.delete(userId);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Reset all concurrent tool counts (for testing)
 */
export function resetToolExecutor(): void {
  userToolCounts.clear();
  activeTools.clear();
  log.info('[ToolExecutor] Reset all concurrent tool counts');
}
