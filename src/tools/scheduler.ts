import Anthropic from '@anthropic-ai/sdk';
import { getCronManager } from '../scheduler/cron-manager';
import { log } from '../logger';

/**
 * Schedule a task
 */
export async function scheduleTask(input: any, userId?: string): Promise<string> {
  const { name, when, channel, message } = input;

  if (!name || !when || !channel || !message) {
    return '❌ Missing required parameters: name, when, channel, and message are required';
  }

  try {
    const cronManager = getCronManager();

    const job = await cronManager.addJob({
      name,
      expression: when,
      task: {
        type: 'slack_message',
        data: { channel, message }
      },
      userId
    });

    log.info('[Scheduler] Task scheduled', {
      id: job.id,
      name: job.name,
      when: job.expression
    });

    return `✅ Task scheduled successfully!

**ID:** ${job.id}
**Name:** ${job.name}
**When:** ${when}
**Channel:** ${channel}

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

      result += `**${job.name}**\n`;
      result += `  • ID: \`${job.id}\`\n`;
      result += `  • Status: ${status}\n`;
      result += `  • Schedule: ${job.expression}\n`;
      result += `  • Last run: ${lastRun}\n`;
      result += `  • Task: Send message to ${job.task.data.channel}\n`;
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
    description: `Schedule a task to be executed at a specific time. Supports both cron expressions and relative time.

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

**Use cases:**
- Reminders: "Me lembra em 30 minutos"
- Recurring alerts: "Me avisa todo dia às 9h"
- Follow-ups: "Pergunta pro usuário em 2 horas se ele terminou"`,
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Task name (e.g., "Code review reminder")'
        },
        when: {
          type: 'string',
          description: 'When to execute: relative time ("in 30 minutes") or cron expression ("0 9 * * *")'
        },
        channel: {
          type: 'string',
          description: 'Slack channel ID or name where to send the message'
        },
        message: {
          type: 'string',
          description: 'Message to send when task executes'
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
