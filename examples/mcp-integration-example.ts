/**
 * MCP Integration Example
 * 
 * Shows how to integrate MCP with OpenCell's startup sequence
 * and tool system.
 */

import { initializeMCP, getMCPClientManager, getAllMCPToolsAsAnthropicTools } from '../src/mcp';
import { log } from '../src/logger';

/**
 * Example 1: Initialize MCP on Application Startup
 * 
 * Add this to your main index.ts or startup file
 */
export async function initializeOpenCellWithMCP() {
  log.info('[Startup] Initializing OpenCell with MCP support');

  try {
    // Initialize MCP system
    // This loads mcp.json, connects to servers, and discovers tools
    await initializeMCP();

    log.info('[Startup] MCP initialization complete');

    // Continue with rest of application startup
    // ...

  } catch (error: any) {
    log.error('[Startup] MCP initialization failed', {
      error: error.message
    });
    
    // Application can still run without MCP
    // Tools will just be limited to native ones
  }
}

/**
 * Example 2: Get All Available Tools (Native + MCP)
 * 
 * Merge native OpenCell tools with MCP tools
 */
export async function getAllAvailableTools() {
  // Get native OpenCell tools
  const nativeTools = [
    {
      name: 'execute_shell',
      description: 'Execute shell commands',
      input_schema: { ... }
    },
    {
      name: 'read_file',
      description: 'Read file contents',
      input_schema: { ... }
    }
    // ... more native tools
  ];

  // Get MCP tools
  const mcpTools = await getAllMCPToolsAsAnthropicTools();

  // Merge both
  const allTools = [...nativeTools, ...mcpTools];

  log.info('[Tools] Available tools', {
    native: nativeTools.length,
    mcp: mcpTools.length,
    total: allTools.length
  });

  return allTools;
}

/**
 * Example 3: Check MCP Status Before Using
 */
export async function checkMCPHealth() {
  const mcpClient = getMCPClientManager();
  const servers = mcpClient.getConnectedServers();

  if (servers.length === 0) {
    log.warn('[Health] No MCP servers connected');
    return false;
  }

  // Ping each server
  for (const serverName of servers) {
    const isHealthy = await mcpClient.pingServer(serverName);
    if (!isHealthy) {
      log.warn('[Health] MCP server unhealthy', { server: serverName });
    }
  }

  return true;
}

/**
 * Example 4: Manually Execute MCP Tool
 */
export async function executeMCPToolExample() {
  const mcpClient = getMCPClientManager();

  // Check if server is connected
  if (!mcpClient.isConnected('brave-search')) {
    log.error('[Example] Brave Search server not connected');
    return;
  }

  // Execute tool
  const result = await mcpClient.executeTool(
    'brave-search',
    'brave_web_search',
    {
      query: 'Model Context Protocol',
      count: 5
    }
  );

  if (result.success) {
    log.info('[Example] Search successful', {
      content: result.content
    });
  } else {
    log.error('[Example] Search failed', {
      error: result.error
    });
  }

  return result;
}

/**
 * Example 5: List Available Tools for User
 */
export async function listToolsForUser() {
  const mcpClient = getMCPClientManager();
  const servers = mcpClient.getAllServerStatuses();

  console.log('📦 Available MCP Tools:\n');

  for (const server of servers) {
    console.log(`\n🔌 ${server.name} (${server.tools} tools)`);
    
    const tools = mcpClient.getServerTools(server.name);
    tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
  }
}

/**
 * Example 6: Handle MCP Tool Call in Agent Loop
 */
export async function handleToolCallInAgent(toolName: string, args: any) {
  // Check if it's an MCP tool
  if (!toolName.startsWith('mcp_')) {
    // Not an MCP tool, handle as native
    return handleNativeTool(toolName, args);
  }

  // Parse MCP tool name
  const parts = toolName.split('_');
  const serverName = parts[1];
  const originalToolName = parts.slice(2).join('_');

  const mcpClient = getMCPClientManager();

  // Execute MCP tool
  const result = await mcpClient.executeTool(
    serverName,
    originalToolName,
    args
  );

  if (!result.success) {
    return `Error: ${result.error}`;
  }

  // Format result for LLM
  return formatMCPResult(result);
}

function handleNativeTool(toolName: string, args: any): any {
  // Handle native tools
  // ...
}

function formatMCPResult(result: any): string {
  // Format MCP result for display
  if (Array.isArray(result.content)) {
    return result.content
      .map((item: any) => item.text || JSON.stringify(item))
      .join('\n\n');
  }
  return JSON.stringify(result.content, null, 2);
}

/**
 * Example 7: Dynamic Server Connection
 */
export async function connectToNewServer() {
  const mcpClient = getMCPClientManager();

  // Connect to a new server dynamically
  await mcpClient.connectServer({
    name: 'memory',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    transport: 'stdio',
    enabled: true
  });

  log.info('[Example] Connected to memory server');

  // List new tools
  const tools = mcpClient.getServerTools('memory');
  console.log(`Memory server provides ${tools.length} tools`);
}

/**
 * Example 8: Graceful Shutdown
 */
export async function shutdownExample() {
  log.info('[Shutdown] Cleaning up MCP connections');

  const mcpClient = getMCPClientManager();
  
  // Disconnect all servers
  await mcpClient.disconnectAll();

  log.info('[Shutdown] MCP cleanup complete');
}

/**
 * Example 9: Error Handling
 */
export async function robustMCPExecution() {
  const mcpClient = getMCPClientManager();

  try {
    // Try to execute tool
    const result = await mcpClient.executeTool(
      'github',
      'create_issue',
      {
        owner: 'myorg',
        repo: 'myrepo',
        title: 'Bug report',
        body: 'Description of bug'
      }
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.content;

  } catch (error: any) {
    log.error('[MCP] Tool execution failed', {
      error: error.message
    });

    // Fallback to alternative approach
    return 'Failed to create issue. Please try manually.';
  }
}

/**
 * Example 10: Monitoring and Metrics
 */
export function setupMCPMonitoring() {
  const mcpClient = getMCPClientManager();

  // Check every minute
  setInterval(async () => {
    const servers = mcpClient.getAllServerStatuses();
    
    // Log metrics
    log.info('[Metrics] MCP Status', {
      servers: servers.length,
      totalTools: servers.reduce((sum, s) => sum + s.tools, 0),
      connected: servers.filter(s => s.connected).length
    });

    // Alert if any server is down
    const downServers = servers.filter(s => !s.connected);
    if (downServers.length > 0) {
      log.warn('[Alert] MCP servers down', {
        servers: downServers.map(s => s.name)
      });
    }
  }, 60000); // Every minute
}

// Export all examples
export default {
  initializeOpenCellWithMCP,
  getAllAvailableTools,
  checkMCPHealth,
  executeMCPToolExample,
  listToolsForUser,
  handleToolCallInAgent,
  connectToNewServer,
  shutdownExample,
  robustMCPExecution,
  setupMCPMonitoring
};
