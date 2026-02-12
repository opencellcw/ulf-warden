import { getMCPClientManager } from './client';
import { loadMCPConfig, validateServerConfig } from './config-loader';
import { log } from '../logger';
import { intervalManager } from '../utils/interval-manager';

/**
 * MCP Lifecycle Management
 * 
 * Handles initialization, health checks, and cleanup of MCP servers
 */

/**
 * Initialize all MCP servers from configuration
 */
export async function initializeMCP(): Promise<void> {
  log.info('[MCP] Initializing MCP system');

  try {
    // Load configuration
    const configs = loadMCPConfig();

    if (configs.length === 0) {
      log.info('[MCP] No MCP servers configured');
      return;
    }

    const mcpClient = getMCPClientManager();

    // Connect to all servers
    const results = await Promise.allSettled(
      configs.map(async (config) => {
        // Validate config
        if (!validateServerConfig(config)) {
          throw new Error(`Invalid configuration for server ${config.name}`);
        }

        // Connect
        await mcpClient.connectServer(config);
      })
    );

    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    log.info('[MCP] Initialization complete', {
      total: configs.length,
      successful,
      failed
    });

    // Log failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        log.error('[MCP] Server connection failed', {
          server: configs[index].name,
          error: result.reason
        });
      }
    });

    // Start health check if any servers connected
    if (successful > 0) {
      startHealthCheck();
    }

  } catch (error: any) {
    log.error('[MCP] Initialization failed', {
      error: error.message
    });
  }
}

/**
 * Health check interval (30 seconds)
 */
let healthCheckInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic health checks
 */
function startHealthCheck(): void {
  if (healthCheckInterval) {
    return; // Already running
  }

  log.info('[MCP] Starting health check (every 30 seconds)');

  healthCheckInterval = intervalManager.register('mcp-health-check', async () => {
    const mcpClient = getMCPClientManager();
    const servers = mcpClient.getConnectedServers();

    for (const serverName of servers) {
      try {
        const isHealthy = await mcpClient.pingServer(serverName);
        
        if (!isHealthy) {
          log.warn('[MCP] Server unhealthy, attempting reconnect', {
            server: serverName
          });

          // Attempt reconnection
          try {
            await mcpClient.reconnectServer(serverName);
            log.info('[MCP] Server reconnected successfully', {
              server: serverName
            });
          } catch (reconnectError: any) {
            log.error('[MCP] Reconnection failed', {
              server: serverName,
              error: reconnectError.message
            });
          }
        }
      } catch (error: any) {
        log.error('[MCP] Health check failed', {
          server: serverName,
          error: error.message
        });
      }
    }
  }, 30000); // 30 seconds
}

/**
 * Stop health checks
 */
function stopHealthCheck(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    log.info('[MCP] Health check stopped');
  }
}

/**
 * Cleanup MCP connections
 * Called on process shutdown
 */
export async function shutdownMCP(): Promise<void> {
  log.info('[MCP] Shutting down MCP system');

  try {
    // Stop health checks
    stopHealthCheck();

    // Disconnect all servers
    const mcpClient = getMCPClientManager();
    await mcpClient.disconnectAll();

    log.info('[MCP] MCP system shutdown complete');
  } catch (error: any) {
    log.error('[MCP] Shutdown failed', {
      error: error.message
    });
  }
}

/**
 * Register shutdown handlers
 */
export function registerShutdownHandlers(): void {
  // SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    log.info('[MCP] SIGINT received');
    await shutdownMCP();
    process.exit(0);
  });

  // SIGTERM (kill command)
  process.on('SIGTERM', async () => {
    log.info('[MCP] SIGTERM received');
    await shutdownMCP();
    process.exit(0);
  });

  // Uncaught exceptions
  process.on('uncaughtException', async (error) => {
    log.error('[MCP] Uncaught exception', { error: error.message });
    await shutdownMCP();
    process.exit(1);
  });
}

/**
 * Get MCP system status
 */
export function getMCPStatus(): {
  initialized: boolean;
  servers: number;
  healthCheckRunning: boolean;
} {
  const mcpClient = getMCPClientManager();
  const servers = mcpClient.getConnectedServers();

  return {
    initialized: servers.length > 0,
    servers: servers.length,
    healthCheckRunning: healthCheckInterval !== null
  };
}
