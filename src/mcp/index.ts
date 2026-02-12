/**
 * Model Context Protocol (MCP) Integration
 * 
 * Allows OpenCell to connect to any MCP server in the ecosystem
 * and use their tools without custom coding.
 * 
 * Usage:
 *   import { initializeMCP, getMCPClientManager } from './mcp';
 *   
 *   // Initialize on startup
 *   await initializeMCP();
 *   
 *   // Get available tools
 *   const tools = await getMCPClientManager().listAllTools();
 */

export * from './types';
export * from './client';
export * from './config-loader';
export * from './transports';
export * from './tool-adapter';
export * from './lifecycle';

export { getMCPClientManager } from './client';
export { initializeMCP, shutdownMCP, registerShutdownHandlers, getMCPStatus } from './lifecycle';
export { loadMCPConfig, getExampleConfig } from './config-loader';
export { 
  getAllMCPToolsAsAnthropicTools, 
  executeMCPTool, 
  isMCPTool,
  parseMCPToolName 
} from './tool-adapter';
