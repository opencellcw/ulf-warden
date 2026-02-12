/**
 * Bot Type - Defines execution mode
 * - conversational: Simple Claude API (chat only)
 * - agent: Pi-powered (with tools: bash, read, write, etc.)
 */
export type BotType = 'conversational' | 'agent';

/**
 * Available tools for agent bots
 */
export type BotTool = 'bash' | 'read' | 'write' | 'edit' | 'kubectl' | 'gcloud' | 'git';

export interface BotConfig {
  name: string;
  personality: string;
  model: 'sonnet' | 'opus' | 'haiku';
  type: BotType; // ← NEW: conversational or agent
  allowedTools?: BotTool[]; // ← NEW: Tools whitelist for agent bots
  replicas: number;
  enableSlack?: boolean;
  enableDiscord?: boolean;
  enableTelegram?: boolean;
}

export interface Bot {
  id: string;
  name: string;
  personality: string;
  creatorDiscordId: string;
  createdAt: string;
  status: BotStatus;
  helmReleaseName: string;
  deploymentConfig: string; // JSON string
  lastHealthCheck?: string;
}

export type BotStatus = 'deploying' | 'running' | 'failed' | 'stopped';

export interface DeploymentResult {
  success: boolean;
  status?: string;
  podName?: string;
  error?: string;
}

export interface BotIntent {
  name: string;
  personality: string;
  model?: 'sonnet' | 'opus' | 'haiku';
  type?: BotType; // ← NEW
  allowedTools?: BotTool[]; // ← NEW
}
