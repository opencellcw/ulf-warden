/**
 * Hybrid Reminders System
 * 
 * Works with OR without Temporal:
 * - If Temporal available → Uses durable workflows
 * - If Temporal NOT available → Uses node-schedule + SQLite
 * 
 * Features:
 * - ✅ Works everywhere (dev + prod)
 * - ✅ Persists to SQLite (survives restarts)
 * - ✅ Natural language parsing
 * - ✅ Multi-platform (Discord, Slack)
 * - ✅ Automatic fallback
 */

import * as schedule from 'node-schedule';
import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../logger';
import { getTemporal } from '../workflows/temporal-client';

export interface Reminder {
  id: string;
  userId: string;
  platform: 'discord' | 'slack';
  message: string;
  dueDate: Date;
  channelId?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  workflowId?: string; // Temporal workflow ID (if using Temporal)
}

export class HybridReminders {
  private db: Database.Database;
  private jobs: Map<string, schedule.Job> = new Map();
  private usingTemporal: boolean = false;

  constructor() {
    const dbPath = path.join(process.env.DATA_DIR || './data', 'ulf.db');
    this.db = new Database(dbPath);
    this.initTable();
    this.checkTemporalAvailability();
    this.loadPendingReminders();
    log.info('[HybridReminders] Initialized', { usingTemporal: this.usingTemporal });
  }

  /**
   * Initialize reminders table
   */
  private initTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        message TEXT NOT NULL,
        due_date TEXT NOT NULL,
        channel_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        completed_at TEXT,
        workflow_id TEXT
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
      CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
      CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_date);
    `);
  }

  /**
   * Check if Temporal is available
   */
  private async checkTemporalAvailability(): Promise<void> {
    try {
      const temporal = await getTemporal();
      this.usingTemporal = temporal.isEnabled();
    } catch (error) {
      this.usingTemporal = false;
    }
  }

  /**
   * Create a reminder
   */
  async create(input: {
    userId: string;
    platform: 'discord' | 'slack';
    message: string;
    dueDate: Date;
    channelId?: string;
  }): Promise<Reminder> {
    const id = uuidv4();
    const now = new Date();

    const reminder: Reminder = {
      id,
      userId: input.userId,
      platform: input.platform,
      message: input.message,
      dueDate: input.dueDate,
      channelId: input.channelId,
      status: 'pending',
      createdAt: now,
    };

    // Save to database
    this.db
      .prepare(
        `
      INSERT INTO reminders (
        id, user_id, platform, message, due_date, 
        channel_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        reminder.id,
        reminder.userId,
        reminder.platform,
        reminder.message,
        reminder.dueDate.toISOString(),
        reminder.channelId || null,
        reminder.status,
        reminder.createdAt.toISOString()
      );

    log.info('[HybridReminders] Reminder created', {
      id: reminder.id,
      userId: reminder.userId,
      dueDate: reminder.dueDate.toISOString(),
      usingTemporal: this.usingTemporal,
    });

    // Schedule reminder
    if (this.usingTemporal) {
      await this.scheduleWithTemporal(reminder);
    } else {
      this.scheduleWithNodeSchedule(reminder);
    }

    return reminder;
  }

  /**
   * Schedule with Temporal (durable)
   */
  private async scheduleWithTemporal(reminder: Reminder): Promise<void> {
    try {
      const temporal = await getTemporal();
      const workflowId = `reminder-${reminder.id}`;

      await temporal.startWorkflow('reminderWorkflow', {
        workflowId,
        taskQueue: 'ulf-warden',
        args: [
          {
            userId: reminder.userId,
            platform: reminder.platform,
            message: reminder.message,
            dueDate: reminder.dueDate,
            channelId: reminder.channelId,
          },
        ],
      });

      // Update workflow ID in DB
      this.db
        .prepare('UPDATE reminders SET workflow_id = ? WHERE id = ?')
        .run(workflowId, reminder.id);

      log.info('[HybridReminders] Scheduled with Temporal', {
        reminderId: reminder.id,
        workflowId,
      });
    } catch (error: any) {
      log.error('[HybridReminders] Temporal scheduling failed, using fallback', {
        error: error.message,
      });
      this.scheduleWithNodeSchedule(reminder);
    }
  }

  /**
   * Schedule with node-schedule (fallback)
   */
  private scheduleWithNodeSchedule(reminder: Reminder): void {
    const job = schedule.scheduleJob(reminder.dueDate, async () => {
      log.info('[HybridReminders] Executing reminder', { id: reminder.id });
      await this.executeReminder(reminder);
    });

    if (job) {
      this.jobs.set(reminder.id, job);
      log.info('[HybridReminders] Scheduled with node-schedule', {
        reminderId: reminder.id,
        dueDate: reminder.dueDate.toISOString(),
      });
    }
  }

  /**
   * Execute a reminder
   */
  private async executeReminder(reminder: Reminder): Promise<void> {
    try {
      log.info('[HybridReminders] Sending reminder', {
        id: reminder.id,
        platform: reminder.platform,
      });

      // Send to platform
      switch (reminder.platform) {
        case 'discord':
          await this.sendDiscordReminder(reminder);
          break;
        case 'slack':
          await this.sendSlackReminder(reminder);
          break;
      }

      // Mark as completed
      this.markCompleted(reminder.id);

      // Remove job
      const job = this.jobs.get(reminder.id);
      if (job) {
        job.cancel();
        this.jobs.delete(reminder.id);
      }
    } catch (error: any) {
      log.error('[HybridReminders] Failed to execute reminder', {
        error: error.message,
        reminderId: reminder.id,
      });
    }
  }

  /**
   * Send Discord reminder
   */
  private async sendDiscordReminder(reminder: Reminder): Promise<void> {
    try {
      const { getDiscordClient } = await import('../handlers/discord-client');
      const client = getDiscordClient();

      if (!client) {
        throw new Error('Discord client not available');
      }

      // Try DM first
      try {
        const user = await client.users.fetch(reminder.userId);
        await user.send(`🔔 **Reminder**\n${reminder.message}`);
        log.info('[HybridReminders] Discord reminder sent via DM', {
          userId: reminder.userId,
        });
        return;
      } catch (dmError) {
        log.warn('[HybridReminders] DM failed, trying channel');
      }

      // Fallback to channel
      if (reminder.channelId) {
        const channel = await client.channels.fetch(reminder.channelId);
        if (channel && 'send' in channel) {
          await (channel as any).send(
            `<@${reminder.userId}> 🔔 **Reminder**\n${reminder.message}`
          );
          log.info('[HybridReminders] Discord reminder sent to channel');
          return;
        }
      }

      throw new Error('Could not send Discord reminder');
    } catch (error: any) {
      log.error('[HybridReminders] Discord reminder failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send Slack reminder
   */
  private async sendSlackReminder(reminder: Reminder): Promise<void> {
    try {
      const { getSlackApp } = await import('../tools/slack-messaging');
      const app = getSlackApp();

      const channel = reminder.channelId || reminder.userId;

      await app.client.chat.postMessage({
        channel,
        text: `:bell: *Reminder*\n${reminder.message}`,
        unfurl_links: false,
        unfurl_media: false,
      });

      log.info('[HybridReminders] Slack reminder sent', { channel });
    } catch (error: any) {
      log.error('[HybridReminders] Slack reminder failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Cancel a reminder
   */
  async cancel(reminderId: string): Promise<boolean> {
    const reminder = this.getReminder(reminderId);
    if (!reminder) return false;

    // Cancel in Temporal if using it
    if (reminder.workflowId && this.usingTemporal) {
      try {
        const temporal = await getTemporal();
        await temporal.cancelWorkflow(reminder.workflowId);
      } catch (error: any) {
        log.warn('[HybridReminders] Temporal cancel failed', {
          error: error.message,
        });
      }
    }

    // Cancel node-schedule job
    const job = this.jobs.get(reminderId);
    if (job) {
      job.cancel();
      this.jobs.delete(reminderId);
    }

    // Update database
    this.db
      .prepare('UPDATE reminders SET status = ? WHERE id = ?')
      .run('cancelled', reminderId);

    log.info('[HybridReminders] Reminder cancelled', { reminderId });
    return true;
  }

  /**
   * Mark reminder as completed
   */
  private markCompleted(reminderId: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE reminders SET status = ?, completed_at = ? WHERE id = ?')
      .run('completed', now, reminderId);
  }

  /**
   * Get reminder by ID
   */
  private getReminder(id: string): Reminder | null {
    const row = this.db
      .prepare('SELECT * FROM reminders WHERE id = ?')
      .get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      message: row.message,
      dueDate: new Date(row.due_date),
      channelId: row.channel_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      workflowId: row.workflow_id,
    };
  }

  /**
   * List reminders for user
   */
  list(userId: string, status?: 'pending' | 'completed'): Reminder[] {
    let query = 'SELECT * FROM reminders WHERE user_id = ?';
    const params: any[] = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY due_date ASC';

    const rows = this.db.prepare(query).all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      message: row.message,
      dueDate: new Date(row.due_date),
      channelId: row.channel_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      workflowId: row.workflow_id,
    }));
  }

  /**
   * Load pending reminders from database on startup
   */
  private loadPendingReminders(): void {
    const rows = this.db
      .prepare('SELECT * FROM reminders WHERE status = ?')
      .all('pending') as any[];

    let loaded = 0;
    for (const row of rows) {
      const reminder: Reminder = {
        id: row.id,
        userId: row.user_id,
        platform: row.platform,
        message: row.message,
        dueDate: new Date(row.due_date),
        channelId: row.channel_id,
        status: row.status,
        createdAt: new Date(row.created_at),
        workflowId: row.workflow_id,
      };

      // Only reschedule if not past due
      if (reminder.dueDate > new Date()) {
        this.scheduleWithNodeSchedule(reminder);
        loaded++;
      }
    }

    log.info('[HybridReminders] Loaded pending reminders', { count: loaded });
  }

  /**
   * Parse natural language time
   */
  parseNaturalTime(text: string): Date {
    const now = new Date();
    const lowerText = text.toLowerCase();

    // In X minutes/hours/days
    const minutesMatch = lowerText.match(/in (\d+) min/);
    if (minutesMatch) {
      const minutes = parseInt(minutesMatch[1]);
      return new Date(now.getTime() + minutes * 60000);
    }

    const hoursMatch = lowerText.match(/in (\d+) hour/);
    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1]);
      return new Date(now.getTime() + hours * 3600000);
    }

    const daysMatch = lowerText.match(/in (\d+) day/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);
      futureDate.setHours(9, 0, 0, 0);
      return futureDate;
    }

    // Tomorrow
    if (lowerText.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const timeMatch = lowerText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3];

        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;

        tomorrow.setHours(hours, minutes, 0, 0);
      } else {
        tomorrow.setHours(9, 0, 0, 0);
      }

      return tomorrow;
    }

    // Days of week
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    for (let i = 0; i < days.length; i++) {
      if (lowerText.includes(days[i])) {
        const targetDay = i;
        const currentDay = now.getDay();
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7;

        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + daysUntil);
        targetDate.setHours(9, 0, 0, 0);

        return targetDate;
      }
    }

    // Default: 1 hour from now
    return new Date(now.getTime() + 3600000);
  }

  /**
   * Extract reminder text from message
   */
  extractReminderText(text: string): string {
    let cleanText = text
      .replace(/remind me (to|about|that)?/i, '')
      .replace(/tomorrow/i, '')
      .replace(/today/i, '')
      .replace(/later/i, '')
      .replace(/in \d+ (minutes?|mins?|hours?|days?)/gi, '')
      .replace(/at \d{1,2}:?\d{0,2}\s*(am|pm)?/gi, '')
      .replace(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, '')
      .trim();

    return cleanText || 'Reminder';
  }

  /**
   * Shutdown - cancel all jobs
   */
  shutdown(): void {
    log.info('[HybridReminders] Shutting down', { activeJobs: this.jobs.size });
    for (const [id, job] of this.jobs.entries()) {
      job.cancel();
    }
    this.jobs.clear();
  }
}

// Singleton
let hybridRemindersInstance: HybridReminders | null = null;

export function getHybridReminders(): HybridReminders {
  if (!hybridRemindersInstance) {
    hybridRemindersInstance = new HybridReminders();
  }
  return hybridRemindersInstance;
}
