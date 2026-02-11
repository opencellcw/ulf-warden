#!/usr/bin/env ts-node
/**
 * Key Expiration Checker
 *
 * Verifica se a chave API está próxima de expirar e envia alertas.
 * Pode ser executado como cron job.
 *
 * Uso:
 *   node dist/scripts/check-key-expiration.js
 *
 * Cron (a cada hora):
 *   0 * * * * cd /path/to/project && node dist/scripts/check-key-expiration.js
 */

import fs from 'fs/promises';
import path from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { log } from '../logger';

interface KeyRotationState {
  currentKeySet: string;
  expiresAt: string;
  rotationCount: number;
  lastRotatedBy: string;
}

const STATE_FILE = path.join(process.env.DATA_DIR || './data', 'key-rotation.json');
const ALERT_HOURS_BEFORE = [24, 12, 6, 3, 1]; // Alertar nestes intervalos

async function loadState(): Promise<KeyRotationState | null> {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function sendDiscordAlert(userId: string, hoursRemaining: number): Promise<void> {
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.log('[KeyExpiration] Discord token not configured, skipping alert');
    return;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages]
  });

  try {
    await client.login(process.env.DISCORD_BOT_TOKEN);

    const user = await client.users.fetch(userId);

    let color = 0x57F287; // Green
    let emoji = '✅';
    let urgency = 'Informação';

    if (hoursRemaining <= 1) {
      color = 0xED4245; // Red
      emoji = '🔴';
      urgency = 'URGENTE';
    } else if (hoursRemaining <= 3) {
      color = 0xFF9900; // Orange
      emoji = '⚠️';
      urgency = 'Alta Prioridade';
    } else if (hoursRemaining <= 6) {
      color = 0xFEE75C; // Yellow
      emoji = '⚡';
      urgency = 'Atenção';
    }

    await user.send({
      embeds: [{
        title: `${emoji} Alerta: Chave API Expirando`,
        description: `Sua chave Anthropic API expira em **${hoursRemaining} hora(s)**!`,
        color: color,
        fields: [
          {
            name: '⚠️ Urgência',
            value: urgency,
            inline: true
          },
          {
            name: '⏰ Tempo Restante',
            value: `${hoursRemaining}h`,
            inline: true
          },
          {
            name: '🔄 Ação Necessária',
            value: '1. Gerar nova chave no dashboard Anthropic\n2. Usar `/rotate-key` em DM\n3. Deletar chave antiga',
            inline: false
          },
          {
            name: '📚 Guia Completo',
            value: 'Ver `docs/API-KEY-ROTATION-GUIDE.md`',
            inline: false
          }
        ],
        footer: {
          text: 'Sistema de Monitoramento de Chaves'
        },
        timestamp: new Date().toISOString()
      }]
    });

    console.log(`[KeyExpiration] Alert sent to user ${userId} (${hoursRemaining}h remaining)`);
    log.info('[KeyExpiration] Alert sent', { userId, hoursRemaining });

  } catch (error: any) {
    console.error('[KeyExpiration] Failed to send alert:', error.message);
    log.error('[KeyExpiration] Failed to send alert', { error: error.message });
  } finally {
    await client.destroy();
  }
}

async function checkExpiration(): Promise<void> {
  console.log('[KeyExpiration] Checking key expiration...');

  const state = await loadState();

  if (!state) {
    console.log('[KeyExpiration] No rotation state found, skipping check');
    return;
  }

  const now = new Date();
  const expiresAt = new Date(state.expiresAt);
  const timeRemaining = expiresAt.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));

  console.log(`[KeyExpiration] Key expires at ${expiresAt.toISOString()} (${hoursRemaining}h remaining)`);

  // Se já expirou
  if (hoursRemaining <= 0) {
    console.log('[KeyExpiration] ⚠️ KEY EXPIRED!');
    await sendDiscordAlert(state.lastRotatedBy, 0);
    return;
  }

  // Verificar se deve enviar alerta
  const shouldAlert = ALERT_HOURS_BEFORE.some(hours => {
    // Alerta se estamos no intervalo de 1h antes do threshold
    // Ex: se threshold é 6h, alertar entre 6h e 5h
    return hoursRemaining <= hours && hoursRemaining > (hours - 1);
  });

  if (shouldAlert) {
    console.log(`[KeyExpiration] 🔔 Sending alert (${hoursRemaining}h remaining)`);
    await sendDiscordAlert(state.lastRotatedBy, hoursRemaining);
  } else {
    console.log(`[KeyExpiration] ✅ No alert needed (${hoursRemaining}h remaining)`);
  }

  // Log para metrics/monitoring
  log.info('[KeyExpiration] Check complete', {
    hoursRemaining,
    expiresAt: expiresAt.toISOString(),
    rotationCount: state.rotationCount,
    alertSent: shouldAlert
  });
}

// Run check
checkExpiration()
  .then(() => {
    console.log('[KeyExpiration] Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[KeyExpiration] Check failed:', error);
    process.exit(1);
  });
