import { botRegistry } from './registry';
import { botDeployer } from './deployer';
import { generateHelmValues, validateBotName, generateBotId } from './helm-generator';
import { BotConfig } from './types';
import { log } from '../logger';
import { generateSecurityTemplate } from '../security/repo-security-template';
import { writeFile } from '../tools/executor';

const MAX_BOTS_PER_USER = 10;

function isAdmin(userId: string): boolean {
  const adminIds = process.env.DISCORD_ADMIN_USER_IDS?.split(',') || [];
  const cleanUserId = userId.replace('discord_', '');
  return adminIds.includes(cleanUserId);
}

export async function executeBotFactoryTool(
  toolName: string,
  input: any,
  userId: string
): Promise<string> {
  log.info('[BotFactory] Tool execution', { toolName, userId });

  switch (toolName) {
    case 'create_bot':
      if (!isAdmin(userId)) {
        return '🚫 Error: Only admins can create bots';
      }
      return await createBotHandler(input, userId);

    case 'list_bots':
      return await listBotsHandler();

    case 'delete_bot':
      if (!isAdmin(userId)) {
        return '🚫 Error: Only admins can delete bots';
      }
      return await deleteBotHandler(input.name);

    case 'get_bot_status':
      return await getBotStatusHandler(input.name);

    default:
      throw new Error(`Unknown bot factory tool: ${toolName}`);
  }
}

async function createBotHandler(input: any, userId: string): Promise<string> {
  const {
    name,
    personality,
    model = 'sonnet',
    type = 'conversational', // ← NEW: default to conversational
    allowed_tools = [], // ← NEW: tools for agent bots
    enable_discord = true,
    enable_slack = false
  } = input;

  // Validate name
  const validation = validateBotName(name);
  if (!validation.valid) {
    return `❌ Error: ${validation.reason}`;
  }

  // Validate bot type
  if (type !== 'conversational' && type !== 'agent') {
    return `❌ Error: Invalid bot type "${type}". Must be "conversational" or "agent"`;
  }

  // Validate tools (only for agent bots)
  if (type === 'agent' && allowed_tools.length === 0) {
    return `❌ Error: Agent bots must have at least one allowed tool. Available: bash, read, write, edit, kubectl, gcloud, git`;
  }

  const validTools = ['bash', 'read', 'write', 'edit', 'kubectl', 'gcloud', 'git'];
  const invalidTools = allowed_tools.filter((t: string) => !validTools.includes(t));
  if (invalidTools.length > 0) {
    return `❌ Error: Invalid tools: ${invalidTools.join(', ')}. Available: ${validTools.join(', ')}`;
  }

  // Check if bot exists
  if (await botRegistry.exists(name)) {
    return `❌ Error: Bot "${name}" already exists`;
  }

  // Check bot limit
  const creatorDiscordId = userId.replace('discord_', '');
  const botCount = await botRegistry.countBotsByCreator(creatorDiscordId);
  if (botCount >= MAX_BOTS_PER_USER) {
    return `❌ Error: Maximum ${MAX_BOTS_PER_USER} bots per user reached`;
  }

  // Generate bot ID
  const botId = generateBotId(name);
  log.info('[BotFactory] Creating bot', { name, botId, model, type, allowed_tools });

  // Generate Helm values
  const config: BotConfig = {
    name: botId,
    personality,
    model,
    type, // ← NEW
    allowedTools: type === 'agent' ? allowed_tools : undefined, // ← NEW
    replicas: 1,
    enableDiscord: enable_discord,
    enableSlack: enable_slack
  };

  const helmValues = generateHelmValues(config);

  // Register bot in database
  await botRegistry.createBot(botId, name, personality, creatorDiscordId, config);

  // Deploy to Kubernetes
  try {
    const result = await botDeployer.deploy(botId, helmValues);

    if (result.success) {
      await botRegistry.updateStatus(botId, 'running');
      await botRegistry.updateHealthCheck(botId);

      // Auto-apply security best practices
      try {
        await applySecurityTemplate(botId, 'typescript');
        log.info('[BotFactory] Security template applied', { botId });
      } catch (secError: any) {
        log.warn('[BotFactory] Security template failed (non-critical)', { error: secError.message });
      }

      const typeEmoji = type === 'agent' ? '🤖' : '💬';
      const toolsInfo = type === 'agent' && allowed_tools.length > 0
        ? `\n**Tools:** ${allowed_tools.join(', ')}`
        : '';

      return `✅ ${typeEmoji} Bot "${name}" created successfully!

**Type:** ${type === 'agent' ? 'Agent (with tools)' : 'Conversational'}
**Status:** ${result.status}
**Pod:** ${result.podName}
**Model:** ${model}${toolsInfo}
**Channels:** ${enable_discord ? 'Discord' : ''} ${enable_slack ? 'Slack' : ''}
**Security:** Template applied automatically

The bot should be online in ~30 seconds. Try mentioning @${name} to interact with it.${type === 'agent' ? '\n\n⚠️ **Agent Mode**: This bot can execute commands and modify files. Use responsibly!' : ''}`;
    } else {
      await botRegistry.updateStatus(botId, 'failed');

      return `❌ Deployment failed: ${result.error}

The bot was registered but failed to deploy to Kubernetes. Check the logs for details.`;
    }
  } catch (error: any) {
    await botRegistry.updateStatus(botId, 'failed');
    log.error('[BotFactory] Create bot failed', { error: error.message });

    return `❌ Deployment failed: ${error.message}`;
  }
}

async function listBotsHandler(): Promise<string> {
  const bots = await botRegistry.listBots();

  if (bots.length === 0) {
    return '📋 No bots deployed yet.\n\nUse `create_bot` to deploy your first bot!';
  }

  const lines = ['📋 **Deployed Bots:**\n'];

  for (const bot of bots) {
    const config = JSON.parse(bot.deploymentConfig) as BotConfig;
    const statusEmoji = bot.status === 'running' ? '✅' :
                       bot.status === 'deploying' ? '🔄' :
                       bot.status === 'failed' ? '❌' : '⏸️';
    const typeEmoji = config.type === 'agent' ? '🤖' : '💬';

    lines.push(`${statusEmoji} ${typeEmoji} **${bot.name}**`);
    lines.push(`   - Type: ${config.type || 'conversational'}`);
    lines.push(`   - Status: ${bot.status}`);
    lines.push(`   - Model: ${config.model}`);
    if (config.type === 'agent' && config.allowedTools && config.allowedTools.length > 0) {
      lines.push(`   - Tools: ${config.allowedTools.join(', ')}`);
    }
    lines.push(`   - Created: ${new Date(bot.createdAt).toLocaleDateString()}`);
    lines.push(`   - Creator: <@${bot.creatorDiscordId}>`);
    lines.push('');
  }

  return lines.join('\n');
}

async function deleteBotHandler(name: string): Promise<string> {
  const bot = await botRegistry.getBotByName(name);

  if (!bot) {
    return `❌ Error: Bot "${name}" not found`;
  }

  log.info('[BotFactory] Deleting bot', { name, botId: bot.id });

  try {
    // Delete from Kubernetes
    await botDeployer.delete(bot.id);

    // Delete from registry
    await botRegistry.deleteBot(bot.id);

    return `✅ Bot "${name}" has been deleted

The Helm release and all Kubernetes resources have been removed.`;
  } catch (error: any) {
    log.error('[BotFactory] Delete bot failed', { error: error.message });
    return `❌ Failed to delete bot: ${error.message}`;
  }
}

async function getBotStatusHandler(name: string): Promise<string> {
  const bot = await botRegistry.getBotByName(name);

  if (!bot) {
    return `❌ Error: Bot "${name}" not found`;
  }

  try {
    const status = await botDeployer.getStatus(bot.id);
    const config = JSON.parse(bot.deploymentConfig) as BotConfig;

    const statusEmoji = status.ready ? '✅' : '⚠️';
    const typeEmoji = config.type === 'agent' ? '🤖' : '💬';
    const healthCheck = bot.lastHealthCheck
      ? new Date(bot.lastHealthCheck).toLocaleString()
      : 'Never';
    const toolsInfo = config.type === 'agent' && config.allowedTools && config.allowedTools.length > 0
      ? `\n**Allowed Tools:** ${config.allowedTools.join(', ')}`
      : '';

    return `${statusEmoji} ${typeEmoji} **Bot Status: ${bot.name}**

**Type:** ${config.type || 'conversational'}
**Database Status:** ${bot.status}
**Kubernetes Status:** ${status.status}
**Ready:** ${status.ready ? 'Yes' : 'No'}
**Pod Name:** ${status.podName || 'N/A'}
**Model:** ${config.model}${toolsInfo}
**Personality:** ${bot.personality.substring(0, 100)}...
**Created:** ${new Date(bot.createdAt).toLocaleString()}
**Last Health Check:** ${healthCheck}`;
  } catch (error: any) {
    log.error('[BotFactory] Get bot status failed', { error: error.message });
    return `❌ Failed to get bot status: ${error.message}`;
  }
}

/**
 * Apply security template to a bot's workspace
 */
async function applySecurityTemplate(
  botId: string,
  language: 'python' | 'typescript' = 'typescript'
): Promise<void> {
  const gcpProject = process.env.GCP_PROJECT_ID || 'your-gcp-project';
  const files = generateSecurityTemplate({
    language,
    projectName: botId,
    gcpProject,
    includeGcpSecretManager: true,
    includePreCommitHook: true,
    includeSecurityConfig: true,
  });

  // Write security files to the bot's data directory
  const botDataDir = `/data/bots/${botId}`;
  for (const file of files) {
    try {
      await writeFile(`${botDataDir}/${file.path}`, file.content);
    } catch {
      // Directory may not exist yet - that's ok, files will be created when pod mounts /data
    }
  }

  log.info('[BotFactory] Security template written', {
    botId,
    files: files.map(f => f.path),
  });
}
