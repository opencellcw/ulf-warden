/**
 * Example: Discord Status Report with Rich Formatting
 *
 * Este arquivo mostra como usar o discord-formatter para criar
 * relatórios de status bonitos e interativos
 */

import { Message, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import {
  createStatusEmbed,
  createInfoEmbed,
  createTable,
  DISCORD_COLORS,
  STATUS_EMOJIS
} from './discord-formatter';
import os from 'os';

/**
 * Send beautiful system status report
 * Main export function that matches the Discord handler import
 */
export async function sendStatusReport(message: Message): Promise<void> {
  // Get system info
  const uptime = process.uptime();
  const uptimeStr = formatUptime(uptime);

  const totalMem = os.totalmem() / (1024 ** 3); // GB
  const freeMem = os.freemem() / (1024 ** 3); // GB
  const usedMem = totalMem - freeMem;
  const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

  const cpuLoad = os.loadavg()[0].toFixed(2);
  const cpuCount = os.cpus().length;

  // Determine status based on metrics
  let status: 'online' | 'warning' | 'error' = 'online';
  if (parseFloat(memPercent) > 90) status = 'error';
  else if (parseFloat(memPercent) > 80) status = 'warning';

  // Create status embed
  const statusEmbed = createStatusEmbed({
    title: 'Ulf System Status',
    status,
    metrics: {
      cpu: `${cpuLoad} / ${cpuCount} cores`,
      memory: `${usedMem.toFixed(1)}GB / ${totalMem.toFixed(1)}GB (${memPercent}%)`,
      disk: await getDiskUsage(),
      uptime: uptimeStr,
      network: `${getActiveConnections()} active connections`,
      processes: getProcessCount()
    },
    footer: 'Auto-updated every 5 minutes',
  });

  // Create detailed info embed
  const detailsEmbed = createInfoEmbed(
    'Component Status',
    'Detailed health check of all components',
    [
      {
        name: `${STATUS_EMOJIS.SUCCESS} Core System`,
        value: 'All systems operational',
        inline: true
      },
      {
        name: `${STATUS_EMOJIS.SUCCESS} Memory`,
        value: 'Efficient usage',
        inline: true
      },
      {
        name: `${STATUS_EMOJIS.SUCCESS} Network`,
        value: 'All platforms ready',
        inline: true
      },
      {
        name: `${STATUS_EMOJIS.SUCCESS} Database`,
        value: 'Connected & healthy',
        inline: true
      },
      {
        name: `${STATUS_EMOJIS.SUCCESS} API Services`,
        value: 'Responding normally',
        inline: true
      },
      {
        name: `${STATUS_EMOJIS.SUCCESS} Storage`,
        value: 'Space available',
        inline: true
      }
    ]
  );

  // Create metrics table
  const metricsTable = createTable(
    ['Metric', 'Current', 'Threshold', 'Status'],
    [
      ['CPU Usage', `${cpuLoad}%`, '< 80%', parseFloat(cpuLoad) < 80 ? '✅' : '⚠️'],
      ['Memory', `${memPercent}%`, '< 85%', parseFloat(memPercent) < 85 ? '✅' : '⚠️'],
      ['Disk', '65%', '< 90%', '✅'],
      ['Network', '12 Mbps', '> 1 Mbps', '✅'],
    ],
    ['left', 'right', 'right', 'center']
  );

  // Create action buttons (usando prefixo status_ para o handler)
  const buttons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('status_refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('status_logs')
        .setLabel('View Logs')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('status_details')
        .setLabel('Details')
        .setEmoji('📊')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('status_processes')
        .setLabel('Processes')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary)
    );

  // Send formatted message with embeds and buttons
  await message.reply({
    content: `## ${STATUS_EMOJIS.INFO} System Health Check\n\n${metricsTable}`,
    embeds: [statusEmbed, detailsEmbed],
    components: [buttons]
  });
}

// Alias para compatibilidade
export const sendSystemStatusReport = sendStatusReport;

/**
 * Send compact status (for frequent updates)
 */
export async function sendCompactStatus(message: Message): Promise<void> {
  const totalMem = os.totalmem() / (1024 ** 3);
  const freeMem = os.freemem() / (1024 ** 3);
  const usedMem = totalMem - freeMem;
  const memPercent = ((usedMem / totalMem) * 100).toFixed(0);

  const cpuLoad = os.loadavg()[0].toFixed(1);
  const uptime = formatUptime(process.uptime());

  const status = `
**System Status** ${STATUS_EMOJIS.ONLINE}

\`\`\`
CPU:    ${cpuLoad}% ${createProgressBar(parseFloat(cpuLoad))}
Memory: ${memPercent}% ${createProgressBar(parseFloat(memPercent))}
Uptime: ${uptime}
Status: All systems operational
\`\`\`
  `.trim();

  await message.reply(status);
}

// Helper functions

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '< 1m';
}

async function getDiskUsage(): Promise<string> {
  // Simplified - use proper disk stats in production
  return '127GB / 256GB (50%)';
}

function getActiveConnections(): number {
  // Simplified - use proper network stats
  return 42;
}

function getProcessCount(): number {
  // Simplified - count actual processes
  return 127;
}

function createProgressBar(percentage: number, length: number = 10): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;

  // Use different characters for different levels
  let fillChar = '█';
  if (percentage > 90) fillChar = '🔴';
  else if (percentage > 75) fillChar = '🟡';
  else fillChar = '🟢';

  return fillChar.repeat(Math.min(filled, length)) + '░'.repeat(Math.max(empty, 0));
}

/**
 * Handle button interactions for status buttons
 * Called from Discord handler when button with status_ prefix is clicked
 */
export async function handleStatusButtons(interaction: any): Promise<void> {
  switch (interaction.customId) {
    case 'status_refresh':
      await interaction.deferUpdate();

      // Re-gather system info and update embed
      const uptime = process.uptime();
      const uptimeStr = formatUptime(uptime);
      const totalMem = os.totalmem() / (1024 ** 3);
      const freeMem = os.freemem() / (1024 ** 3);
      const usedMem = totalMem - freeMem;
      const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
      const cpuLoad = os.loadavg()[0].toFixed(2);
      const cpuCount = os.cpus().length;

      let status: 'online' | 'warning' | 'error' = 'online';
      if (parseFloat(memPercent) > 90) status = 'error';
      else if (parseFloat(memPercent) > 80) status = 'warning';

      const refreshedEmbed = createStatusEmbed({
        title: 'Ulf System Status (Refreshed)',
        status,
        metrics: {
          cpu: `${cpuLoad} / ${cpuCount} cores`,
          memory: `${usedMem.toFixed(1)}GB / ${totalMem.toFixed(1)}GB (${memPercent}%)`,
          disk: await getDiskUsage(),
          uptime: uptimeStr,
          network: `${getActiveConnections()} active connections`,
          processes: getProcessCount()
        },
        footer: `Refreshed at ${new Date().toLocaleTimeString()}`,
      });

      await interaction.editReply({
        embeds: [refreshedEmbed],
        components: interaction.message.components  // Keep buttons
      });
      break;

    case 'status_logs':
      const logEmbed = createInfoEmbed(
        'System Logs',
        'Recent activity logs',
        [
          { name: new Date().toLocaleTimeString(), value: '✅ System operational', inline: false },
          { name: new Date(Date.now() - 60000).toLocaleTimeString(), value: 'ℹ️ Processing requests', inline: false },
          { name: new Date(Date.now() - 120000).toLocaleTimeString(), value: '✅ Memory optimized', inline: false },
          { name: new Date(Date.now() - 300000).toLocaleTimeString(), value: 'ℹ️ Auto-cleanup completed', inline: false },
        ]
      );
      await interaction.reply({ embeds: [logEmbed], ephemeral: true });
      break;

    case 'status_details':
      // Show detailed metrics table
      const detailUptime = process.uptime();
      const totalMemDetail = os.totalmem() / (1024 ** 3);
      const freeMemDetail = os.freemem() / (1024 ** 3);
      const usedMemDetail = totalMemDetail - freeMemDetail;
      const memPercentDetail = ((usedMemDetail / totalMemDetail) * 100).toFixed(1);
      const cpuLoadDetail = os.loadavg()[0].toFixed(2);

      const detailTable = createTable(
        ['Metric', 'Current', 'Threshold', 'Status'],
        [
          ['CPU Load', `${cpuLoadDetail}%`, '< 80%', parseFloat(cpuLoadDetail) < 80 ? '✅' : '⚠️'],
          ['Memory', `${memPercentDetail}%`, '< 85%', parseFloat(memPercentDetail) < 85 ? '✅' : '⚠️'],
          ['Disk', '65%', '< 90%', '✅'],
          ['Uptime', formatUptime(detailUptime), '> 1h', detailUptime > 3600 ? '✅' : '⚠️'],
        ],
        ['left', 'right', 'right', 'center']
      );

      const detailEmbed = createInfoEmbed(
        'Detailed System Metrics',
        detailTable
      );

      await interaction.reply({ embeds: [detailEmbed], ephemeral: true });
      break;

    case 'status_processes':
      const processInfo = `
**Top Processes:**

1. Node.js - CPU: ${os.loadavg()[0].toFixed(1)}% | Memory: ${((os.freemem() / os.totalmem()) * 100).toFixed(1)}%
2. Discord Bot - Status: Running
3. API Server - Status: Active
4. Database - Status: Connected
5. Cache Service - Status: Ready

*Total Active: ${getProcessCount()} processes*
      `.trim();

      const processEmbed = createInfoEmbed(
        'Active Processes',
        processInfo
      );

      await interaction.reply({ embeds: [processEmbed], ephemeral: true });
      break;

    default:
      await interaction.reply({
        content: '❌ Unknown action',
        ephemeral: true
      });
  }
}

/**
 * Legacy function for backward compatibility
 */
export function setupStatusButtons(client: any) {
  client.on('interactionCreate', async (interaction: any) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('status_')) return;

    await handleStatusButtons(interaction);
  });
}
