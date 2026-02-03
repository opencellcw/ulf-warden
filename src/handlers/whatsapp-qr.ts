import QRCodeImage from 'qrcode';
import { log } from '../logger';
import { AttachmentBuilder } from 'discord.js';

/**
 * Send QR Code image to Discord channel
 */
export async function sendQRCodeToDiscord(qrData: string, discordClient: any): Promise<void> {
  if (!discordClient) {
    throw new Error('Discord client not set');
  }

  const channelId = process.env.WHATSAPP_QR_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID;
  if (!channelId) {
    throw new Error('WHATSAPP_QR_CHANNEL_ID or DISCORD_CHANNEL_ID not set');
  }

  try {
    // Generate QR code as PNG buffer
    const qrImageBuffer = await QRCodeImage.toBuffer(qrData, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Get Discord channel
    const channel = await discordClient.channels.fetch(channelId);
    if (!channel || !('send' in channel)) {
      throw new Error(`Invalid Discord channel: ${channelId}`);
    }

    // Create attachment directly from buffer (no file I/O needed)
    const attachment = new AttachmentBuilder(qrImageBuffer, { name: 'whatsapp-qr.png' });

    // Send message with QR code
    await channel.send({
      content: `📱 **WhatsApp QR Code**\n\n` +
               `⚠️ **ATENÇÃO:** Escaneie este QR Code em **20 segundos**!\n\n` +
               `**Como escanear:**\n` +
               `1. Abra WhatsApp no celular\n` +
               `2. Menu (⋮) → **Aparelhos conectados**\n` +
               `3. **Conectar um aparelho**\n` +
               `4. **Escaneie o QR Code abaixo**\n\n` +
               `✅ Após escanear, você verá: "WhatsApp authenticated and ready"`,
      files: [attachment]
    });

    log.info('[WhatsApp] QR Code sent to Discord', { channelId });

  } catch (error: any) {
    log.error('[WhatsApp] Failed to send QR to Discord', {
      error: error.message,
      channelId
    });
    throw error;
  }
}

/**
 * Send WhatsApp connection status to Discord
 */
export async function sendWhatsAppStatusToDiscord(
  discordClient: any,
  status: 'connected' | 'disconnected' | 'reconnecting',
  details?: string
): Promise<void> {
  if (!discordClient) return;

  const channelId = process.env.WHATSAPP_QR_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID;
  if (!channelId) return;

  try {
    const channel = await discordClient.channels.fetch(channelId);
    if (!channel || !('send' in channel)) return;

    let message = '';
    switch (status) {
      case 'connected':
        message = '✅ **WhatsApp Conectado!**\n\nO WhatsApp está pronto para uso.';
        break;
      case 'disconnected':
        message = `❌ **WhatsApp Desconectado**\n\n${details || 'Conexão perdida.'}`;
        break;
      case 'reconnecting':
        message = '🔄 **WhatsApp Reconectando...**\n\nAguardando reconexão.';
        break;
    }

    await channel.send(message);
    log.info('[WhatsApp] Status sent to Discord', { status });

  } catch (error: any) {
    log.error('[WhatsApp] Failed to send status to Discord', { error: error.message });
  }
}
