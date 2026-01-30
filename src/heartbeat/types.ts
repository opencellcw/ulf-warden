/**
 * Heartbeat Types
 *
 * Defines types for autonomous periodic checks
 */

export interface HeartbeatState {
  lastCheck: string;
  checksPerformed: number;
  alertsSent: number;
  lastAlert?: string;
}

export interface HeartbeatConfig {
  enabled: boolean;
  intervalMinutes: number;
  slackChannel: string;
  quietHoursStart?: number;  // Hour (0-23)
  quietHoursEnd?: number;    // Hour (0-23)
}

export interface HeartbeatCheck {
  timestamp: string;
  type: 'routine' | 'alert';
  message?: string;
  requiresAttention: boolean;
}

export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  enabled: false,
  intervalMinutes: 30,
  slackChannel: process.env.SLACK_HEARTBEAT_CHANNEL || 'ulf-heartbeat',
  quietHoursStart: 23,  // 11 PM
  quietHoursEnd: 7      // 7 AM
};
