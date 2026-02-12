/**
 * Scheduler Types
 *
 * Defines types for cron scheduling system
 */

export interface CronJob {
  id: string;
  name: string;
  expression: string;       // Cron expression (e.g., "*/5 * * * *")
  task: ScheduledTask;
  enabled: boolean;
  createdAt: string;
  lastRun?: string;
  nextRun?: string;
  userId?: string;          // Who created the job
  metadata?: Record<string, any>;
}

export interface ScheduledTask {
  type: 'slack_message' | 'discord_message' | 'telegram_message' | 'custom';
  data: any;  // Task-specific data
}

export interface DiscordMessageData {
  channel: string;      // Channel ID
  message: string;      // Message content
  thread_id?: string;   // Optional thread ID
}

export interface SlackMessageData {
  channel: string;      // Channel ID
  message: string;      // Message text
  thread_ts?: string;   // Optional thread timestamp
}

export interface TelegramMessageData {
  chat_id: string;      // Chat ID
  message: string;      // Message text
  reply_to?: number;    // Optional message ID to reply to
}

export interface CronJobCreate {
  name: string;
  expression: string;
  task: ScheduledTask;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface RelativeTime {
  value: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
}
