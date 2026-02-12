import { readFileSync, existsSync } from 'fs';
import { MCPServerConfig } from './types';
import { log } from '../logger';

/**
 * MCP Configuration Loader
 * 
 * Loads MCP server configurations from mcp.json file
 * Supports environment variable substitution: ${VAR_NAME}
 */

/**
 * Load MCP configuration from file
 */
export function loadMCPConfig(path: string = './mcp.json'): MCPServerConfig[] {
  if (!existsSync(path)) {
    log.warn('[MCP] Configuration file not found', { path });
    return [];
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const config = JSON.parse(content);

    if (!config.mcpServers) {
      log.warn('[MCP] No mcpServers found in config');
      return [];
    }

    // Convert config object to array of MCPServerConfig
    const servers: MCPServerConfig[] = Object.entries(config.mcpServers).map(
      ([name, serverConfig]: [string, any]) => {
        const resolved = resolveEnvVars(serverConfig);
        return {
          name,
          ...resolved,
          enabled: resolved.enabled !== false  // Default to enabled
        };
      }
    );

    // Filter enabled servers
    const enabledServers = servers.filter(s => s.enabled);

    log.info('[MCP] Configuration loaded', {
      total: servers.length,
      enabled: enabledServers.length,
      servers: enabledServers.map(s => s.name)
    });

    return enabledServers;
  } catch (error: any) {
    log.error('[MCP] Failed to load configuration', {
      path,
      error: error.message
    });
    return [];
  }
}

/**
 * Resolve environment variables in configuration
 * Supports ${VAR_NAME} syntax
 */
function resolveEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    return replaceEnvVars(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveEnvVars(item));
  }

  if (typeof obj === 'object' && obj !== null) {
    const resolved: any = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveEnvVars(value);
    }
    return resolved;
  }

  return obj;
}

/**
 * Replace ${VAR} with process.env.VAR
 */
function replaceEnvVars(str: string): string {
  return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      log.warn('[MCP] Environment variable not found', { varName });
      return match;  // Keep original if not found
    }
    return value;
  });
}

/**
 * Validate server configuration
 */
export function validateServerConfig(config: MCPServerConfig): boolean {
  if (!config.name) {
    log.error('[MCP] Server config missing name');
    return false;
  }

  if (!config.transport) {
    log.error('[MCP] Server config missing transport', { name: config.name });
    return false;
  }

  if (config.transport === 'stdio') {
    if (!config.command) {
      log.error('[MCP] stdio transport requires command', { name: config.name });
      return false;
    }
  }

  if (config.transport === 'sse') {
    if (!config.url) {
      log.error('[MCP] SSE transport requires URL', { name: config.name });
      return false;
    }
  }

  return true;
}

/**
 * Get example configuration
 */
export function getExampleConfig(): any {
  return {
    mcpServers: {
      "brave-search": {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-brave-search"],
        env: {
          BRAVE_API_KEY: "${BRAVE_API_KEY}"
        },
        transport: "stdio"
      },
      "github": {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: {
          GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}"
        },
        transport: "stdio"
      },
      "postgres": {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-postgres"],
        env: {
          POSTGRES_URL: "${DATABASE_URL}"
        },
        transport: "stdio",
        enabled: false  // Disabled by default
      }
    }
  };
}
