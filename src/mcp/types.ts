import { z } from 'zod';

/**
 * Model Context Protocol (MCP) - Type Definitions
 * 
 * Defines types for MCP client integration with servers
 */

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  name: string;
  command?: string;        // For stdio (e.g., "npx", "python")
  args?: string[];         // Command arguments
  env?: Record<string, string>;  // Environment variables
  url?: string;            // For SSE (e.g., "http://localhost:3001/sse")
  transport: 'stdio' | 'sse';
  enabled?: boolean;       // Allow disabling without removing config
}

/**
 * MCP Tool Definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;  // JSON Schema format
  serverName: string;
}

/**
 * MCP Resource Definition
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP Prompt Definition
 */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * MCP Server Status
 */
export interface MCPServerStatus {
  name: string;
  connected: boolean;
  transport: 'stdio' | 'sse';
  tools: number;
  resources: number;
  prompts: number;
  lastError?: string;
  lastPing?: number;
}

/**
 * MCP Tool Execution Result
 */
export interface MCPToolResult {
  success: boolean;
  content?: any;
  error?: string;
  isError?: boolean;
}

/**
 * MCP Resource Content
 */
export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}
