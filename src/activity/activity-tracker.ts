/**
 * Activity Tracker - Real-time bot monitoring via Discord channel
 *
 * Emits events as rich embeds to a dedicated #bot-activity channel.
 * Rate-limited (max 1 message per 10s via queue batching) with idle detection.
 * Graceful: does nothing if DISCORD_ACTIVITY_CHANNEL is not set.
 */

import { EventEmitter } from 'events';
import { Client, TextChannel, EmbedBuilder, ColorResolvable } from 'discord.js';
import { log } from '../logger';

const FLUSH_INTERVAL_MS = 10_000; // Batch and flush every 10s
const DEFAULT_IDLE_MINUTES = 15;

const EVENT_COLORS: Record<string, number> = {
  online:     0x57F287, // Green
  idle:       0xFEE75C, // Yellow
  processing: 0x5865F2, // Blurple/Blue
  tool_use:   0xFEE75C, // Yellow
  completed:  0x57F287, // Green
  error:      0xED4245, // Red
  security:   0xED4245, // Red
};

const EVENT_EMOJIS: Record<string, string> = {
  online:     '🟢',
  idle:       '💤',
  processing: '⚙️',
  tool_use:   '🔧',
  completed:  '✅',
  error:      '❌',
  security:   '🛡️',
};

interface ActivityEvent {
  type: string;
  embed: EmbedBuilder;
  timestamp: number;
}

class ActivityTracker extends EventEmitter {
  private client: Client | null = null;
  private channelId: string | null = null;
  private channel: TextChannel | null = null;
  private queue: ActivityEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private idleMinutes: number;
  private lastActivity: number = Date.now();
  private initialized = false;

  constructor() {
    super();
    this.idleMinutes = parseInt(process.env.ACTIVITY_IDLE_MINUTES || String(DEFAULT_IDLE_MINUTES));
  }

  /**
   * Initialize tracker with Discord client. No-op if channel ID not configured.
   */
  async init(client: Client): Promise<void> {
    this.channelId = process.env.DISCORD_ACTIVITY_CHANNEL || null;
    if (!this.channelId) {
      log.info('[ActivityTracker] DISCORD_ACTIVITY_CHANNEL not set, tracker disabled');
      return;
    }

    this.client = client;

    try {
      const ch = await client.channels.fetch(this.channelId);
      if (!ch || !ch.isTextBased()) {
        log.warn('[ActivityTracker] Channel not found or not text-based', { channelId: this.channelId });
        return;
      }
      this.channel = ch as TextChannel;
    } catch (err: any) {
      log.warn('[ActivityTracker] Failed to fetch activity channel', { error: err.message });
      return;
    }

    // Start flush timer
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);

    // Start idle detection
    this.resetIdleTimer();

    this.initialized = true;
    log.info('[ActivityTracker] Initialized', { channelId: this.channelId, idleMinutes: this.idleMinutes });

    // Send online event immediately (bypass queue)
    await this.sendOnline();
  }

  /**
   * Check if tracker is active
   */
  isActive(): boolean {
    return this.initialized && this.channel !== null;
  }

  /**
   * Emit a processing event (message received)
   */
  emitProcessing(username: string, channel: string, preview: string): void {
    if (!this.isActive()) return;
    this.touchActivity();

    const embed = new EmbedBuilder()
      .setTitle(`${EVENT_EMOJIS.processing} Processing`)
      .setColor(EVENT_COLORS.processing as ColorResolvable)
      .addFields(
        { name: 'User', value: username, inline: true },
        { name: 'Channel', value: channel, inline: true },
        { name: 'Message', value: preview.substring(0, 200) || '(empty)', inline: false }
      )
      .setTimestamp();

    this.enqueue('processing', embed);
  }

  /**
   * Emit a tool_use event (high-risk tool executed)
   */
  emitToolUse(toolName: string, inputPreview: string): void {
    if (!this.isActive()) return;
    this.touchActivity();

    const embed = new EmbedBuilder()
      .setTitle(`${EVENT_EMOJIS.tool_use} Tool Use`)
      .setColor(EVENT_COLORS.tool_use as ColorResolvable)
      .addFields(
        { name: 'Tool', value: `\`${toolName}\``, inline: true },
        { name: 'Input', value: inputPreview.substring(0, 300) || '(none)', inline: false }
      )
      .setTimestamp();

    this.enqueue('tool_use', embed);
  }

  /**
   * Emit a completed event (agent finished)
   */
  emitCompleted(iterations: number, durationMs: number): void {
    if (!this.isActive()) return;
    this.touchActivity();

    const durationSec = (durationMs / 1000).toFixed(1);
    const embed = new EmbedBuilder()
      .setTitle(`${EVENT_EMOJIS.completed} Agent Completed`)
      .setColor(EVENT_COLORS.completed as ColorResolvable)
      .addFields(
        { name: 'Iterations', value: String(iterations), inline: true },
        { name: 'Duration', value: `${durationSec}s`, inline: true }
      )
      .setTimestamp();

    this.enqueue('completed', embed);
  }

  /**
   * Emit an error event
   */
  emitError(errorMessage: string): void {
    if (!this.isActive()) return;

    const embed = new EmbedBuilder()
      .setTitle(`${EVENT_EMOJIS.error} Error`)
      .setColor(EVENT_COLORS.error as ColorResolvable)
      .setDescription(errorMessage.substring(0, 500))
      .setTimestamp();

    this.enqueue('error', embed);
  }

  /**
   * Emit a security event (tool blocked)
   */
  emitSecurity(toolName: string, reason: string, userId?: string): void {
    if (!this.isActive()) return;

    const embed = new EmbedBuilder()
      .setTitle(`${EVENT_EMOJIS.security} Security Block`)
      .setColor(EVENT_COLORS.security as ColorResolvable)
      .addFields(
        { name: 'Tool', value: `\`${toolName}\``, inline: true },
        { name: 'User', value: userId || 'unknown', inline: true },
        { name: 'Reason', value: reason.substring(0, 300), inline: false }
      )
      .setTimestamp();

    this.enqueue('security', embed);
  }

  /**
   * Cleanup: flush remaining events and stop timers
   */
  async shutdown(): Promise<void> {
    if (!this.isActive()) return;

    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.idleTimer) clearTimeout(this.idleTimer);

    // Final flush
    await this.flush();

    this.initialized = false;
    log.info('[ActivityTracker] Shut down');
  }

  // --- Private ---

  private enqueue(type: string, embed: EmbedBuilder): void {
    this.queue.push({ type, embed, timestamp: Date.now() });
  }

  private async flush(): Promise<void> {
    if (!this.channel || this.queue.length === 0) return;

    // Take all queued events (max 10 embeds per message)
    const batch = this.queue.splice(0, 10);
    const embeds = batch.map(e => e.embed);

    try {
      await this.channel.send({ embeds });
    } catch (err: any) {
      log.warn('[ActivityTracker] Failed to send embeds', { error: err.message, count: embeds.length });
    }
  }

  private touchActivity(): void {
    this.lastActivity = Date.now();
    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);

    this.idleTimer = setTimeout(() => {
      this.sendIdle();
    }, this.idleMinutes * 60 * 1000);
  }

  private async sendOnline(): Promise<void> {
    if (!this.channel) return;

    const platforms: string[] = [];
    if (process.env.DISCORD_BOT_TOKEN) platforms.push('Discord');
    if (process.env.SLACK_BOT_TOKEN) platforms.push('Slack');
    if (process.env.TELEGRAM_BOT_TOKEN) platforms.push('Telegram');
    if (process.env.WHATSAPP_ENABLED === 'true') platforms.push('WhatsApp');

    const embed = new EmbedBuilder()
      .setTitle(`${EVENT_EMOJIS.online} Bot Online`)
      .setColor(EVENT_COLORS.online as ColorResolvable)
      .addFields(
        { name: 'Platforms', value: platforms.join(', ') || 'None', inline: true }
      )
      .setTimestamp();

    try {
      await this.channel.send({ embeds: [embed] });
    } catch (err: any) {
      log.warn('[ActivityTracker] Failed to send online event', { error: err.message });
    }
  }

  private async sendIdle(): Promise<void> {
    if (!this.channel) return;

    const idleSince = new Date(this.lastActivity);
    const embed = new EmbedBuilder()
      .setTitle(`${EVENT_EMOJIS.idle} Idle`)
      .setColor(EVENT_COLORS.idle as ColorResolvable)
      .addFields(
        { name: 'Last Activity', value: `<t:${Math.floor(this.lastActivity / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    try {
      await this.channel.send({ embeds: [embed] });
    } catch (err: any) {
      log.warn('[ActivityTracker] Failed to send idle event', { error: err.message });
    }
  }
}

// Singleton
export const activityTracker = new ActivityTracker();
