/**
 * Temporal Activities
 * 
 * Activities are the actual implementation of workflow steps.
 * They can fail, timeout, and be retried automatically.
 * 
 * Best practices:
 * - Keep activities idempotent (safe to retry)
 * - Use timeouts
 * - Log extensively
 * - Return structured data
 */

import { log } from '../../logger';
import { supabase } from '../../database/supabase';

// ============================================================================
// BOT DEPLOYMENT ACTIVITIES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface BotConfig {
  name: string;
  type: string;
  config: Record<string, any>;
  owner: string;
}

export interface HealthCheckResult {
  healthy: boolean;
  error?: string;
  checks: {
    database: boolean;
    platform: boolean;
    llm: boolean;
  };
}

/**
 * Validate bot configuration
 */
export async function validateBotConfig(input: any): Promise<ValidationResult> {
  log.info('[Activity] Validating bot config', { botName: input.botName });

  const errors: string[] = [];

  // Check required fields
  if (!input.botName || input.botName.length < 3) {
    errors.push('Bot name must be at least 3 characters');
  }

  if (!input.botType) {
    errors.push('Bot type is required');
  }

  if (!['discord', 'slack', 'telegram'].includes(input.botType)) {
    errors.push('Invalid bot type');
  }

  if (!input.owner) {
    errors.push('Owner is required');
  }

  // Check platform-specific config
  if (input.botType === 'discord' && !input.config?.token) {
    errors.push('Discord bot token is required');
  }

  if (input.botType === 'slack' && !input.config?.token) {
    errors.push('Slack bot token is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create bot record in database
 */
export async function createBotRecord(config: BotConfig): Promise<string> {
  log.info('[Activity] Creating bot record', { name: config.name });

  try {
    if (supabase.isEnabled()) {
      // Use Supabase
      const bot = await supabase.createBot({
        name: config.name,
        type: config.type as 'conversational' | 'agent',
        owner_id: config.owner,
        config: config.config,
      });

      return bot.id;
    } else {
      // Mock for testing
      const mockId = `bot-${Date.now()}`;
      log.warn('[Activity] Supabase disabled, using mock ID', { mockId });
      return mockId;
    }
  } catch (error: any) {
    log.error('[Activity] Failed to create bot record', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Deploy bot to Discord
 */
export async function deployToDiscord(
  botId: string,
  config: Record<string, any>
): Promise<string> {
  log.info('[Activity] Deploying to Discord', { botId });

  // Simulate deployment (replace with actual Discord API calls)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const deploymentId = `discord-${botId}-${Date.now()}`;
  log.info('[Activity] Discord deployment complete', { deploymentId });

  return deploymentId;
}

/**
 * Deploy bot to Slack
 */
export async function deployToSlack(
  botId: string,
  config: Record<string, any>
): Promise<string> {
  log.info('[Activity] Deploying to Slack', { botId });

  // Simulate deployment (replace with actual Slack API calls)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const deploymentId = `slack-${botId}-${Date.now()}`;
  log.info('[Activity] Slack deployment complete', { deploymentId });

  return deploymentId;
}

/**
 * Run health checks
 */
export async function runHealthCheck(botId: string): Promise<HealthCheckResult> {
  log.info('[Activity] Running health check', { botId });

  const checks = {
    database: false,
    platform: false,
    llm: false,
  };

  try {
    // Check database
    if (supabase.isEnabled()) {
      const bot = await supabase.getBotByName(botId);
      checks.database = !!bot;
    } else {
      checks.database = true; // Mock
    }

    // Check platform (mock for now)
    checks.platform = true;

    // Check LLM (mock for now)
    checks.llm = true;

    const healthy = Object.values(checks).every((c) => c);

    return {
      healthy,
      checks,
      error: healthy ? undefined : 'Some checks failed',
    };
  } catch (error: any) {
    return {
      healthy: false,
      checks,
      error: error.message,
    };
  }
}

/**
 * Send notification
 */
export async function sendNotification(notification: {
  type: string;
  botId?: string;
  botName: string;
  owner: string;
  error?: string;
}): Promise<void> {
  log.info('[Activity] Sending notification', {
    type: notification.type,
    botName: notification.botName,
  });

  // Implement actual notification (email, Slack, Discord, etc.)
  // For now, just log
  log.info('[Activity] Notification sent', notification);
}

/**
 * Rollback bot record
 */
export async function rollbackBotRecord(botId: string): Promise<void> {
  log.info('[Activity] Rolling back bot record', { botId });

  try {
    if (supabase.isEnabled()) {
      await supabase.deleteBot(botId);
    }
    log.info('[Activity] Bot record rolled back', { botId });
  } catch (error: any) {
    log.error('[Activity] Failed to rollback bot record', {
      error: error.message,
      botId,
    });
    throw error;
  }
}

/**
 * Rollback Discord bot
 */
export async function rollbackDiscordBot(botId: string): Promise<void> {
  log.info('[Activity] Rolling back Discord bot', { botId });

  // Implement actual Discord bot removal
  // For now, just log
  log.info('[Activity] Discord bot rolled back', { botId });
}

/**
 * Rollback Slack bot
 */
export async function rollbackSlackBot(botId: string): Promise<void> {
  log.info('[Activity] Rolling back Slack bot', { botId });

  // Implement actual Slack bot removal
  // For now, just log
  log.info('[Activity] Slack bot rolled back', { botId });
}

// ============================================================================
// DATA PROCESSING ACTIVITIES
// ============================================================================

/**
 * Process batch of items
 */
export async function processBatchItems(
  items: any[],
  processFn: (item: any) => Promise<any>
): Promise<any[]> {
  log.info('[Activity] Processing batch', { count: items.length });

  const results = [];
  for (const item of items) {
    try {
      const result = await processFn(item);
      results.push({ success: true, result });
    } catch (error: any) {
      results.push({ success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Generate embeddings for texts
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  log.info('[Activity] Generating embeddings', { count: texts.length });

  // Import embeddings service
  const { embeddings } = await import('../../vector/embeddings');

  if (!embeddings.isEnabled()) {
    throw new Error('Embeddings not configured');
  }

  const results = await embeddings.embedBatch(texts);
  return results.map((r) => r.embedding);
}

/**
 * Store vectors in Pinecone
 */
export async function storeVectors(
  botId: string,
  vectors: Array<{ id: string; values: number[]; metadata: any }>
): Promise<void> {
  log.info('[Activity] Storing vectors', {
    botId,
    count: vectors.length,
  });

  // Import Pinecone
  const { pinecone } = await import('../../vector/pinecone');

  if (!pinecone.isEnabled()) {
    throw new Error('Pinecone not configured');
  }

  const namespace = `bot-${botId}`;
  await pinecone.upsert(vectors, namespace);

  log.info('[Activity] Vectors stored', { botId, count: vectors.length });
}

// ============================================================================
// REMINDER ACTIVITIES
// ============================================================================

export interface DiscordReminderInput {
  userId: string;
  message: string;
  channelId?: string;
}

export interface SlackReminderInput {
  userId: string;
  message: string;
  channelId?: string;
}

/**
 * Send Discord reminder
 */
export async function sendDiscordReminder(input: DiscordReminderInput): Promise<void> {
  log.info('[Activity] Sending Discord reminder', {
    userId: input.userId,
    hasChannel: !!input.channelId,
  });

  try {
    // Import Discord client dynamically to avoid circular deps
    const { getDiscordClient } = await import('../../handlers/discord-client');
    const client = getDiscordClient();

    if (!client) {
      throw new Error('Discord client not available');
    }

    // Try to send as DM first
    try {
      const user = await client.users.fetch(input.userId);
      await user.send(`🔔 **Reminder**\n${input.message}`);
      log.info('[Activity] Discord reminder sent via DM', { userId: input.userId });
      return;
    } catch (dmError: any) {
      log.warn('[Activity] Failed to send DM, trying channel', {
        error: dmError.message,
      });
    }

    // If DM fails and channelId provided, send to channel
    if (input.channelId) {
      const channel = await client.channels.fetch(input.channelId);
      if (channel && 'send' in channel) {
        await (channel as any).send(
          `<@${input.userId}> 🔔 **Reminder**\n${input.message}`
        );
        log.info('[Activity] Discord reminder sent to channel', {
          channelId: input.channelId,
        });
        return;
      }
    }

    throw new Error('Could not send reminder (DM blocked and no channel)');
  } catch (error: any) {
    log.error('[Activity] Failed to send Discord reminder', {
      error: error.message,
      userId: input.userId,
    });
    throw error;
  }
}

/**
 * Send Slack reminder
 */
export async function sendSlackReminder(input: SlackReminderInput): Promise<void> {
  log.info('[Activity] Sending Slack reminder', {
    userId: input.userId,
    hasChannel: !!input.channelId,
  });

  try {
    const { getSlackApp } = await import('../../tools/slack-messaging');
    const app = getSlackApp();

    // Send as DM or to channel
    const channel = input.channelId || input.userId;

    await app.client.chat.postMessage({
      channel,
      text: `:bell: *Reminder*\n${input.message}`,
      unfurl_links: false,
      unfurl_media: false,
    });

    log.info('[Activity] Slack reminder sent', { channel });
  } catch (error: any) {
    log.error('[Activity] Failed to send Slack reminder', {
      error: error.message,
      userId: input.userId,
    });
    throw error;
  }
}
