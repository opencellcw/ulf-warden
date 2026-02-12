import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { 
  MCPServerConfig, 
  MCPServerStatus, 
  MCPTool, 
  MCPToolResult,
  MCPResource,
  MCPPrompt
} from './types';
import { createTransport } from './transports';
import { log } from '../logger';

/**
 * MCP Client Manager
 * 
 * Manages connections to multiple MCP servers and provides
 * unified interface for tool execution, resource access, and prompts
 */
export class MCPClientManager {
  private clients: Map<string, Client> = new Map();
  private configs: Map<string, MCPServerConfig> = new Map();
  private tools: Map<string, MCPTool[]> = new Map();
  private resources: Map<string, MCPResource[]> = new Map();
  private prompts: Map<string, MCPPrompt[]> = new Map();

  /**
   * Connect to an MCP server
   */
  async connectServer(config: MCPServerConfig): Promise<void> {
    log.info('[MCP] Connecting to server', { name: config.name });

    try {
      // Create transport
      const transport = await createTransport(config);

      // Create client
      const client = new Client({
        name: 'opencell-ulf-warden',
        version: '1.0.0'
      }, {
        capabilities: {
          roots: {
            listChanged: true
          },
          sampling: {}
        }
      });

      // Connect
      await client.connect(transport);

      log.info('[MCP] Connected to server', { name: config.name });

      // Store client and config
      this.clients.set(config.name, client);
      this.configs.set(config.name, config);

      // List tools
      await this.refreshServerCapabilities(config.name);

    } catch (error: any) {
      log.error('[MCP] Failed to connect to server', {
        name: config.name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Refresh server capabilities (tools, resources, prompts)
   */
  private async refreshServerCapabilities(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    try {
      // List tools
      const toolsResponse = await client.listTools();
      const tools: MCPTool[] = (toolsResponse.tools || []).map((tool: any) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema,
        serverName
      }));

      this.tools.set(serverName, tools);

      log.info('[MCP] Server capabilities refreshed', {
        server: serverName,
        tools: tools.length
      });

      // List resources (optional)
      try {
        const resourcesResponse = await client.listResources();
        const resources: MCPResource[] = (resourcesResponse.resources || []).map((res: any) => ({
          uri: res.uri,
          name: res.name,
          description: res.description,
          mimeType: res.mimeType
        }));
        this.resources.set(serverName, resources);
      } catch {
        // Resources not supported by all servers
        this.resources.set(serverName, []);
      }

      // List prompts (optional)
      try {
        const promptsResponse = await client.listPrompts();
        const prompts: MCPPrompt[] = (promptsResponse.prompts || []).map((prompt: any) => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments
        }));
        this.prompts.set(serverName, prompts);
      } catch {
        // Prompts not supported by all servers
        this.prompts.set(serverName, []);
      }

    } catch (error: any) {
      log.error('[MCP] Failed to refresh capabilities', {
        server: serverName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * List all tools from all connected servers
   */
  async listAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    for (const [serverName, tools] of this.tools.entries()) {
      allTools.push(...tools);
    }

    log.debug('[MCP] Listed all tools', {
      servers: this.clients.size,
      totalTools: allTools.length
    });

    return allTools;
  }

  /**
   * Execute a tool on a specific server
   */
  async executeTool(
    serverName: string, 
    toolName: string, 
    args: any
  ): Promise<MCPToolResult> {
    const client = this.clients.get(serverName);
    
    if (!client) {
      return {
        success: false,
        error: `Server ${serverName} not connected`,
        isError: true
      };
    }

    log.info('[MCP] Executing tool', {
      server: serverName,
      tool: toolName,
      args
    });

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });

      log.info('[MCP] Tool executed successfully', {
        server: serverName,
        tool: toolName
      });

      return {
        success: true,
        content: result.content,
        isError: Boolean(result.isError)
      };

    } catch (error: any) {
      log.error('[MCP] Tool execution failed', {
        server: serverName,
        tool: toolName,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        isError: true
      };
    }
  }

  /**
   * Get server status
   */
  getServerStatus(serverName: string): MCPServerStatus | null {
    const config = this.configs.get(serverName);
    const client = this.clients.get(serverName);
    
    if (!config || !client) {
      return null;
    }

    const tools = this.tools.get(serverName) || [];
    const resources = this.resources.get(serverName) || [];
    const prompts = this.prompts.get(serverName) || [];

    return {
      name: serverName,
      connected: true,
      transport: config.transport,
      tools: tools.length,
      resources: resources.length,
      prompts: prompts.length
    };
  }

  /**
   * Get all server statuses
   */
  getAllServerStatuses(): MCPServerStatus[] {
    const statuses: MCPServerStatus[] = [];

    for (const serverName of this.clients.keys()) {
      const status = this.getServerStatus(serverName);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  /**
   * Get tools for specific server
   */
  getServerTools(serverName: string): MCPTool[] {
    return this.tools.get(serverName) || [];
  }

  /**
   * Get all connected servers
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Check if server is connected
   */
  isConnected(serverName: string): boolean {
    return this.clients.has(serverName);
  }

  /**
   * Disconnect from a server
   */
  async disconnectServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    
    if (!client) {
      log.warn('[MCP] Server not connected', { name: serverName });
      return;
    }

    try {
      await client.close();
      this.clients.delete(serverName);
      this.configs.delete(serverName);
      this.tools.delete(serverName);
      this.resources.delete(serverName);
      this.prompts.delete(serverName);

      log.info('[MCP] Disconnected from server', { name: serverName });
    } catch (error: any) {
      log.error('[MCP] Failed to disconnect from server', {
        name: serverName,
        error: error.message
      });
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    log.info('[MCP] Disconnecting from all servers');

    const disconnectPromises = Array.from(this.clients.keys()).map(
      serverName => this.disconnectServer(serverName)
    );

    await Promise.all(disconnectPromises);

    log.info('[MCP] Disconnected from all servers');
  }

  /**
   * Ping server to check health
   */
  async pingServer(serverName: string): Promise<boolean> {
    const client = this.clients.get(serverName);
    
    if (!client) {
      return false;
    }

    try {
      const result: any = await client.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reconnect to a server
   */
  async reconnectServer(serverName: string): Promise<void> {
    const config = this.configs.get(serverName);
    
    if (!config) {
      throw new Error(`No configuration found for server ${serverName}`);
    }

    await this.disconnectServer(serverName);
    await this.connectServer(config);
  }

  /**
   * Get client instance (for advanced usage)
   */
  getClient(serverName: string): Client | undefined {
    return this.clients.get(serverName);
  }
}

/**
 * Singleton instance
 */
let mcpClientManager: MCPClientManager | null = null;

export function getMCPClientManager(): MCPClientManager {
  if (!mcpClientManager) {
    mcpClientManager = new MCPClientManager();
  }
  return mcpClientManager;
}
