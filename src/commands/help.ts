/**
 * Help Command System
 *
 * Comprehensive help system for all bot commands
 */

import { Message, EmbedBuilder } from 'discord.js';

/**
 * Command documentation
 */
interface CommandDoc {
  name: string;
  description: string;
  usage: string;
  examples?: string[];
  category: 'general' | 'admin' | 'key' | 'system';
  dmOnly?: boolean;
}

const COMMANDS: CommandDoc[] = [
  // General Commands
  {
    name: 'help',
    description: 'Show this help message',
    usage: '/help [command]',
    examples: [
      '/help',
      '/help admin',
      '/help rotate-key'
    ],
    category: 'general'
  },
  {
    name: 'status',
    description: 'Show system status with metrics',
    usage: '/status',
    category: 'general'
  },
  {
    name: 'search',
    description: '🔍 Search across all data sources (memory, conversations, etc)',
    usage: '/search <query>',
    examples: [
      '/search kubernetes error',
      '/search deployment issues'
    ],
    category: 'general'
  },
  {
    name: 'learn',
    description: '🎓 View auto-learned skills and patterns',
    usage: '/learn',
    examples: ['/learn'],
    category: 'general'
  },
  {
    name: 'dream',
    description: '🌙 Background AI analysis and insights',
    usage: '/dream <start|status>',
    examples: [
      '/dream start',
      '/dream status'
    ],
    category: 'general'
  },
  {
    name: 'copystyle',
    description: '🎭 AI learns YOUR writing style and writes exactly like you',
    usage: '/copystyle <status|write|analyze>',
    examples: [
      '/copystyle status',
      '/copystyle write email to team about new feature',
      '/copystyle analyze'
    ],
    category: 'general'
  },
  {
    name: 'remind',
    description: '⏰ Smart reminders that never let you forget',
    usage: '/remind <what> <when>',
    examples: [
      '/remind review PR tomorrow at 2pm',
      '/remind standup in 30 min',
      '/remind deploy Friday'
    ],
    category: 'general'
  },
  {
    name: 'reminders',
    description: '📋 List your pending reminders',
    usage: '/reminders',
    category: 'general'
  },
  {
    name: 'theme',
    description: '🎨 Customize bot visual theme',
    usage: '/theme <cyberpunk|minimal|neon|retro|professional>',
    examples: [
      '/theme cyberpunk',
      '/theme list'
    ],
    category: 'general'
  },
  {
    name: 'personality',
    description: '🎭 Change bot personality',
    usage: '/personality <professional|casual|sarcastic|motivational|zen>',
    examples: [
      '/personality casual',
      '/personality list'
    ],
    category: 'general'
  },
  {
    name: 'mood',
    description: '🧠 View your mood report and sentiment analysis',
    usage: '/mood',
    category: 'general'
  },
  {
    name: 'teammood',
    description: '👥 Team mood dashboard and burnout detection',
    usage: '/teammood',
    category: 'general'
  },

  // Key Management
  {
    name: 'key-status',
    description: 'Check API key expiration status',
    usage: '/key-status',
    examples: ['/key-status'],
    category: 'key',
    dmOnly: true
  },
  {
    name: 'rotate-key',
    description: 'Rotate the Anthropic API key (24h expiration)',
    usage: '/rotate-key <new-key>',
    examples: ['/rotate-key sk-ant-api03-...'],
    category: 'key',
    dmOnly: true
  },

  // Admin Commands
  {
    name: 'admin',
    description: 'Admin control system',
    usage: '/admin <subcommand> [args]',
    examples: [
      '/admin',
      '/admin list-users',
      '/admin add-user 123456789',
      '/admin status',
      '/admin logs 100'
    ],
    category: 'admin',
    dmOnly: true
  },
  {
    name: 'admin add-user',
    description: 'Add a new admin user',
    usage: '/admin add-user <user-id>',
    examples: ['/admin add-user 123456789012345678'],
    category: 'admin',
    dmOnly: true
  },
  {
    name: 'admin remove-user',
    description: 'Remove an admin user',
    usage: '/admin remove-user <user-id>',
    examples: ['/admin remove-user 123456789012345678'],
    category: 'admin',
    dmOnly: true
  },
  {
    name: 'admin list-users',
    description: 'List all admin users',
    usage: '/admin list-users',
    category: 'admin',
    dmOnly: true
  },
  {
    name: 'admin status',
    description: 'Show detailed system status',
    usage: '/admin status',
    category: 'admin',
    dmOnly: true
  },
  {
    name: 'admin logs',
    description: 'Show recent bot logs',
    usage: '/admin logs [lines]',
    examples: [
      '/admin logs',
      '/admin logs 100'
    ],
    category: 'admin',
    dmOnly: true
  },
  {
    name: 'admin restart',
    description: 'Restart the bot (requires confirmation)',
    usage: '/admin restart',
    category: 'admin',
    dmOnly: true
  },
  {
    name: 'admin health',
    description: 'Health check with recommendations',
    usage: '/admin health',
    category: 'admin',
    dmOnly: true
  }
];

/**
 * Show general help
 */
async function showGeneralHelp(message: Message): Promise<void> {
  const isAdmin = isAuthorized(message.author.id);

  const embed = new EmbedBuilder()
    .setTitle('📚 Bot Help')
    .setDescription('Available commands and features')
    .setColor(0x5865F2);

  // General Commands
  const generalCommands = COMMANDS.filter(c => c.category === 'general');
  if (generalCommands.length > 0) {
    embed.addFields({
      name: '📖 General Commands',
      value: generalCommands.map(c => `\`${c.name}\` - ${c.description}`).join('\n'),
      inline: false
    });
  }

  // Key Management
  const keyCommands = COMMANDS.filter(c => c.category === 'key');
  if (keyCommands.length > 0) {
    embed.addFields({
      name: '🔑 Key Management',
      value: keyCommands.map(c => `\`${c.name}\` - ${c.description}${c.dmOnly ? ' (DM only)' : ''}`).join('\n'),
      inline: false
    });
  }

  // Admin Commands (only show if user is admin)
  if (isAdmin) {
    const adminCommands = COMMANDS.filter(c => c.category === 'admin' && !c.name.includes(' '));
    if (adminCommands.length > 0) {
      embed.addFields({
        name: '⚙️ Admin Commands',
        value: adminCommands.map(c => `\`${c.name}\` - ${c.description}`).join('\n'),
        inline: false
      });
    }
  }

  embed.addFields(
    {
      name: '💡 Tips',
      value: '• Use `/help <command>` for detailed help on a specific command\n' +
             '• Commands marked (DM only) must be used in private messages\n' +
             (isAdmin ? '• You have admin access to advanced commands' : ''),
      inline: false
    }
  );

  embed.setFooter({ text: 'Use /help <command> for more details' });
  embed.setTimestamp();

  await message.reply({ embeds: [embed] });
}

/**
 * Show specific command help
 */
async function showCommandHelp(message: Message, commandName: string): Promise<void> {
  const command = COMMANDS.find(c => c.name === commandName || c.name.startsWith(commandName));

  if (!command) {
    await message.reply({
      embeds: [{
        title: '❌ Command Not Found',
        description: `No help available for \`${commandName}\`.\n\nUse \`/help\` to see all commands.`,
        color: 0xED4245
      }]
    });
    return;
  }

  // Check if admin command and user is not admin
  if (command.category === 'admin' && !isAuthorized(message.author.id)) {
    await message.reply({
      embeds: [{
        title: '❌ Unauthorized',
        description: 'This is an admin-only command.',
        color: 0xED4245
      }]
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`📖 Help: ${command.name}`)
    .setDescription(command.description)
    .setColor(0x5865F2)
    .addFields(
      {
        name: '📝 Usage',
        value: `\`${command.usage}\``,
        inline: false
      }
    );

  if (command.examples && command.examples.length > 0) {
    embed.addFields({
      name: '💡 Examples',
      value: command.examples.map(ex => `\`${ex}\``).join('\n'),
      inline: false
    });
  }

  if (command.dmOnly) {
    embed.addFields({
      name: '⚠️ Security',
      value: '**This command must be used in DM** for security reasons.',
      inline: false
    });
  }

  embed.addFields({
    name: '📂 Category',
    value: getCategoryEmoji(command.category) + ' ' + command.category.charAt(0).toUpperCase() + command.category.slice(1),
    inline: true
  });

  embed.setTimestamp();

  await message.reply({ embeds: [embed] });
}

/**
 * Show category help (like 'admin')
 */
async function showCategoryHelp(message: Message, category: string): Promise<void> {
  const categoryMap: { [key: string]: CommandDoc['category'] } = {
    'admin': 'admin',
    'key': 'key',
    'keys': 'key',
    'general': 'general'
  };

  const categoryKey = categoryMap[category.toLowerCase()];

  if (!categoryKey) {
    await showGeneralHelp(message);
    return;
  }

  // Check admin access
  if (categoryKey === 'admin' && !isAuthorized(message.author.id)) {
    await message.reply({
      embeds: [{
        title: '❌ Unauthorized',
        description: 'Admin commands are only available to authorized users.',
        color: 0xED4245
      }]
    });
    return;
  }

  const commands = COMMANDS.filter(c => c.category === categoryKey);

  const embed = new EmbedBuilder()
    .setTitle(`${getCategoryEmoji(categoryKey)} ${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)} Commands`)
    .setDescription(`All commands in the ${categoryKey} category`)
    .setColor(0x5865F2);

  for (const cmd of commands) {
    embed.addFields({
      name: `\`${cmd.name}\``,
      value: `${cmd.description}\n**Usage:** \`${cmd.usage}\`${cmd.dmOnly ? '\n🔒 DM only' : ''}`,
      inline: false
    });
  }

  embed.setFooter({ text: `Use /help <command> for detailed help` });
  embed.setTimestamp();

  await message.reply({ embeds: [embed] });
}

/**
 * Get category emoji
 */
function getCategoryEmoji(category: CommandDoc['category']): string {
  const emojis = {
    general: '📖',
    admin: '⚙️',
    key: '🔑',
    system: '🖥️'
  };
  return emojis[category] || '📄';
}

/**
 * Check if user is authorized
 */
function isAuthorized(userId: string): boolean {
  const authorizedUsers = (process.env.AUTHORIZED_ADMIN_USERS || '').split(',').map(id => id.trim());
  return authorizedUsers.includes(userId);
}

/**
 * Main help command handler
 */
export async function handleHelpCommand(message: Message, args: string[]): Promise<void> {
  if (args.length === 0) {
    // Show general help
    await showGeneralHelp(message);
    return;
  }

  const topic = args[0].toLowerCase();

  // Check if it's a category or specific command
  if (['admin', 'key', 'keys', 'general'].includes(topic)) {
    await showCategoryHelp(message, topic);
  } else {
    await showCommandHelp(message, topic);
  }
}

/**
 * Quick help (for errors)
 */
export function getQuickHelp(command: string): string {
  const cmd = COMMANDS.find(c => c.name === command);
  if (cmd) {
    return `Usage: \`${cmd.usage}\`\nUse \`/help ${command}\` for more details.`;
  }
  return `Use \`/help\` to see all available commands.`;
}
