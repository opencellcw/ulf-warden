import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './activities';

const { sendDiscordReminder, sendSlackReminder } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '5 seconds',
    maximumAttempts: 3,
  },
});

export interface ReminderInput {
  userId: string;
  platform: 'discord' | 'slack' | 'telegram';
  message: string;
  dueDate: Date;
  channelId?: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
}

/**
 * Reminder Workflow
 * 
 * Durable reminder that persists even if bot restarts.
 * Supports:
 * - One-time reminders
 * - Recurring reminders
 * - Multi-platform (Discord, Slack, Telegram)
 */
export async function reminderWorkflow(input: ReminderInput): Promise<void> {
  const now = new Date();
  const dueTime = new Date(input.dueDate).getTime();
  const delayMs = dueTime - now.getTime();

  // Sleep until due date
  if (delayMs > 0) {
    await sleep(delayMs);
  }

  // Send reminder based on platform
  try {
    switch (input.platform) {
      case 'discord':
        await sendDiscordReminder({
          userId: input.userId,
          message: input.message,
          channelId: input.channelId,
        });
        break;

      case 'slack':
        await sendSlackReminder({
          userId: input.userId,
          message: input.message,
          channelId: input.channelId,
        });
        break;

      case 'telegram':
        // TODO: Implement telegram activity
        break;
    }
  } catch (error) {
    // Activity will retry automatically
    throw error;
  }

  // Handle recurring reminders
  if (input.recurring) {
    const nextDate = calculateNextOccurrence(
      new Date(input.dueDate),
      input.recurring.frequency,
      input.recurring.interval
    );

    // Check if should continue recurring
    if (!input.recurring.endDate || nextDate <= new Date(input.recurring.endDate)) {
      // Continue workflow with next occurrence
      await reminderWorkflow({
        ...input,
        dueDate: nextDate,
      });
    }
  }
}

/**
 * Calculate next occurrence for recurring reminders
 */
function calculateNextOccurrence(
  currentDate: Date,
  frequency: 'daily' | 'weekly' | 'monthly',
  interval: number
): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
  }

  return next;
}

/**
 * Snooze Workflow
 * 
 * Snoozes an existing reminder by X minutes
 */
export async function snoozeReminderWorkflow(
  originalInput: ReminderInput,
  snoozeMinutes: number
): Promise<void> {
  const snoozeMs = snoozeMinutes * 60 * 1000;
  await sleep(snoozeMs);

  // Send reminder again
  switch (originalInput.platform) {
    case 'discord':
      await sendDiscordReminder({
        userId: originalInput.userId,
        message: `⏰ Snoozed: ${originalInput.message}`,
        channelId: originalInput.channelId,
      });
      break;
    case 'slack':
      await sendSlackReminder({
        userId: originalInput.userId,
        message: `⏰ Snoozed: ${originalInput.message}`,
        channelId: originalInput.channelId,
      });
      break;
  }
}
