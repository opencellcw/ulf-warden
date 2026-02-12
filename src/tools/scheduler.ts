import Anthropic from '@anthropic-ai/sdk';
import { getCronManager } from '../scheduler/cron-manager';
import { log } from '../logger';

/**
 * Schedule a task
 */
export async function scheduleTask(input: any, userId?: string, platform?: string): Promise<string> {
  const { name, when, channel, message, thread_id } = input;

  if (!name || !when || !channel || !message) {
    return '❌ Missing required parameters: name, when, channel, and message are required';
  }

  try {
    const cronManager = getCronManager();

    // Determine task type based on platform or channel format
    let taskType: 'slack_message' | 'discord_message' | 'telegram_message' = 'slack_message';
    
    if (platform) {
      // Explicit platform provided
      if (platform === 'discord') {
        taskType = 'discord_message';
      } else if (platform === 'telegram') {
        taskType = 'telegram_message';
      }
    } else {
      // Auto-detect from channel ID format
      if (/^\d{17,19}$/.test(channel)) {
        // Discord channel IDs are 17-19 digit snowflakes
        taskType = 'discord_message';
      } else if (/^-?\d{1,15}$/.test(channel)) {
        // Telegram chat IDs are up to 15 digits, can be negative
        taskType = 'telegram_message';
      }
      // Otherwise defaults to Slack
    }

    const job = await cronManager.addJob({
      name,
      expression: when,
      task: {
        type: taskType,
        data: { 
          channel, 
          message,
          thread_id,  // Discord/Telegram thread support
          thread_ts: thread_id,  // Slack thread support (alias)
          reply_to: thread_id ? parseInt(thread_id) : undefined  // Telegram reply
        }
      },
      userId,
      metadata: {
        platform: taskType.replace('_message', '')
      }
    });

    log.info('[Scheduler] Task scheduled', {
      id: job.id,
      name: job.name,
      when: job.expression,
      platform: taskType
    });

    return `✅ Task scheduled successfully!

**ID:** ${job.id}
**Name:** ${job.name}
**When:** ${when}
**Channel:** ${channel}
**Platform:** ${taskType.replace('_message', '')}

Use \`cancel_scheduled_task\` with ID to cancel.`;
  } catch (error: any) {
    log.error('[Scheduler] Failed to schedule task', { error: error.message });
    return `❌ Failed to schedule task: ${error.message}`;
  }
}

/**
 * List scheduled tasks
 */
export async function listScheduledTasks(input: any, userId?: string): Promise<string> {
  try {
    const cronManager = getCronManager();
    const jobs = cronManager.listJobs(userId);

    if (jobs.length === 0) {
      return 'ℹ️ No scheduled tasks found.';
    }

    let result = `📅 **Scheduled Tasks (${jobs.length}):**\n\n`;

    for (const job of jobs) {
      const status = job.enabled ? '✅ Active' : '⏸️ Paused';
      const lastRun = job.lastRun
        ? new Date(job.lastRun).toLocaleString('pt-BR')
        : 'Never';
      
      // Get platform from task type or metadata
      const platform = job.metadata?.platform || job.task.type.replace('_message', '');
      const platformEmoji = platform === 'discord' ? '💬' : 
                           platform === 'slack' ? '💼' : 
                           platform === 'telegram' ? '✈️' : '📱';

      result += `**${job.name}**\n`;
      result += `  • ID: \`${job.id}\`\n`;
      result += `  • Status: ${status}\n`;
      result += `  • Platform: ${platformEmoji} ${platform}\n`;
      result += `  • Schedule: ${job.expression}\n`;
      result += `  • Last run: ${lastRun}\n`;
      result += `  • Channel: ${job.task.data.channel}\n`;
      result += `\n`;
    }

    return result;
  } catch (error: any) {
    log.error('[Scheduler] Failed to list tasks', { error: error.message });
    return `❌ Failed to list tasks: ${error.message}`;
  }
}

/**
 * Cancel a scheduled task
 */
export async function cancelScheduledTask(input: any): Promise<string> {
  const { task_id } = input;

  if (!task_id) {
    return '❌ Missing required parameter: task_id';
  }

  try {
    const cronManager = getCronManager();
    const deleted = await cronManager.removeJob(task_id);

    if (deleted) {
      log.info('[Scheduler] Task cancelled', { taskId: task_id });
      return `✅ Task \`${task_id}\` cancelled successfully.`;
    } else {
      return `❌ Task \`${task_id}\` not found.`;
    }
  } catch (error: any) {
    log.error('[Scheduler] Failed to cancel task', { error: error.message });
    return `❌ Failed to cancel task: ${error.message}`;
  }
}

/**
 * Export tool definitions
 */
export const SCHEDULER_TOOLS: Anthropic.Tool[] = [
  {
    name: 'schedule_task',
    description: `Schedule a task to be executed at a specific time. Supports Discord, Slack, and Telegram. 
    
**Supports both cron expressions and relative time:**

**Relative time examples:**
- "in 30 seconds"
- "in 5 minutes"
- "in 2 hours"
- "in 1 day"

**Cron expression examples:**
- "*/5 * * * *" (every 5 minutes)
- "0 9 * * *" (daily at 9am)
- "0 9 * * 1" (every Monday at 9am)
- "0 0 1 * *" (first day of every month)
- "0 */2 * * *" (every 2 hours)

**Multi-platform support:**
- Auto-detects platform from channel ID format
- Discord: 17-19 digit snowflake IDs
- Telegram: Numeric chat IDs (can be negative)
- Slack: String channel IDs (e.g., C1234567890)

**Use cases:**
- Reminders: "Me lembra em 30 minutos de revisar o PR"
- Recurring alerts: "Me avisa todo dia às 9h sobre o standup"
- Follow-ups: "Pergunta pro usuário em 2 horas se terminou a task"
- Daily reports: "Posta o relatório todo dia às 18h"
- Weekly summaries: "Envia resumo toda segunda às 10h"`,
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Task name (e.g., "Daily standup reminder")'
        },
        when: {
          type: 'string',
          description: 'When to execute: relative time ("in 30 minutes") or cron expression ("0 9 * * *")'
        },
        channel: {
          type: 'string',
          description: 'Channel/chat ID where to send the message (Discord/Slack/Telegram). Platform auto-detected from ID format.'
        },
        message: {
          type: 'string',
          description: 'Message to send when task executes'
        },
        thread_id: {
          type: 'string',
          description: '(Optional) Thread ID for Discord threads, thread_ts for Slack, or message_id for Telegram replies'
        }
      },
      required: ['name', 'when', 'channel', 'message']
    }
  },
  {
    name: 'list_scheduled_tasks',
    description: 'List all scheduled tasks for the current user. Shows task ID, name, schedule, status, and last run time.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'cancel_scheduled_task',
    description: 'Cancel a scheduled task by its ID. The task will be stopped and removed from the schedule.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The task ID to cancel (obtained from list_scheduled_tasks)'
        }
      },
      required: ['task_id']
    }
  }
];
