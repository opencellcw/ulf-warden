/**
 * Discord Message Formatter
 * Utility for creating rich Discord embeds and formatted messages
 */

import { EmbedBuilder, ColorResolvable, APIEmbed } from 'discord.js';

export const DISCORD_COLORS = {
  // Brand
  BLURPLE: 0x5865F2,
  GREEN: 0x57F287,
  YELLOW: 0xFEE75C,
  FUCHSIA: 0xEB459E,
  RED: 0xED4245,

  // Status
  SUCCESS: 0x00FF00,
  WARNING: 0xFFCC00,
  ERROR: 0xFF0000,
  INFO: 0x0099FF,

  // Severity
  CRITICAL: 0xFF0000,
  HIGH: 0xFF6600,
  MEDIUM: 0xFFCC00,
  LOW: 0x0099FF,
} as const;

export const STATUS_EMOJIS = {
  ONLINE: '🟢',
  WARNING: '🟡',
  ERROR: '🔴',
  OFFLINE: '⚫',
  SUCCESS: '✅',
  FAILED: '❌',
  INFO: 'ℹ️',
  LOADING: '⏳',
} as const;

interface SystemMetrics {
  cpu?: string;
  memory?: string;
  disk?: string;
  uptime?: string;
  network?: string;
  processes?: number;
}

interface StatusReport {
  title: string;
  status: 'online' | 'warning' | 'error' | 'offline';
  metrics: SystemMetrics;
  details?: string;
  footer?: string;
}

/**
 * Create a system status embed
 */
export function createStatusEmbed(report: StatusReport): EmbedBuilder {
  const statusColors = {
    online: DISCORD_COLORS.SUCCESS,
    warning: DISCORD_COLORS.WARNING,
    error: DISCORD_COLORS.ERROR,
    offline: DISCORD_COLORS.RED,
  };

  const statusEmojis = {
    online: STATUS_EMOJIS.ONLINE,
    warning: STATUS_EMOJIS.WARNING,
    error: STATUS_EMOJIS.ERROR,
    offline: STATUS_EMOJIS.OFFLINE,
  };

  const embed = new EmbedBuilder()
    .setTitle(`${statusEmojis[report.status]} ${report.title}`)
    .setColor(statusColors[report.status] as ColorResolvable)
    .setTimestamp();

  if (report.details) {
    embed.setDescription(report.details);
  }

  // Add metrics as fields
  const metrics = report.metrics;
  if (metrics.cpu) {
    embed.addFields({ name: '⚡ CPU', value: metrics.cpu, inline: true });
  }
  if (metrics.memory) {
    embed.addFields({ name: '💾 Memory', value: metrics.memory, inline: true });
  }
  if (metrics.disk) {
    embed.addFields({ name: '💿 Disk', value: metrics.disk, inline: true });
  }
  if (metrics.uptime) {
    embed.addFields({ name: '⏰ Uptime', value: metrics.uptime, inline: true });
  }
  if (metrics.network) {
    embed.addFields({ name: '🌐 Network', value: metrics.network, inline: true });
  }
  if (metrics.processes !== undefined) {
    embed.addFields({ name: '🔄 Processes', value: String(metrics.processes), inline: true });
  }

  if (report.footer) {
    embed.setFooter({ text: report.footer });
  }

  return embed;
}

/**
 * Create an error embed
 */
export function createErrorEmbed(
  title: string,
  error: string | Error,
  details?: string
): EmbedBuilder {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  const embed = new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(errorMessage)
    .setColor(DISCORD_COLORS.ERROR as ColorResolvable)
    .setTimestamp();

  if (details) {
    embed.addFields({ name: '📝 Details', value: details, inline: false });
  }

  if (errorStack) {
    // Limit stack trace to 1000 chars
    const shortStack = errorStack.substring(0, 1000);
    embed.addFields({
      name: '🔍 Stack Trace',
      value: `\`\`\`\n${shortStack}\n\`\`\``,
      inline: false
    });
  }

  return embed;
}

/**
 * Create a success embed
 */
export function createSuccessEmbed(
  title: string,
  description?: string,
  fields?: Array<{ name: string; value: string; inline?: boolean }>
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setColor(DISCORD_COLORS.SUCCESS as ColorResolvable)
    .setTimestamp();

  if (description) {
    embed.setDescription(description);
  }

  if (fields) {
    embed.addFields(fields);
  }

  return embed;
}

/**
 * Create an info embed
 */
export function createInfoEmbed(
  title: string,
  description?: string,
  fields?: Array<{ name: string; value: string; inline?: boolean }>
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`ℹ️ ${title}`)
    .setColor(DISCORD_COLORS.INFO as ColorResolvable)
    .setTimestamp();

  if (description) {
    embed.setDescription(description);
  }

  if (fields) {
    embed.addFields(fields);
  }

  return embed;
}

/**
 * Create a loading/progress embed
 */
export function createLoadingEmbed(
  title: string,
  progress?: number,
  details?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`⏳ ${title}`)
    .setColor(DISCORD_COLORS.YELLOW as ColorResolvable)
    .setTimestamp();

  if (progress !== undefined) {
    const progressBar = createProgressBar(progress);
    embed.addFields({
      name: '📊 Progress',
      value: `${progressBar} ${progress}%`,
      inline: false
    });
  }

  if (details) {
    embed.setDescription(details);
  }

  return embed;
}

/**
 * Create a progress bar
 */
function createProgressBar(percentage: number, length: number = 10): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Format text with markdown
 */
export const markdown = {
  bold: (text: string) => `**${text}**`,
  italic: (text: string) => `*${text}*`,
  underline: (text: string) => `__${text}__`,
  strike: (text: string) => `~~${text}~~`,
  code: (text: string) => `\`${text}\``,
  codeBlock: (text: string, language: string = '') => `\`\`\`${language}\n${text}\n\`\`\``,
  quote: (text: string) => `> ${text}`,
  spoiler: (text: string) => `||${text}||`,
  link: (text: string, url: string) => `[${text}](${url})`,
  header: (text: string, level: 1 | 2 | 3 = 1) => `${'#'.repeat(level)} ${text}`,
};

/**
 * Split long text into chunks for Discord's 2000 char limit
 */
export function splitMessage(text: string, maxLength: number = 2000): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let currentChunk = '';

  const lines = text.split('\n');

  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // If single line is too long, split it
      if (line.length > maxLength) {
        const words = line.split(' ');
        for (const word of words) {
          if ((currentChunk + word + ' ').length > maxLength) {
            chunks.push(currentChunk.trim());
            currentChunk = word + ' ';
          } else {
            currentChunk += word + ' ';
          }
        }
      } else {
        currentChunk = line + '\n';
      }
    } else {
      currentChunk += line + '\n';
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Create a table from data
 */
export function createTable(
  headers: string[],
  rows: string[][],
  alignments: Array<'left' | 'center' | 'right'> = []
): string {
  const align = (text: string, width: number, alignment: 'left' | 'center' | 'right' = 'left') => {
    if (alignment === 'center') {
      const padding = Math.max(0, width - text.length);
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    } else if (alignment === 'right') {
      return text.padStart(width, ' ');
    } else {
      return text.padEnd(width, ' ');
    }
  };

  // Calculate column widths
  const widths = headers.map((h, i) => {
    const maxRowWidth = Math.max(...rows.map(r => (r[i] || '').length));
    return Math.max(h.length, maxRowWidth);
  });

  // Build table
  const headerRow = headers.map((h, i) =>
    align(h, widths[i], alignments[i] || 'left')
  ).join(' | ');

  const separator = widths.map(w => '-'.repeat(w)).join('-+-');

  const dataRows = rows.map(row =>
    row.map((cell, i) => align(cell || '', widths[i], alignments[i] || 'left')).join(' | ')
  );

  return `\`\`\`\n${headerRow}\n${separator}\n${dataRows.join('\n')}\n\`\`\``;
}
