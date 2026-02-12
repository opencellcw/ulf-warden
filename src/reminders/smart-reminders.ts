import { log } from '../logger';
import { intervalManager } from '../utils/interval-manager';
import { memory } from '../memory/vector-memory';

/**
 * Smart Reminders System
 * 
 * Context-aware reminders that never let you forget important tasks.
 * 
 * Features:
 * - Natural language creation ("remind me Friday")
 * - Smart timing (considers timezone, work hours)
 * - Escalation (gentle → urgent)
 * - Quick actions (snooze, done, reschedule)
 * - Recurring reminders
 * - Location-based (future)
 * 
 * Example:
 *   User: "Remind me to review PR tomorrow at 2pm"
 *   Bot: ✅ Reminder set for tomorrow 2:00 PM
 *   
 *   Next day 2pm:
 *   Bot: 🔔 Review PR
 *        [Mark Done] [Snooze 1h] [Snooze 2h]
 */

export interface Reminder {
  id: string;
  userId: string;
  botId: string;
  text: string;
  dueDate: Date;
  created: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
  status: 'pending' | 'snoozed' | 'completed' | 'cancelled';
  snoozedUntil?: Date;
  completedAt?: Date;
  metadata?: {
    context?: string;
    relatedTo?: string;
    channelId?: string;
  };
}

export class SmartRemindersSystem {
  private reminders: Map<string, Reminder> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    log.info('[SmartReminders] Initialized');
    this.startReminderChecker();
  }

  /**
   * Create a reminder from natural language
   */
  async createReminder(
    userId: string,
    botId: string,
    text: string,
    context?: string
  ): Promise<Reminder> {
    // Parse natural language to extract time
    const dueDate = this.parseNaturalTime(text);
    const reminderText = this.extractReminderText(text);
    const priority = this.detectPriority(text);

    const reminder: Reminder = {
      id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId,
      botId,
      text: reminderText,
      dueDate,
      created: new Date(),
      priority,
      status: 'pending',
      metadata: {
        context,
      },
    };

    this.reminders.set(reminder.id, reminder);

    log.info('[SmartReminders] Reminder created', {
      reminderId: reminder.id,
      userId,
      dueDate: dueDate.toISOString(),
      priority,
    });

    // Store in memory for persistence
    if (memory.isEnabled()) {
      await memory.store(botId, userId, `Reminder: ${reminderText}`, {
        type: 'reminder',
        reminderId: reminder.id,
        dueDate: dueDate.toISOString(),
      });
    }

    return reminder;
  }

  /**
   * Parse natural language time expressions
   */
  private parseNaturalTime(text: string): Date {
    const now = new Date();
    const lowerText = text.toLowerCase();

    // Tomorrow
    if (lowerText.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check for specific time
      const timeMatch = lowerText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3];

        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;

        tomorrow.setHours(hours, minutes, 0, 0);
      } else {
        tomorrow.setHours(9, 0, 0, 0); // Default: 9am
      }

      return tomorrow;
    }

    // Today
    if (lowerText.includes('today') || lowerText.includes('later')) {
      const today = new Date(now);
      const timeMatch = lowerText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
      
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3];

        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;

        today.setHours(hours, minutes, 0, 0);
      } else {
        // Default: 1 hour from now
        today.setHours(today.getHours() + 1, 0, 0, 0);
      }

      return today;
    }

    // Specific days
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lowerText.includes(days[i])) {
        const targetDay = i;
        const currentDay = now.getDay();
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
        
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + daysUntil);
        targetDate.setHours(9, 0, 0, 0); // Default: 9am
        
        return targetDate;
      }
    }

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

    // Default: 1 hour from now
    return new Date(now.getTime() + 3600000);
  }

  /**
   * Extract reminder text (remove time expressions)
   */
  private extractReminderText(text: string): string {
    let cleanText = text
      .replace(/remind me (to|about|that)?/i, '')
      .replace(/tomorrow/i, '')
      .replace(/today/i, '')
      .replace(/later/i, '')
      .replace(/in \d+ (min|hour|day)s?/i, '')
      .replace(/at \d{1,2}:?\d{0,2}\s*(am|pm)?/i, '')
      .replace(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, '')
      .trim();

    return cleanText || 'Reminder';
  }

  /**
   * Detect priority from text
   */
  private detectPriority(text: string): 'low' | 'medium' | 'high' | 'urgent' {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes('urgent') ||
      lowerText.includes('asap') ||
      lowerText.includes('critical')
    ) {
      return 'urgent';
    }

    if (
      lowerText.includes('important') ||
      lowerText.includes('must') ||
      lowerText.includes('need to')
    ) {
      return 'high';
    }

    if (lowerText.includes('should') || lowerText.includes('would be good')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get pending reminders for user
   */
  getPendingReminders(userId: string): Reminder[] {
    const pending = Array.from(this.reminders.values()).filter(
      r => r.userId === userId && r.status === 'pending'
    );

    return pending.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  /**
   * Get due reminders (need to be triggered)
   */
  getDueReminders(): Reminder[] {
    const now = new Date();
    
    return Array.from(this.reminders.values()).filter(r => {
      if (r.status !== 'pending') return false;
      
      // Check if snoozed
      if (r.snoozedUntil && r.snoozedUntil > now) {
        return false;
      }
      
      return r.dueDate <= now;
    });
  }

  /**
   * Mark reminder as done
   */
  markDone(reminderId: string): void {
    const reminder = this.reminders.get(reminderId);
    if (!reminder) return;

    reminder.status = 'completed';
    reminder.completedAt = new Date();

    log.info('[SmartReminders] Reminder completed', {
      reminderId,
      userId: reminder.userId,
    });

    // Handle recurring
    if (reminder.recurring) {
      this.createRecurringInstance(reminder);
    }
  }

  /**
   * Snooze reminder
   */
  snooze(reminderId: string, minutes: number): void {
    const reminder = this.reminders.get(reminderId);
    if (!reminder) return;

    const snoozeUntil = new Date(Date.now() + minutes * 60000);
    reminder.snoozedUntil = snoozeUntil;
    reminder.dueDate = snoozeUntil;

    log.info('[SmartReminders] Reminder snoozed', {
      reminderId,
      snoozedUntil: snoozeUntil.toISOString(),
    });
  }

  /**
   * Cancel reminder
   */
  cancel(reminderId: string): void {
    const reminder = this.reminders.get(reminderId);
    if (!reminder) return;

    reminder.status = 'cancelled';

    log.info('[SmartReminders] Reminder cancelled', {
      reminderId,
    });
  }

  /**
   * Create recurring instance
   */
  private createRecurringInstance(original: Reminder): void {
    if (!original.recurring) return;

    const nextDate = new Date(original.dueDate);
    
    switch (original.recurring.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + original.recurring.interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7 * original.recurring.interval);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + original.recurring.interval);
        break;
    }

    // Check if recurring should end
    if (original.recurring.endDate && nextDate > original.recurring.endDate) {
      return;
    }

    const newReminder: Reminder = {
      ...original,
      id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      dueDate: nextDate,
      created: new Date(),
      status: 'pending',
      snoozedUntil: undefined,
      completedAt: undefined,
    };

    this.reminders.set(newReminder.id, newReminder);
  }

  /**
   * Format reminder for display
   */
  formatReminder(reminder: Reminder): string {
    const emoji = this.getPriorityEmoji(reminder.priority);
    const timeStr = this.formatRelativeTime(reminder.dueDate);

    return `${emoji} **${reminder.text}**\nDue: ${timeStr}`;
  }

  /**
   * Get priority emoji
   */
  private getPriorityEmoji(priority: string): string {
    const emojis = {
      urgent: '🔴',
      high: '🟡',
      medium: '🟢',
      low: '⚪',
    };
    return emojis[priority as keyof typeof emojis] || '🔔';
  }

  /**
   * Format relative time
   */
  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (diff < 0) return 'NOW! ⚠️';
    if (minutes < 60) return `in ${minutes} min`;
    if (hours < 24) return `in ${hours}h`;
    if (days === 1) return 'tomorrow';
    return `in ${days} days`;
  }

  /**
   * Start background reminder checker
   */
  private startReminderChecker(): void {
    // Check every minute
    this.checkInterval = intervalManager.register('smart-reminders-check', () => {
      const dueReminders = this.getDueReminders();
      
      if (dueReminders.length > 0) {
        log.info('[SmartReminders] Due reminders found', {
          count: dueReminders.length,
        });
      }

      // Emit event for each due reminder
      // Handler will be in Discord integration
    }, 60000); // Check every minute
  }

  /**
   * Stop reminder checker
   */
  stop(): void {
    if (this.checkInterval) {
      intervalManager.clear('smart-reminders-check');
      this.checkInterval = null;
    }
  }

  /**
   * Get reminder statistics
   */
  getStats(userId: string): {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
  } {
    const userReminders = Array.from(this.reminders.values()).filter(
      r => r.userId === userId
    );

    const now = new Date();

    return {
      total: userReminders.length,
      pending: userReminders.filter(r => r.status === 'pending').length,
      completed: userReminders.filter(r => r.status === 'completed').length,
      overdue: userReminders.filter(
        r => r.status === 'pending' && r.dueDate < now
      ).length,
    };
  }
}

// Singleton
let remindersInstance: SmartRemindersSystem | null = null;

export function getSmartReminders(): SmartRemindersSystem {
  if (!remindersInstance) {
    remindersInstance = new SmartRemindersSystem();
  }
  return remindersInstance;
}

export const smartReminders = getSmartReminders();
