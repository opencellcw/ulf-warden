/**
 * Trust Level Commands
 *
 * Commands for managing and viewing user trust levels.
 * Only owners can modify trust levels; anyone can view their own.
 */

import { Message, EmbedBuilder } from 'discord.js';
import { trustManager } from '../identity/trust-manager';
import { contactManager, TrustLevel } from '../identity/contacts';
import { log } from '../logger';

/**
 * Check if message is a trust command
 */
export function isTrustCommand(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return lower.startsWith('/trust') || lower.startsWith('!trust');
}

/**
 * Handle trust commands
 */
export async function handleTrustCommand(message: Message): Promise<void> {
  const text = message.content.toLowerCase().trim();
  const args = text.split(/\s+/).slice(1);
  const command = args[0];

  const requesterId = message.author.id;
  const isOwner = contactManager.isOwner(requesterId);

  try {
    switch (command) {
      case 'status':
      case 'me':
      case undefined:
        await showTrustStatus(message, requesterId);
        break;

      case 'check':
        if (args[1]) {
          // Check another user (anyone can do this)
          const targetId = args[1].replace(/[<@!>]/g, '');
          await showTrustStatus(message, targetId);
        } else {
          await showTrustStatus(message, requesterId);
        }
        break;

      case 'stats':
        await showTrustStats(message);
        break;

      case 'set':
        if (!isOwner) {
          await message.reply('🚫 Apenas owners podem modificar trust levels.');
          return;
        }
        if (args.length < 3) {
          await message.reply('Uso: `/trust set <user_id> <known|trusted>`');
          return;
        }
        const targetUserId = args[1].replace(/[<@!>]/g, '');
        const newLevel = args[2] as TrustLevel;
        await setTrustLevel(message, targetUserId, newLevel);
        break;

      case 'help':
        await showTrustHelp(message);
        break;

      default:
        await showTrustHelp(message);
    }
  } catch (error: any) {
    log.error('[TrustCommand] Error', { error: error.message });
    await message.reply(`❌ Erro: ${error.message}`);
  }
}

/**
 * Show trust status for a user
 */
async function showTrustStatus(message: Message, userId: string): Promise<void> {
  const trustData = await trustManager.getUserTrustData(userId);
  const staticLevel = contactManager.getTrustLevel(userId);
  const effectiveLevel = await trustManager.getTrustLevel(userId);

  const embed = new EmbedBuilder()
    .setTitle('🛡️ Trust Level Status')
    .setColor(getTrustColor(effectiveLevel))
    .addFields(
      { name: 'User ID', value: userId, inline: true },
      { name: 'Trust Level', value: getLevelEmoji(effectiveLevel) + ' ' + effectiveLevel, inline: true },
      { name: 'Source', value: staticLevel !== 'unknown' ? '📄 contacts.md' : '🗃️ Database', inline: true }
    );

  if (trustData) {
    embed.addFields(
      { name: 'Interactions', value: trustData.interactionCount.toString(), inline: true },
      { name: 'First Seen', value: formatDate(trustData.firstSeen), inline: true },
      { name: 'Last Seen', value: formatDate(trustData.lastSeen), inline: true }
    );

    if (trustData.username) {
      embed.addFields({ name: 'Username', value: trustData.username, inline: true });
    }

    if (trustData.promotedAt) {
      embed.addFields({ name: 'Promoted At', value: formatDate(trustData.promotedAt), inline: true });
    }
  }

  // Show what this level can do
  embed.addFields({
    name: '📋 Permissions',
    value: getPermissionsText(effectiveLevel),
    inline: false
  });

  // Show progression info for non-owners
  if (effectiveLevel !== 'owner' && trustData) {
    const progressText = getProgressionText(effectiveLevel, trustData);
    if (progressText) {
      embed.addFields({ name: '📈 Progression', value: progressText, inline: false });
    }
  }

  await message.reply({ embeds: [embed] });
}

/**
 * Show trust statistics
 */
async function showTrustStats(message: Message): Promise<void> {
  const stats = await trustManager.getStats();

  const embed = new EmbedBuilder()
    .setTitle('📊 Trust Statistics')
    .setColor(0x5865F2)
    .addFields(
      { name: 'Total Users', value: stats.totalUsers.toString(), inline: true },
      { name: 'Recent Promotions (7d)', value: stats.recentPromotions.toString(), inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: '👑 Owners', value: stats.byLevel.owner.toString(), inline: true },
      { name: '🤝 Trusted', value: stats.byLevel.trusted.toString(), inline: true },
      { name: '👋 Known', value: stats.byLevel.known.toString(), inline: true },
      { name: '❓ Unknown', value: stats.byLevel.unknown.toString(), inline: true }
    )
    .setFooter({ text: 'Trust levels progress automatically based on interactions' });

  await message.reply({ embeds: [embed] });
}

/**
 * Set trust level (owner only)
 */
async function setTrustLevel(message: Message, userId: string, level: TrustLevel): Promise<void> {
  if (level === 'owner') {
    await message.reply('🚫 Owner status pode apenas ser definido em `contacts.md` por segurança.');
    return;
  }

  if (!['known', 'trusted', 'unknown'].includes(level)) {
    await message.reply('❌ Level inválido. Use: `known`, `trusted`, ou `unknown`');
    return;
  }

  await trustManager.setTrustLevel(userId, level, `Set by ${message.author.username}`);

  const embed = new EmbedBuilder()
    .setTitle('✅ Trust Level Updated')
    .setColor(0x00FF00)
    .addFields(
      { name: 'User ID', value: userId, inline: true },
      { name: 'New Level', value: getLevelEmoji(level) + ' ' + level, inline: true },
      { name: 'Set By', value: message.author.username, inline: true }
    );

  await message.reply({ embeds: [embed] });

  log.info('[TrustCommand] Trust level manually set', {
    targetUserId: userId,
    newLevel: level,
    setBy: message.author.id
  });
}

/**
 * Show help for trust commands
 */
async function showTrustHelp(message: Message): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('🛡️ Trust Commands')
    .setColor(0x5865F2)
    .setDescription('Sistema de confiança dinâmico que evolui com interações.')
    .addFields(
      { name: '/trust', value: 'Ver seu trust level atual', inline: false },
      { name: '/trust check @user', value: 'Ver trust level de outro usuário', inline: false },
      { name: '/trust stats', value: 'Ver estatísticas gerais', inline: false },
      { name: '/trust set <id> <level>', value: '(Owner only) Definir trust level', inline: false }
    )
    .addFields({
      name: '📈 Como ganhar confiança',
      value:
        '• `unknown → known`: Apresente-se (ex: "Meu nome é João")\n' +
        '• `known → trusted`: 20+ interações positivas (mínimo 1 dia)\n' +
        '• `trusted → owner`: Nunca automático (só via contacts.md)',
      inline: false
    });

  await message.reply({ embeds: [embed] });
}

// Helper functions

function getTrustColor(level: TrustLevel): number {
  const colors: Record<TrustLevel, number> = {
    owner: 0xFFD700,   // Gold
    trusted: 0x00FF00, // Green
    known: 0x3498DB,   // Blue
    unknown: 0x95A5A6  // Gray
  };
  return colors[level];
}

function getLevelEmoji(level: TrustLevel): string {
  const emojis: Record<TrustLevel, string> = {
    owner: '👑',
    trusted: '🤝',
    known: '👋',
    unknown: '❓'
  };
  return emojis[level];
}

function getPermissionsText(level: TrustLevel): string {
  const perms: Record<TrustLevel, string> = {
    owner: '✅ Acesso total - sem restrições',
    trusted: '✅ Leitura de arquivos, conversas amigáveis\n⚠️ Escrita limitada, sem comandos shell',
    known: '✅ Conversas básicas, leitura limitada\n❌ Sem escrita ou comandos',
    unknown: '❌ Muito limitado - precisa se identificar'
  };
  return perms[level];
}

function getProgressionText(level: TrustLevel, data: any): string | null {
  if (level === 'unknown') {
    return '💡 Dica: Apresente-se para subir para "known" (ex: "Meu nome é João")';
  }

  if (level === 'known') {
    const remaining = 20 - (data.positiveScore || 0);
    if (remaining > 0) {
      return `📊 Progresso para "trusted": ${data.positiveScore || 0}/20 interações positivas (faltam ${remaining})`;
    }
    return '⏳ Aguardando tempo mínimo para promoção a "trusted"';
  }

  return null;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
