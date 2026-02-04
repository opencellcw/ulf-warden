"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeToolSecurely = executeToolSecurely;
exports.getUserToolCount = getUserToolCount;
exports.getToolExecutorStats = getToolExecutorStats;
exports.initializeToolExecutor = initializeToolExecutor;
exports.resetToolExecutor = resetToolExecutor;
const logger_1 = require("../logger");
const blocked_tools_1 = require("../config/blocked-tools");
const retry_engine_1 = require("../core/retry-engine");
const feature_flags_1 = require("../core/feature-flags");
// Configuration
const TOOL_TIMEOUT_MS = parseInt(process.env.TOOL_TIMEOUT_MS || '30000'); // 30 seconds
const MAX_CONCURRENT_TOOLS = parseInt(process.env.MAX_CONCURRENT_TOOLS || '5'); // 5 tools per user
// Track concurrent tool executions per user
const userToolCounts = new Map();
// Track active tool executions for cleanup
const activeTools = new Map();
/**
 * Execute a tool with timeout and concurrency control
 */
async function executeToolSecurely(toolName, userId, executor) {
    // 1. Check if tool is blocked
    const securityInfo = (0, blocked_tools_1.getToolSecurityInfo)(toolName);
    if (securityInfo.blocked) {
        (0, blocked_tools_1.logBlockedToolAttempt)(toolName, userId, securityInfo.reason || 'Security policy');
        throw new Error(`Tool "${toolName}" is blocked by security policy.\n` +
            `Reason: ${securityInfo.reason}\n` +
            `Contact admin if you need access to this tool.`);
    }
    // 2. Check concurrent tool limit
    const currentCount = userToolCounts.get(userId) || 0;
    if (currentCount >= MAX_CONCURRENT_TOOLS) {
        logger_1.log.warn('[ToolExecutor] Concurrent tool limit reached', {
            tool: toolName,
            userId: userId.substring(0, 12) + '...',
            current: currentCount,
            max: MAX_CONCURRENT_TOOLS
        });
        throw new Error(`Too many concurrent tool executions (${currentCount}/${MAX_CONCURRENT_TOOLS}).\n` +
            `Please wait for previous tools to complete.`);
    }
    // 3. Increment concurrent count
    userToolCounts.set(userId, currentCount + 1);
    const executionId = `${userId}_${toolName}_${Date.now()}`;
    logger_1.log.debug('[ToolExecutor] Tool execution started', {
        tool: toolName,
        userId: userId.substring(0, 12) + '...',
        executionId,
        concurrentTools: currentCount + 1,
        timeout: `${TOOL_TIMEOUT_MS}ms`
    });
    try {
        // 4. Execute with timeout and optional retry logic
        let result;
        if (feature_flags_1.featureFlags.isEnabled(feature_flags_1.Feature.RETRY_ENGINE)) {
            // Execute with retry engine
            logger_1.log.debug('[ToolExecutor] Using retry engine', { tool: toolName });
            result = await retry_engine_1.retryEngine.executeWithRetry(toolName, async () => {
                return await executeWithTimeout(executor, TOOL_TIMEOUT_MS, `Tool "${toolName}" execution exceeded ${TOOL_TIMEOUT_MS}ms timeout`);
            });
        }
        else {
            // Execute without retry (legacy behavior)
            result = await executeWithTimeout(executor, TOOL_TIMEOUT_MS, `Tool "${toolName}" execution exceeded ${TOOL_TIMEOUT_MS}ms timeout`);
        }
        logger_1.log.debug('[ToolExecutor] Tool execution completed', {
            tool: toolName,
            userId: userId.substring(0, 12) + '...',
            executionId
        });
        return result;
    }
    catch (error) {
        logger_1.log.error('[ToolExecutor] Tool execution failed', {
            tool: toolName,
            userId: userId.substring(0, 12) + '...',
            executionId,
            error: error.message
        });
        throw error;
    }
    finally {
        // 5. Decrement concurrent count
        const newCount = (userToolCounts.get(userId) || 1) - 1;
        if (newCount <= 0) {
            userToolCounts.delete(userId);
        }
        else {
            userToolCounts.set(userId, newCount);
        }
        // Cleanup timeout tracking
        activeTools.delete(executionId);
    }
}
/**
 * Execute function with timeout
 */
function executeWithTimeout(fn, timeoutMs, timeoutMessage) {
    return new Promise((resolve, reject) => {
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
function getUserToolCount(userId) {
    return userToolCounts.get(userId) || 0;
}
/**
 * Get statistics about tool executor
 */
function getToolExecutorStats() {
    let totalTools = 0;
    const userStats = [];
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
function initializeToolExecutor() {
    logger_1.log.info('[ToolExecutor] Initialized', {
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
function resetToolExecutor() {
    userToolCounts.clear();
    activeTools.clear();
    logger_1.log.info('[ToolExecutor] Reset all concurrent tool counts');
}
