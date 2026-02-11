/**
 * Admin Commands
 *
 * Comprehensive admin control system for managing permissions,
 * system health, configuration, and more.
 */

import { Message, EmbedBuilder } from 'discord.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { log } from '../logger';

const execAsync = promisify(exec);

const ENV_PATH = path.join(process.cwd(), '.env');
const DATA_DIR = process.env.DATA_DIR || './data';

/**
 * Check if user is authorized admin
 */
function isAuthorized(userId: string): boolean {
  const authorizedUsers = (process.env.AUTHORIZED_ADMIN_USERS || '').split(',').map(id => id.trim());
  return authorizedUsers.includes(userId);
}

/**
 * Get list of admin users
 */
async function getAdminUsers(): Promise<string[]> {
  const authorizedUsers = (process.env.AUTHORIZED_ADMIN_USERS || '').split(',').map(id => id.trim()).filter(id => id);
  return authorizedUsers;
}

/**
 * Add admin user
 */
async function addAdminUser(userId: string): Promise<void> {
  const admins = await getAdminUsers();

  if (admins.includes(userId)) {
    throw new Error('User is already an admin');
  }

  admins.push(userId);

  // Update .env file
  let envContent = await fs.readFile(ENV_PATH, 'utf-8');
  const newValue = admins.join(',');

  if (envContent.includes('AUTHORIZED_ADMIN_USERS=')) {
    envContent = envContent.replace(
      /AUTHORIZED_ADMIN_USERS=.*/,
      `AUTHORIZED_ADMIN_USERS=${newValue}`
    );
  } else {
    envContent += `\nAUTHORIZED_ADMIN_USERS=${newValue}\n`;
  }

  await fs.writeFile(ENV_PATH, envContent);

  // Update K8s deployment
  try {
    await execAsync(`kubectl set env deployment/ulf-warden-agent -n agents AUTHORIZED_ADMIN_USERS=${newValue}`);
  } catch (error: any) {
    log.warn('[Admin] Failed to update K8s env', { error: error.message });
  }

  log.info('[Admin] Added admin user', { userId });
}

/**
 * Remove admin user
 */
async function removeAdminUser(userId: string, requesterId: string): Promise<void> {
  if (userId === requesterId) {
    throw new Error('Cannot remove yourself as admin');
  }

  const admins = await getAdminUsers();

  if (!admins.includes(userId)) {
    throw new Error('User is not an admin');
  }

  const newAdmins = admins.filter(id => id !== userId);

  if (newAdmins.length === 0) {
    throw new Error('Cannot remove last admin');
  }

  // Update .env file
  let envContent = await fs.readFile(ENV_PATH, 'utf-8');
  const newValue = newAdmins.join(',');

  envContent = envContent.replace(
    /AUTHORIZED_ADMIN_USERS=.*/,
    `AUTHORIZED_ADMIN_USERS=${newValue}`
  );

  await fs.writeFile(ENV_PATH, envContent);

  // Update K8s deployment
  try {
    await execAsync(`kubectl set env deployment/ulf-warden-agent -n agents AUTHORIZED_ADMIN_USERS=${newValue}`);
  } catch (error: any) {
    log.warn('[Admin] Failed to update K8s env', { error: error.message });
  }

  log.info('[Admin] Removed admin user', { userId, removedBy: requesterId });
}

/**
 * Get system status
 */
async function getSystemStatus(): Promise<any> {
  const status: any = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV || 'development'
  };

  // Try to get K8s pod info
  try {
    const { stdout } = await execAsync('kubectl get pods -n agents -o json');
    const pods = JSON.parse(stdout);
    status.kubernetes = {
      pods: pods.items.length,
      ready: pods.items.filter((p: any) => p.status.phase === 'Running').length
    };
  } catch (error) {
    status.kubernetes = 'Not available';
  }

  return status;
}

/**
 * Get recent logs
 */
async function getRecentLogs(lines: number = 50): Promise<string> {
  try {
    const { stdout } = await execAsync(`kubectl logs -n agents deployment/ulf-warden-agent --tail=${lines}`);
    return stdout;
  } catch (error: any) {
    return `Failed to get logs: ${error.message}`;
  }
}

/**
 * Restart bot
 */
async function restartBot(): Promise<void> {
  try {
    await execAsync('kubectl rollout restart deployment/ulf-warden-agent -n agents');
    log.info('[Admin] Bot restart initiated');
  } catch (error: any) {
    throw new Error(`Failed to restart: ${error.message}`);
  }
}

/**
 * Admin command handler
 */
export async function handleAdminCommand(message: Message, args: string[]): Promise<void> {
  // Check authorization
  if (!isAuthorized(message.author.id)) {
    await message.reply({
      embeds: [{
        title: '❌ Unauthorized',
        description: 'You do not have permission to use admin commands.',
        color: 0xED4245 // Red
      }]
    });
    return;
  }

  // Require DM for security
  if (!message.channel.isDMBased()) {
    await message.reply({
      embeds: [{
        title: '⚠️ Security Warning',
        description: 'Admin commands must be used in DM for security.',
        color: 0xFF9900 // Orange
      }]
    });
    return;
  }

  if (args.length === 0) {
    await showAdminHelp(message);
    return;
  }

  const subcommand = args[0].toLowerCase();
  const subArgs = args.slice(1);

  try {
    switch (subcommand) {
      case 'add-user':
        await handleAddUser(message, subArgs);
        break;

      case 'remove-user':
        await handleRemoveUser(message, subArgs);
        break;

      case 'list-users':
        await handleListUsers(message);
        break;

      case 'status':
        await handleStatus(message);
        break;

      case 'logs':
        await handleLogs(message, subArgs);
        break;

      case 'restart':
        await handleRestart(message);
        break;

      case 'health':
        await handleHealth(message);
        break;

      default:
        await message.reply({
          embeds: [{
            title: '❌ Unknown Subcommand',
            description: `Unknown admin subcommand: ${subcommand}\n\nUse \`/admin\` to see available commands.`,
            color: 0xED4245
          }]
        });
    }
  } catch (error: any) {
    log.error('[Admin] Command failed', { subcommand, error: error.message });
    await message.reply({
      embeds: [{
        title: '❌ Command Failed',
        description: error.message,
        color: 0xED4245
      }]
    });
  }
}

/**
 * Show admin help
 */
async function showAdminHelp(message: Message): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('🔧 Admin Commands')
    .setDescription('Comprehensive admin control system')
    .setColor(0x5865F2) // Discord blue
    .addFields(
      {
        name: '👥 User Management',
        value: '`/admin add-user <user-id>` - Add admin\n' +
               '`/admin remove-user <user-id>` - Remove admin\n' +
               '`/admin list-users` - List all admins',
        inline: false
      },
      {
        name: '⚙️ System Control',
        value: '`/admin restart` - Restart bot\n' +
               '`/admin status` - System status\n' +
               '`/admin logs [lines]` - Recent logs\n' +
               '`/admin health` - Health check',
        inline: false
      },
      {
        name: '🔑 Key Management',
        value: '`/rotate-key <key>` - Rotate API key\n' +
               '`/key-status` - Check key status',
        inline: false
      },
      {
        name: '❓ Help',
        value: '`/help` - General help\n' +
               '`/help admin` - This message',
        inline: false
      }
    )
    .setFooter({ text: 'All admin commands require DM for security' })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

/**
 * Handle add-user
 */
async function handleAddUser(message: Message, args: string[]): Promise<void> {
  if (args.length === 0) {
    await message.reply('Usage: `/admin add-user <user-id>`');
    return;
  }

  const userId = args[0];

  await addAdminUser(userId);

  await message.reply({
    embeds: [{
      title: '✅ Admin User Added',
      description: `User <@${userId}> has been added as admin.`,
      color: 0x57F287, // Green
      fields: [
        {
          name: '🔄 Next Steps',
          value: 'Bot will restart automatically to apply changes.\nThe new admin can now use admin commands.'
        }
      ],
      timestamp: new Date().toISOString()
    }]
  });
}

/**
 * Handle remove-user
 */
async function handleRemoveUser(message: Message, args: string[]): Promise<void> {
  if (args.length === 0) {
    await message.reply('Usage: `/admin remove-user <user-id>`');
    return;
  }

  const userId = args[0];

  await removeAdminUser(userId, message.author.id);

  await message.reply({
    embeds: [{
      title: '✅ Admin User Removed',
      description: `User <@${userId}> has been removed from admins.`,
      color: 0x57F287,
      fields: [
        {
          name: '🔄 Next Steps',
          value: 'Bot will restart automatically to apply changes.'
        }
      ],
      timestamp: new Date().toISOString()
    }]
  });
}

/**
 * Handle list-users
 */
async function handleListUsers(message: Message): Promise<void> {
  const admins = await getAdminUsers();

  const embed = new EmbedBuilder()
    .setTitle('👥 Admin Users')
    .setDescription(`Total: ${admins.length} admin(s)`)
    .setColor(0x5865F2)
    .addFields(
      admins.map((userId, index) => ({
        name: `${index + 1}. Admin`,
        value: `<@${userId}>\n\`${userId}\``,
        inline: true
      }))
    )
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

/**
 * Handle status
 */
async function handleStatus(message: Message): Promise<void> {
  const status = await getSystemStatus();

  const uptimeHours = Math.floor(status.uptime / 3600);
  const uptimeMinutes = Math.floor((status.uptime % 3600) / 60);

  const memoryUsedMB = Math.round(status.memory.heapUsed / 1024 / 1024);
  const memoryTotalMB = Math.round(status.memory.heapTotal / 1024 / 1024);

  const embed = new EmbedBuilder()
    .setTitle('📊 System Status')
    .setColor(0x57F287) // Green
    .addFields(
      {
        name: '⏱️ Uptime',
        value: `${uptimeHours}h ${uptimeMinutes}m`,
        inline: true
      },
      {
        name: '💾 Memory',
        value: `${memoryUsedMB}MB / ${memoryTotalMB}MB`,
        inline: true
      },
      {
        name: '🟢 Node.js',
        value: status.version,
        inline: true
      },
      {
        name: '🖥️ Platform',
        value: status.platform,
        inline: true
      },
      {
        name: '🌍 Environment',
        value: status.env,
        inline: true
      },
      {
        name: '☸️ Kubernetes',
        value: typeof status.kubernetes === 'object'
          ? `${status.kubernetes.ready}/${status.kubernetes.pods} pods ready`
          : status.kubernetes,
        inline: true
      }
    )
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

/**
 * Handle logs
 */
async function handleLogs(message: Message, args: string[]): Promise<void> {
  const lines = args.length > 0 ? parseInt(args[0]) : 50;

  if (isNaN(lines) || lines < 1 || lines > 500) {
    await message.reply('Lines must be between 1 and 500');
    return;
  }

  await message.reply('Fetching logs...');

  const logs = await getRecentLogs(lines);

  // Check if channel supports sending messages
  if (!('send' in message.channel)) {
    await message.reply('❌ Cannot send logs in this channel type.');
    return;
  }

  // Split logs if too long
  if (logs.length > 1900) {
    const chunks = logs.match(/[\s\S]{1,1900}/g) || [];
    for (const chunk of chunks.slice(0, 3)) { // Max 3 chunks
      await message.channel.send('```\n' + chunk + '\n```');
    }
    if (chunks.length > 3) {
      await message.channel.send('*(Logs truncated - too long)*');
    }
  } else {
    await message.channel.send('```\n' + logs + '\n```');
  }
}

/**
 * Handle restart
 */
async function handleRestart(message: Message): Promise<void> {
  await message.reply({
    embeds: [{
      title: '⚠️ Restart Confirmation',
      description: 'Are you sure you want to restart the bot?\n\nReply with `yes` to confirm.',
      color: 0xFF9900
    }]
  });

  // Check if channel supports awaitMessages
  if (!('awaitMessages' in message.channel)) {
    await message.reply('❌ Cannot await confirmation in this channel type.');
    return;
  }

  // Wait for confirmation
  const filter = (m: Message) => m.author.id === message.author.id && m.content.toLowerCase() === 'yes';

  try {
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });

    if (collected.size > 0) {
      await message.reply({
        embeds: [{
          title: '🔄 Restarting Bot',
          description: 'Bot is restarting... This will take ~1-2 minutes.',
          color: 0xFEE75C
        }]
      });

      await restartBot();
    }
  } catch (error) {
    await message.reply('Restart cancelled (timeout).');
  }
}

/**
 * Handle health
 */
async function handleHealth(message: Message): Promise<void> {
  const status = await getSystemStatus();

  const memoryPercent = Math.round((status.memory.heapUsed / status.memory.heapTotal) * 100);

  let health = '🟢 Healthy';
  let color = 0x57F287; // Green

  if (memoryPercent > 90) {
    health = '🔴 Critical';
    color = 0xED4245; // Red
  } else if (memoryPercent > 75) {
    health = '🟡 Warning';
    color = 0xFEE75C; // Yellow
  }

  const embed = new EmbedBuilder()
    .setTitle('🏥 Health Check')
    .setDescription(`Status: **${health}**`)
    .setColor(color)
    .addFields(
      {
        name: '💾 Memory Usage',
        value: `${memoryPercent}%`,
        inline: true
      },
      {
        name: '⏱️ Uptime',
        value: `${Math.floor(status.uptime / 3600)}h`,
        inline: true
      },
      {
        name: '📝 Recommendations',
        value: memoryPercent > 75
          ? '⚠️ Consider restarting if memory continues to grow'
          : '✅ All systems nominal',
        inline: false
      }
    )
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}
