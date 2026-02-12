import Anthropic from '@anthropic-ai/sdk';
import { MCPTool, MCPToolResult } from './types';
import { getMCPClientManager } from './client';
import { log } from '../logger';

/**
 * MCP Tool Adapter
 * 
 * Converts MCP tools to OpenCell's internal tool format (Anthropic Tool)
 * Handles tool execution by routing to appropriate MCP server
 */

/**
 * Convert MCP tool to Anthropic Tool format
 */
export function convertMCPToolToAnthropicTool(mcpTool: MCPTool): Anthropic.Tool {
  const toolName = `mcp_${mcpTool.serverName}_${mcpTool.name}`;

  // Convert JSON Schema to Anthropic's input_schema format
  const inputSchema = convertJSONSchemaToAnthropicSchema(mcpTool.inputSchema);

  return {
    name: toolName,
    description: `[${mcpTool.serverName}] ${mcpTool.description}\n\nMCP Server: ${mcpTool.serverName}\nOriginal tool: ${mcpTool.name}`,
    input_schema: inputSchema
  };
}

/**
 * Convert JSON Schema to Anthropic's schema format
 * Anthropic uses a subset of JSON Schema
 */
function convertJSONSchemaToAnthropicSchema(jsonSchema: any): any {
  if (!jsonSchema) {
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }

  // If it's already in the right format, return as-is
  if (jsonSchema.type && jsonSchema.properties) {
    return jsonSchema;
  }

  // Default fallback
  return {
    type: 'object',
    properties: jsonSchema.properties || {},
    required: jsonSchema.required || []
  };
}

/**
 * Execute MCP tool
 * Called by OpenCell's agent when tool is invoked
 */
export async function executeMCPTool(
  toolName: string,
  args: any
): Promise<string> {
  // Parse tool name: mcp_<server>_<tool>
  const parts = toolName.split('_');
  
  if (parts.length < 3 || parts[0] !== 'mcp') {
    throw new Error(`Invalid MCP tool name: ${toolName}`);
  }

  const serverName = parts[1];
  const originalToolName = parts.slice(2).join('_');

  log.info('[MCP-Adapter] Executing tool', {
    toolName,
    server: serverName,
    originalTool: originalToolName
  });

  const mcpClient = getMCPClientManager();

  if (!mcpClient.isConnected(serverName)) {
    return `Error: MCP server "${serverName}" is not connected`;
  }

  const result: MCPToolResult = await mcpClient.executeTool(
    serverName,
    originalToolName,
    args
  );

  if (!result.success) {
    return `Error executing tool: ${result.error}`;
  }

  // Format result content
  return formatMCPResult(result);
}

/**
 * Format MCP tool result for display
 */
function formatMCPResult(result: MCPToolResult): string {
  if (result.isError) {
    return `Error: ${JSON.stringify(result.content)}`;
  }

  if (!result.content) {
    return 'Tool executed successfully (no content returned)';
  }

  // MCP results are in content array format
  if (Array.isArray(result.content)) {
    return result.content
      .map((item: any) => {
        if (item.type === 'text') {
          return item.text;
        }
        if (item.type === 'image') {
          return `[Image: ${item.data || 'no data'}]`;
        }
        if (item.type === 'resource') {
          return `[Resource: ${item.resource?.uri || 'unknown'}]`;
        }
        return JSON.stringify(item);
      })
      .join('\n\n');
  }

  // Fallback: stringify the content
  return JSON.stringify(result.content, null, 2);
}

/**
 * Get all MCP tools as Anthropic Tools
 */
export async function getAllMCPToolsAsAnthropicTools(): Promise<Anthropic.Tool[]> {
  const mcpClient = getMCPClientManager();
  const mcpTools = await mcpClient.listAllTools();

  return mcpTools.map(convertMCPToolToAnthropicTool);
}

/**
 * Check if tool name is an MCP tool
 */
export function isMCPTool(toolName: string): boolean {
  return toolName.startsWith('mcp_');
}

/**
 * Parse MCP tool name to get server and original tool name
 */
export function parseMCPToolName(toolName: string): {
  serverName: string;
  toolName: string;
} | null {
  if (!isMCPTool(toolName)) {
    return null;
  }

  const parts = toolName.split('_');
  
  if (parts.length < 3) {
    return null;
  }

  return {
    serverName: parts[1],
    toolName: parts.slice(2).join('_')
  };
}

/**
 * Get MCP tool description with metadata
 */
export function getMCPToolDescription(mcpTool: MCPTool): string {
  return `[MCP: ${mcpTool.serverName}]
  
${mcpTool.description}

This tool is provided by the MCP server "${mcpTool.serverName}".
Original tool name: ${mcpTool.name}

To use this tool, the ${mcpTool.serverName} server must be connected.`;
}
