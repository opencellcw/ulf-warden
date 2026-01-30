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
  type: 'slack_message' | 'custom';
  data: any;  // Task-specific data
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
