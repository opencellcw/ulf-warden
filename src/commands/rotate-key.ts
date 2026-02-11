/**
 * API Key Rotation Command
 *
 * Permite rotacionar a chave Anthropic de forma segura via Discord.
 * - Aceita nova chave via DM
 * - Atualiza secret no K8s
 * - Reinicia deployment
 * - Agenda lembrete de rotação em 24h
 */

import { Message } from 'discord.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { log } from '../logger';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface KeyRotationState {
  currentKeySet: string; // timestamp
  expiresAt: string; // timestamp
  rotationCount: number;
  lastRotatedBy: string;
}

const STATE_FILE = path.join(process.env.DATA_DIR || './data', 'key-rotation.json');
const KEY_LIFETIME_HOURS = 24;

/**
 * Load rotation state
 */
async function loadState(): Promise<KeyRotationState> {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      currentKeySet: new Date().toISOString(),
      expiresAt: new Date(Date.now() + KEY_LIFETIME_HOURS * 60 * 60 * 1000).toISOString(),
      rotationCount: 0,
      lastRotatedBy: 'system'
    };
  }
}

/**
 * Save rotation state
 */
async function saveState(state: KeyRotationState): Promise<void> {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Validate API key format
 */
function validateKey(key: string): boolean {
  // Anthropic keys: sk-ant-api03-...
  return /^sk-ant-api03-[A-Za-z0-9_-]{95}$/.test(key);
}

/**
 * Update K8s secret with new key
 */
async function updateK8sSecret(newKey: string): Promise<void> {
  const namespace = 'agents';
  const secretName = 'ulf-warden-agent-secrets';

  // Base64 encode the new key
  const encodedKey = Buffer.from(newKey).toString('base64');

  // Patch the secret
  const patchCmd = `kubectl patch secret ${secretName} -n ${namespace} --type=json -p='[{"op": "replace", "path": "/data/anthropic-api-key", "value": "${encodedKey}"}]'`;

  await execAsync(patchCmd);

  log.info('[KeyRotation] K8s secret updated', { namespace, secretName });
}

/**
 * Restart deployment to use new key
 */
async function restartDeployment(): Promise<void> {
  const namespace = 'agents';
  const deploymentName = 'ulf-warden-agent';

  await execAsync(`kubectl rollout restart deployment ${deploymentName} -n ${namespace}`);

  log.info('[KeyRotation] Deployment restarted', { namespace, deploymentName });
}

/**
 * Schedule rotation reminder
 */
function scheduleReminder(client: any, userId: string, hoursUntilExpiry: number): void {
  const reminderTime = hoursUntilExpiry * 60 * 60 * 1000;

  setTimeout(async () => {
    try {
      const user = await client.users.fetch(userId);
      await user.send({
        embeds: [{
          title: '🔑 Lembrete: Rotação de Chave API',
          description: 'Sua chave Anthropic API está prestes a expirar!',
          color: 0xFF9900, // Orange
          fields: [
            {
              name: '⏰ Tempo Restante',
              value: 'Menos de 1 hora',
              inline: true
            },
            {
              name: '🔄 Ação Necessária',
              value: 'Gere uma nova chave e use `/rotate-key`',
              inline: true
            }
          ],
          footer: {
            text: 'Sistema de Rotação Automática de Chaves'
          },
          timestamp: new Date().toISOString()
        }]
      });

      log.info('[KeyRotation] Reminder sent', { userId });
    } catch (error: any) {
      log.error('[KeyRotation] Failed to send reminder', { error: error.message });
    }
  }, reminderTime);

  log.info('[KeyRotation] Reminder scheduled', {
    userId,
    hoursUntilExpiry,
    scheduledFor: new Date(Date.now() + reminderTime).toISOString()
  });
}

/**
 * Rotate API key command
 */
export async function rotateKey(message: Message, args: string[]): Promise<void> {
  // Only allow in DMs for security
  if (!message.channel.isDMBased()) {
    await message.reply('⚠️ Por segurança, use este comando apenas em **DM privada**!');
    return;
  }

  // Check if user is authorized (you can add a whitelist here)
  const authorizedUsers = (process.env.AUTHORIZED_ADMIN_USERS || '').split(',');
  if (!authorizedUsers.includes(message.author.id)) {
    await message.reply('❌ Você não tem permissão para rotacionar chaves API.');
    log.warn('[KeyRotation] Unauthorized attempt', { userId: message.author.id });
    return;
  }

  // Check if key was provided
  if (args.length === 0) {
    await message.reply({
      embeds: [{
        title: '🔑 Rotação de Chave API',
        description: 'Use este comando para rotacionar a chave Anthropic com segurança.',
        color: 0x5865F2, // Discord blue
        fields: [
          {
            name: '📝 Uso',
            value: '`/rotate-key sk-ant-api03-...`'
          },
          {
            name: '⚠️ Importante',
            value: '• Gere uma nova chave no dashboard Anthropic\n• Use apenas em DM\n• A chave anterior será substituída\n• O bot reiniciará automaticamente'
          },
          {
            name: '⏱️ Validade',
            value: `Chaves expiram em **${KEY_LIFETIME_HOURS} horas**`
          }
        ]
      }]
    });
    return;
  }

  const newKey = args[0].trim();

  // Validate key format
  if (!validateKey(newKey)) {
    await message.reply({
      embeds: [{
        title: '❌ Formato de Chave Inválido',
        description: 'A chave Anthropic deve ter o formato:\n`sk-ant-api03-[95 caracteres]`',
        color: 0xED4245 // Red
      }]
    });
    return;
  }

  // Send processing message
  const processingMsg = await message.reply({
    embeds: [{
      title: '⏳ Rotacionando Chave...',
      description: 'Atualizando secret no Kubernetes e reiniciando deployment...',
      color: 0xFEE75C // Yellow
    }]
  });

  try {
    // Load current state
    const state = await loadState();

    // Update K8s secret
    await updateK8sSecret(newKey);

    // Update local .env (optional, for local dev)
    const envPath = path.join(process.cwd(), '.env');
    try {
      let envContent = await fs.readFile(envPath, 'utf-8');
      envContent = envContent.replace(
        /ANTHROPIC_API_KEY=.*/,
        `ANTHROPIC_API_KEY=${newKey}`
      );
      await fs.writeFile(envPath, envContent);
      log.info('[KeyRotation] Local .env updated');
    } catch (error: any) {
      log.warn('[KeyRotation] Could not update local .env', { error: error.message });
    }

    // Restart deployment
    await restartDeployment();

    // Update state
    const now = new Date();
    const expiresAt = new Date(now.getTime() + KEY_LIFETIME_HOURS * 60 * 60 * 1000);

    const newState: KeyRotationState = {
      currentKeySet: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      rotationCount: state.rotationCount + 1,
      lastRotatedBy: message.author.id
    };

    await saveState(newState);

    // Schedule reminder (23h before expiry)
    scheduleReminder(message.client, message.author.id, KEY_LIFETIME_HOURS - 1);

    // Delete the message with the key for security
    try {
      await message.delete();
    } catch {
      // Ignore if can't delete
    }

    // Send success message
    await processingMsg.edit({
      embeds: [{
        title: '✅ Chave Rotacionada com Sucesso!',
        description: 'A nova chave foi configurada e o bot está reiniciando.',
        color: 0x57F287, // Green
        fields: [
          {
            name: '🔄 Rotação #',
            value: `${newState.rotationCount}`,
            inline: true
          },
          {
            name: '⏰ Expira em',
            value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
            inline: true
          },
          {
            name: '🔔 Lembrete',
            value: `Você receberá um aviso 1h antes da expiração`,
            inline: false
          },
          {
            name: '🗑️ Importante',
            value: '**Agora delete a chave antiga no dashboard Anthropic!**',
            inline: false
          }
        ],
        footer: {
          text: 'Mensagem com a chave foi deletada por segurança'
        },
        timestamp: now.toISOString()
      }]
    });

    log.info('[KeyRotation] Key rotated successfully', {
      rotationCount: newState.rotationCount,
      userId: message.author.id,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error: any) {
    log.error('[KeyRotation] Failed to rotate key', { error: error.message });

    await processingMsg.edit({
      embeds: [{
        title: '❌ Erro ao Rotacionar Chave',
        description: `Falha ao atualizar a chave: ${error.message}`,
        color: 0xED4245, // Red
        fields: [
          {
            name: '🔍 O que fazer',
            value: '1. Verifique se você tem acesso ao cluster K8s\n2. Verifique os logs do sistema\n3. Tente novamente ou contate o suporte'
          }
        ]
      }]
    });
  }
}

/**
 * Check key expiration status
 */
export async function checkKeyStatus(message: Message): Promise<void> {
  try {
    const state = await loadState();
    const now = new Date();
    const expiresAt = new Date(state.expiresAt);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const hoursUntilExpiry = Math.floor(timeUntilExpiry / (60 * 60 * 1000));

    let color = 0x57F287; // Green
    let status = '✅ Válida';

    if (hoursUntilExpiry < 1) {
      color = 0xED4245; // Red
      status = '🔴 EXPIRADA';
    } else if (hoursUntilExpiry < 3) {
      color = 0xFF9900; // Orange
      status = '⚠️ Expirando em breve';
    }

    await message.reply({
      embeds: [{
        title: '🔑 Status da Chave API',
        description: `Status: **${status}**`,
        color: color,
        fields: [
          {
            name: '📅 Configurada em',
            value: `<t:${Math.floor(new Date(state.currentKeySet).getTime() / 1000)}:F>`,
            inline: true
          },
          {
            name: '⏰ Expira em',
            value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
            inline: true
          },
          {
            name: '🔄 Total de Rotações',
            value: `${state.rotationCount}`,
            inline: true
          },
          {
            name: '👤 Última rotação por',
            value: `<@${state.lastRotatedBy}>`,
            inline: true
          },
          {
            name: '⏱️ Tempo Restante',
            value: `${hoursUntilExpiry}h ${Math.floor((timeUntilExpiry % (60 * 60 * 1000)) / (60 * 1000))}min`,
            inline: true
          },
          {
            name: '🔄 Próxima Ação',
            value: hoursUntilExpiry < 3
              ? '**Rotacione a chave agora!** Use `/rotate-key`'
              : 'Você receberá um lembrete antes da expiração',
            inline: false
          }
        ],
        timestamp: now.toISOString()
      }]
    });

  } catch (error: any) {
    await message.reply('❌ Erro ao verificar status da chave.');
    log.error('[KeyRotation] Failed to check status', { error: error.message });
  }
}
