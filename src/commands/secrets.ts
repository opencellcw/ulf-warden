/**
 * Secret Manager Command (/secret)
 *
 * Interactive DM-only command for managing environment secrets.
 * Owner-only. Uses awaitMessages for conversational flow.
 */

import { Message, EmbedBuilder, DMChannel } from 'discord.js';
import { secretManager } from '../secrets/secret-manager';
import { trustManager } from '../identity/trust-manager';
import { activityTracker } from '../activity/activity-tracker';
import { log } from '../logger';

// Keys that require a full restart to take effect
const RESTART_KEYS = new Set([
  'DISCORD_BOT_TOKEN',
  'SLACK_BOT_TOKEN',
  'SLACK_APP_TOKEN',
  'ANTHROPIC_API_KEY',
  'TELEGRAM_BOT_TOKEN',
]);

// Keys that trigger runtime reinit
const REINIT_KEYS = new Set([
  'DISCORD_ACTIVITY_CHANNEL',
]);

/**
 * Detect if message is a secret command (/secret, /secrets, /secret list, etc.)
 */
export function isSecretCommand(text: string): boolean {
  return /^\/secrets?(\s|$)/i.test(text.trim());
}

/**
 * Mask a value for display (show first 4 chars + ***)
 */
function maskValue(value: string): string {
  if (value.length <= 4) return '****';
  return value.substring(0, 4) + '***';
}

/**
 * Await a single message reply from the same user in the DM channel
 */
async function awaitReply(channel: DMChannel, authorId: string, timeoutMs = 60000): Promise<string | null> {
  try {
    const filter = (m: Message) => m.author.id === authorId;
    const collected = await channel.awaitMessages({
      filter,
      max: 1,
      time: timeoutMs,
      errors: ['time'],
    });
    return collected.first()?.content?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Try to delete a message (best effort, for security)
 */
async function tryDelete(message: Message): Promise<void> {
  try {
    if (message.deletable) {
      await message.delete();
    }
  } catch {
    // DM deletion may fail - that's ok
  }
}

/**
 * Handle /secret command
 */
export async function handleSecretCommand(message: Message): Promise<void> {
  const discordId = message.author.id;

  // 1. Owner-only check
  const trustLevel = await trustManager.getTrustLevel(discordId);
  if (trustLevel !== 'owner') {
    await message.reply({
      embeds: [new EmbedBuilder()
        .setTitle('Acesso negado')
        .setDescription('Apenas o owner pode gerenciar secrets.')
        .setColor(0xED4245)],
    });
    return;
  }

  // 2. DM-only check
  if (!message.channel.isDMBased()) {
    await message.reply({
      embeds: [new EmbedBuilder()
        .setTitle('Apenas via DM')
        .setDescription('Por seguranca, secrets so podem ser gerenciadas via DM.\nMe manda uma DM com `/secret`.')
        .setColor(0xFF9900)],
    });
    return;
  }

  const channel = message.channel as DMChannel;

  // 3. Parse inline subcommand (e.g. "/secret list" → "list")
  const parts = message.content.trim().split(/\s+/);
  const inlineAction = parts[1]?.toLowerCase();

  // If subcommand provided inline, skip menu
  let action: string;
  if (inlineAction && ['set', 'list', 'delete'].includes(inlineAction)) {
    action = inlineAction;
  } else {
    // Show interactive menu
    await message.reply({
      embeds: [new EmbedBuilder()
        .setTitle('Secret Manager')
        .setDescription(
          'O que deseja fazer?\n\n' +
          '`set` - Setar uma secret\n' +
          '`list` - Listar secrets\n' +
          '`delete` - Remover uma secret\n\n' +
          '_Responda com a opcao desejada (timeout: 60s)_'
        )
        .setColor(0x5865F2)],
    });

    const reply = await awaitReply(channel, discordId);
    if (!reply) {
      await channel.send('Timeout. Comando cancelado.');
      return;
    }
    action = reply.toLowerCase();
  }

  switch (action) {
    case 'set':
      await handleSet(channel, discordId);
      break;
    case 'list':
      await handleList(channel);
      break;
    case 'delete':
      await handleDelete(channel, discordId);
      break;
    default:
      await channel.send(`Opcao invalida: \`${action}\`. Use \`set\`, \`list\` ou \`delete\`.`);
  }
}

/**
 * Set flow: ask key → ask value → save → confirm
 */
async function handleSet(channel: DMChannel, authorId: string): Promise<void> {
  // Ask for key
  await channel.send({
    embeds: [new EmbedBuilder()
      .setDescription('Qual a **key**? (ex: `DISCORD_ACTIVITY_CHANNEL`, `GEMINI_KEY`)')
      .setColor(0x5865F2)],
  });

  const key = await awaitReply(channel, authorId);
  if (!key) {
    await channel.send('Timeout. Comando cancelado.');
    return;
  }

  // Validate key format
  if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
    await channel.send('Key invalida. Use formato UPPER_SNAKE_CASE (ex: `MY_API_KEY`).');
    return;
  }

  // Ask for value
  await channel.send({
    embeds: [new EmbedBuilder()
      .setDescription(`Manda o valor da \`${key}\`:`)
      .setColor(0x5865F2)
      .setFooter({ text: 'A mensagem com o valor sera deletada por seguranca' })],
  });

  const valueMsg = await awaitValueMessage(channel, authorId);
  if (!valueMsg) {
    await channel.send('Timeout. Comando cancelado.');
    return;
  }

  const value = valueMsg.content.trim();

  // Try to delete the message containing the secret value
  await tryDelete(valueMsg);

  // Save
  secretManager.setSecret(key, value);

  // Build confirmation embed
  const embed = new EmbedBuilder()
    .setTitle('Secret salva')
    .setDescription(`\`${key}\` = \`${maskValue(value)}\``)
    .setColor(0x57F287)
    .setTimestamp();

  // Check if reinit needed
  if (REINIT_KEYS.has(key)) {
    embed.addFields({
      name: 'Reinit',
      value: `\`${key}\` foi atualizada. Reinicializando modulo...`,
    });
    await channel.send({ embeds: [embed] });
    await handleReinit(key, channel);
    return;
  }

  // Check if restart needed
  if (RESTART_KEYS.has(key)) {
    embed.addFields({
      name: 'Restart necessario',
      value: `\`${key}\` so tera efeito apos restart do bot.\nUse \`/admin restart\` quando quiser aplicar.`,
    });
  }

  await channel.send({ embeds: [embed] });
}

/**
 * Await value message (returns the Message object so we can delete it)
 */
async function awaitValueMessage(channel: DMChannel, authorId: string, timeoutMs = 60000): Promise<Message | null> {
  try {
    const filter = (m: Message) => m.author.id === authorId;
    const collected = await channel.awaitMessages({
      filter,
      max: 1,
      time: timeoutMs,
      errors: ['time'],
    });
    return collected.first() || null;
  } catch {
    return null;
  }
}

/**
 * List flow: show all keys with masked values
 */
async function handleList(channel: DMChannel): Promise<void> {
  const keys = secretManager.listSecrets();

  if (keys.length === 0) {
    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle('Secrets')
        .setDescription('Nenhuma secret salva.')
        .setColor(0x5865F2)],
    });
    return;
  }

  const lines = keys.map(key => {
    const value = secretManager.getSecret(key);
    return `\`${key}\` = \`${value ? maskValue(value) : '???'}\``;
  });

  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle(`Secrets (${keys.length})`)
      .setDescription(lines.join('\n'))
      .setColor(0x5865F2)
      .setTimestamp()],
  });
}

/**
 * Delete flow: ask which key → confirm → remove
 */
async function handleDelete(channel: DMChannel, authorId: string): Promise<void> {
  const keys = secretManager.listSecrets();

  if (keys.length === 0) {
    await channel.send('Nenhuma secret para deletar.');
    return;
  }

  await channel.send({
    embeds: [new EmbedBuilder()
      .setDescription(
        'Qual key deseja remover?\n\n' +
        keys.map(k => `\`${k}\``).join('\n')
      )
      .setColor(0xFF9900)],
  });

  const key = await awaitReply(channel, authorId);
  if (!key) {
    await channel.send('Timeout. Comando cancelado.');
    return;
  }

  const deleted = secretManager.deleteSecret(key);

  if (deleted) {
    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle('Secret removida')
        .setDescription(`\`${key}\` foi removida do banco e de process.env.`)
        .setColor(0x57F287)
        .setTimestamp()],
    });
  } else {
    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle('Nao encontrada')
        .setDescription(`Secret \`${key}\` nao existe.`)
        .setColor(0xED4245)],
    });
  }
}

/**
 * Handle runtime reinit for special keys
 */
async function handleReinit(key: string, channel: DMChannel): Promise<void> {
  if (key === 'DISCORD_ACTIVITY_CHANNEL') {
    try {
      // activityTracker reads from process.env on init, which was already set
      // We need the Discord client to reinit - get it from the tracker if possible
      const client = (activityTracker as any).client;
      if (client) {
        await activityTracker.init(client);
        await channel.send({
          embeds: [new EmbedBuilder()
            .setDescription('ActivityTracker reinicializado com novo canal.')
            .setColor(0x57F287)],
        });
      } else {
        await channel.send({
          embeds: [new EmbedBuilder()
            .setDescription('ActivityTracker sera ativado no proximo restart (client nao disponivel).')
            .setColor(0xFF9900)],
        });
      }
    } catch (error: any) {
      log.error('[Secrets] Failed to reinit activityTracker', { error: error.message });
      await channel.send(`Erro ao reinicializar: ${error.message}`);
    }
  }
}
