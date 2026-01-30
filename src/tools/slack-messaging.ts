import { App } from '@slack/bolt';
import { log } from '../logger';

/**
 * Slack Messaging Tools
 *
 * Allows proactive messaging to Slack channels/threads
 */

let slackApp: App | null = null;

/**
 * Initialize with Slack app instance
 */
export function initSlackMessaging(app: App): void {
  slackApp = app;
  log.info('[SlackMessaging] Initialized');
}

/**
 * Get Slack app instance
 */
export function getSlackApp(): App {
  if (!slackApp) {
    throw new Error('Slack app not initialized. Call initSlackMessaging() first.');
  }
  return slackApp;
}

/**
 * Send proactive message to Slack
 */
export async function sendSlackMessage(input: any): Promise<string> {
  const { channel, message, thread_ts } = input;

  if (!channel || !message) {
    return '❌ Missing required parameters: channel and message are required';
  }

  try {
    const app = getSlackApp();

    log.info('[SlackMessaging] Sending message', {
      channel,
      messagePreview: message.substring(0, 50),
      isThread: !!thread_ts
    });

    const result = await app.client.chat.postMessage({
      channel,
      text: message,
      thread_ts,
      unfurl_links: false,
      unfurl_media: false
    });

    if (result.ok) {
      log.info('[SlackMessaging] Message sent successfully', {
        channel,
        ts: result.ts
      });

      return `✅ Message sent successfully to ${channel}${thread_ts ? ' (in thread)' : ''}`;
    } else {
      log.error('[SlackMessaging] Failed to send message', {
        error: result.error,
        channel
      });

      return `❌ Failed to send message: ${result.error}`;
    }
  } catch (error: any) {
    log.error('[SlackMessaging] Error sending message', {
      error: error.message,
      channel
    });

    return `❌ Error sending message: ${error.message}`;
  }
}

/**
 * Export tool definition
 */
export const SLACK_MESSAGING_TOOL = {
  name: 'send_slack_message',
  description: `Send a proactive message to a Slack channel or thread.

Use this when you need to:
- Send reminders or alerts
- Notify about completed background tasks
- Follow up on previous conversations
- Send scheduled messages

Examples:
- "Send a reminder to #general about the meeting"
- "Notify the team in #dev-ops that the deploy finished"
- "Follow up in the current thread about the task"`,
  input_schema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Slack channel ID (e.g., "C123ABC456") or name (e.g., "#general"). Use the channel from the current conversation context.'
      },
      message: {
        type: 'string',
        description: 'The message text to send. Supports Slack markdown formatting.'
      },
      thread_ts: {
        type: 'string',
        description: 'Optional: Thread timestamp to reply in a specific thread. Use this to continue a conversation in context.'
      }
    },
    required: ['channel', 'message']
  }
};
