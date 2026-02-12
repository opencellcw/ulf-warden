import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { MCPServerConfig } from './types';
import { log } from '../logger';

/**
 * MCP Transport Layer
 * 
 * Creates and manages transport connections to MCP servers
 * Supports stdio (local process) and SSE (HTTP) transports
 */

/**
 * Create stdio transport
 * Spawns a child process and communicates via stdin/stdout
 */
export async function createStdioTransport(config: MCPServerConfig): Promise<StdioClientTransport> {
  if (!config.command) {
    throw new Error(`stdio transport requires command for server ${config.name}`);
  }

  log.info('[MCP] Creating stdio transport', {
    server: config.name,
    command: config.command,
    args: config.args
  });

  try {
    const env: Record<string, string> = {};
    
    // Add parent env (filter undefined values)
    Object.entries(process.env).forEach(([key, value]) => {
      if (value !== undefined) {
        env[key] = value;
      }
    });
    
    // Override with server-specific env
    if (config.env) {
      Object.assign(env, config.env);
    }

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env
    });

    return transport;
  } catch (error: any) {
    log.error('[MCP] Failed to create stdio transport', {
      server: config.name,
      error: error.message
    });
    throw error;
  }
}

/**
 * Create SSE transport
 * Connects to an HTTP server via Server-Sent Events
 */
export async function createSSETransport(config: MCPServerConfig): Promise<SSEClientTransport> {
  if (!config.url) {
    throw new Error(`SSE transport requires URL for server ${config.name}`);
  }

  log.info('[MCP] Creating SSE transport', {
    server: config.name,
    url: config.url
  });

  try {
    const url = new URL(config.url);
    const transport = new SSEClientTransport(url);

    return transport;
  } catch (error: any) {
    log.error('[MCP] Failed to create SSE transport', {
      server: config.name,
      error: error.message
    });
    throw error;
  }
}

/**
 * Transport factory
 * Creates appropriate transport based on configuration
 */
export async function createTransport(config: MCPServerConfig): Promise<StdioClientTransport | SSEClientTransport> {
  switch (config.transport) {
    case 'stdio':
      return await createStdioTransport(config);
    
    case 'sse':
      return await createSSETransport(config);
    
    default:
      throw new Error(`Unsupported transport type: ${config.transport}`);
  }
}

/**
 * Check if transport is healthy
 */
export function isTransportHealthy(transport: any): boolean {
  // For stdio: check if process is still running
  // For SSE: check if connection is open
  // This is a simple check - can be enhanced
  return transport !== null && transport !== undefined;
}
