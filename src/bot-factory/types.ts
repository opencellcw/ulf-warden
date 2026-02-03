export interface BotConfig {
  name: string;
  personality: string;
  model: 'sonnet' | 'opus' | 'haiku';
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
}
