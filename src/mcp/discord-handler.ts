import { Message, EmbedBuilder } from 'discord.js';
import { getMCPClientManager } from './client';
import { getMCPStatus } from './lifecycle';
import { log } from '../logger';

/**
 * MCP Discord Commands
 * 
 * Commands for managing and inspecting MCP servers from Discord
 */

/**
 * Check if message is an MCP command
 */
export function isMCPCommand(message: string): boolean {
  const patterns = [
    /^!mcp\b/i,
    /^!servers\b/i,
    /^\/mcp\b/i
  ];

  return patterns.some(pattern => pattern.test(message));
}

/**
 * Handle MCP commands
 */
export async function handleMCPCommand(message: Message): Promise<void> {
  const content = message.content.trim();
  const parts = content.split(/\s+/);
  const command = parts[0].toLowerCase();
  const subcommand = parts[1]?.toLowerCase();

  try {
    switch (subcommand) {
      case 'status':
        await handleStatusCommand(message);
        break;

      case 'servers':
        await handleServersCommand(message);
        break;

      case 'tools':
        const serverName = parts[2];
        await handleToolsCommand(message, serverName);
        break;

      case 'help':
        await handleHelpCommand(message);
        break;

      default:
        await handleStatusCommand(message);
        break;
    }
  } catch (error: any) {
    log.error('[MCP-Discord] Command failed', {
      command,
      error: error.message
    });
    await message.reply(`❌ MCP command failed: ${error.message}`);
  }
}

/**
 * Handle status command
 */
async function handleStatusCommand(message: Message): Promise<void> {
  const status = getMCPStatus();
  const mcpClient = getMCPClientManager();
  const statuses = mcpClient.getAllServerStatuses();

  const embed = new EmbedBuilder()
    .setTitle('🔌 MCP System Status')
    .setColor(status.initialized ? 0x00FF00 : 0xFF0000)
    .setDescription(status.initialized 
      ? 'MCP system is running' 
      : 'MCP system is not initialized'
    )
    .addFields(
      {
        name: 'Servers Connected',
        value: status.servers.toString(),
        inline: true
      },
      {
        name: 'Health Check',
        value: status.healthCheckRunning ? '✅ Running' : '❌ Stopped',
        inline: true
      }
    )
    .setTimestamp();

  if (statuses.length > 0) {
    const serversField = statuses.map(s => 
      `${s.connected ? '✅' : '❌'} **${s.name}** - ${s.tools} tools`
    ).join('\n');

    embed.addFields({
      name: 'Connected Servers',
      value: serversField || 'None',
      inline: false
    });
  }

  await message.reply({ embeds: [embed] });
}

/**
 * Handle servers command
 */
async function handleServersCommand(message: Message): Promise<void> {
  const mcpClient = getMCPClientManager();
  const statuses = mcpClient.getAllServerStatuses();

  if (statuses.length === 0) {
    await message.reply('📋 No MCP servers connected.\n\nTo add servers, configure them in `mcp.json`');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🔌 MCP Servers')
    .setColor(0x5865F2);

  statuses.forEach(status => {
    const statusEmoji = status.connected ? '✅' : '❌';
    const transportEmoji = status.transport === 'stdio' ? '💻' : '🌐';

    embed.addFields({
      name: `${statusEmoji} ${status.name}`,
      value: `
**Transport**: ${transportEmoji} ${status.transport}
**Tools**: ${status.tools}
**Resources**: ${status.resources}
**Prompts**: ${status.prompts}
      `.trim(),
      inline: true
    });
  });

  embed.setFooter({
    text: 'Use !mcp tools <server> to list available tools'
  });

  await message.reply({ embeds: [embed] });
}

/**
 * Handle tools command
 */
async function handleToolsCommand(message: Message, serverName?: string): Promise<void> {
  const mcpClient = getMCPClientManager();

  if (!serverName) {
    // List all tools from all servers
    const allTools = await mcpClient.listAllTools();

    if (allTools.length === 0) {
      await message.reply('📋 No MCP tools available.\n\nConnect to MCP servers first.');
      return;
    }

    // Group by server
    const byServer: Record<string, number> = {};
    allTools.forEach(tool => {
      byServer[tool.serverName] = (byServer[tool.serverName] || 0) + 1;
    });

    const embed = new EmbedBuilder()
      .setTitle('🔧 All MCP Tools')
      .setColor(0x5865F2)
      .setDescription(`Total: ${allTools.length} tools from ${Object.keys(byServer).length} servers`);

    Object.entries(byServer).forEach(([server, count]) => {
      embed.addFields({
        name: server,
        value: `${count} tools`,
        inline: true
      });
    });

    embed.setFooter({
      text: 'Use !mcp tools <server> to see details'
    });

    await message.reply({ embeds: [embed] });
    return;
  }

  // List tools for specific server
  if (!mcpClient.isConnected(serverName)) {
    await message.reply(`❌ Server "${serverName}" is not connected.`);
    return;
  }

  const tools = mcpClient.getServerTools(serverName);

  if (tools.length === 0) {
    await message.reply(`📋 Server "${serverName}" has no tools.`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔧 ${serverName} Tools`)
    .setColor(0x5865F2)
    .setDescription(`Available tools from ${serverName}:`);

  tools.slice(0, 10).forEach(tool => {  // Limit to 10 for embed size
    embed.addFields({
      name: tool.name,
      value: tool.description.substring(0, 100) + (tool.description.length > 100 ? '...' : ''),
      inline: false
    });
  });

  if (tools.length > 10) {
    embed.setFooter({
      text: `Showing 10 of ${tools.length} tools`
    });
  }

  await message.reply({ embeds: [embed] });
}

/**
 * Handle help command
 */
async function handleHelpCommand(message: Message): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('🔌 MCP Commands')
    .setColor(0x5865F2)
    .setDescription('Model Context Protocol integration commands')
    .addFields(
      {
        name: '!mcp status',
        value: 'Show MCP system status and connected servers',
        inline: false
      },
      {
        name: '!mcp servers',
        value: 'List all MCP servers with details',
        inline: false
      },
      {
        name: '!mcp tools',
        value: 'List all available tools',
        inline: false
      },
      {
        name: '!mcp tools <server>',
        value: 'List tools for a specific server',
        inline: false
      },
      {
        name: '!mcp help',
        value: 'Show this help message',
        inline: false
      }
    )
    .setFooter({
      text: 'MCP allows OpenCell to use tools from external servers'
    });

  await message.reply({ embeds: [embed] });
}
