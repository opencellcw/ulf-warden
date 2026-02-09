import { Client, User } from 'discord.js';
import { log } from '../logger';
import { dailyLogger } from '../memory/daily-logger';

/**
 * Notification Manager
 *
 * Sends proactive notifications to owner via Discord DM.
 * Rate-limited to avoid spam.
 */

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class NotificationManager {
  private discordClient: Client | null = null;
  private ownerUserId: string;
  private notificationHistory: Map<string, Date> = new Map();
  private rateLimitMinutes: number = 60; // Don't send same notification within 60min

  constructor(ownerUserId?: string) {
    this.ownerUserId = ownerUserId || process.env.HEARTBEAT_DISCORD_DM_USER_ID || '375567912706416642';
  }

  /**
   * Set Discord client for sending DMs
   */
  setDiscordClient(client: Client): void {
    this.discordClient = client;
    log.info('[NotificationManager] Discord client set');
  }

  /**
   * Send notification to owner
   */
  async notify(notification: Notification): Promise<boolean> {
    try {
      // Check rate limit
      if (this.isRateLimited(notification)) {
        log.debug('[NotificationManager] Notification rate-limited', {
          title: notification.title
        });
        return false;
      }

      // Log notification
      await dailyLogger.logSystemEvent(
        `Notification: ${notification.title}`,
        notification.message
      );

      // Send via Discord DM if client is available
      if (this.discordClient) {
        const sent = await this.sendDiscordDM(notification);
        if (sent) {
          this.recordNotification(notification);
          return true;
        }
      }

      // Fallback: console log
      log.info('[NotificationManager] Notification (no Discord client)', {
        priority: notification.priority,
        title: notification.title,
        message: notification.message
      });

      return false;
    } catch (error: any) {
      log.error('[NotificationManager] Failed to send notification', {
        error: error.message,
        title: notification.title
      });
      return false;
    }
  }

  /**
   * Send Discord DM
   */
  private async sendDiscordDM(notification: Notification): Promise<boolean> {
    try {
      if (!this.discordClient) {
        return false;
      }

      // Fetch owner user
      const user = await this.discordClient.users.fetch(this.ownerUserId);
      if (!user) {
        log.error('[NotificationManager] Owner user not found', {
          userId: this.ownerUserId
        });
        return false;
      }

      // Format message
      const emoji = this.getPriorityEmoji(notification.priority);
      const message = `${emoji} **${notification.title}**\n\n${notification.message}`;

      // Send DM
      await user.send(message);

      log.info('[NotificationManager] Discord DM sent', {
        userId: this.ownerUserId,
        priority: notification.priority,
        title: notification.title
      });

      return true;
    } catch (error: any) {
      log.error('[NotificationManager] Failed to send Discord DM', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get emoji for priority
   */
  private getPriorityEmoji(priority: NotificationPriority): string {
    const emojis: Record<NotificationPriority, string> = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔴',
      critical: '🚨'
    };
    return emojis[priority] || 'ℹ️';
  }

  /**
   * Check if notification is rate-limited
   */
  private isRateLimited(notification: Notification): boolean {
    const key = `${notification.priority}:${notification.title}`;
    const lastSent = this.notificationHistory.get(key);

    if (!lastSent) {
      return false;
    }

    const timeSinceMs = Date.now() - lastSent.getTime();
    const rateLimitMs = this.rateLimitMinutes * 60 * 1000;

    return timeSinceMs < rateLimitMs;
  }

  /**
   * Record notification for rate limiting
   */
  private recordNotification(notification: Notification): void {
    const key = `${notification.priority}:${notification.title}`;
    this.notificationHistory.set(key, new Date());

    // Clean up old entries (>24h)
    const now = Date.now();
    for (const [k, date] of this.notificationHistory.entries()) {
      if (now - date.getTime() > 24 * 60 * 60 * 1000) {
        this.notificationHistory.delete(k);
      }
    }
  }

  /**
   * Notify about system alert
   */
  async notifyAlert(title: string, message: string, priority: NotificationPriority = 'high'): Promise<boolean> {
    return this.notify({
      title,
      message,
      priority,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify about critical issue
   */
  async notifyCritical(title: string, message: string): Promise<boolean> {
    return this.notify({
      title,
      message,
      priority: 'critical',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify about info/low priority
   */
  async notifyInfo(title: string, message: string): Promise<boolean> {
    return this.notify({
      title,
      message,
      priority: 'low',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get notification stats
   */
  getStats(): {
    totalSent: number;
    recentNotifications: number;
    rateLimitMinutes: number;
  } {
    return {
      totalSent: this.notificationHistory.size,
      recentNotifications: this.notificationHistory.size,
      rateLimitMinutes: this.rateLimitMinutes
    };
  }
}

// Export singleton
export const notificationManager = new NotificationManager();
