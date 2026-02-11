import { Message, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getCloudRunClient } from '../cloud-run-client';

/**
 * Comando: !generate <prompt>
 *
 * Gera imagens usando o image-gen agent no Cloud Run
 *
 * Exemplos:
 * !generate a beautiful sunset over the ocean
 * !generate style:anime a cute cat with blue eyes
 * !enhance <image-url>
 */

export async function handleImageGenCommand(message: Message): Promise<void> {
  const content = message.content.trim();

  // !generate
  if (content.startsWith('!generate ')) {
    const prompt = content.substring('!generate '.length).trim();

    if (!prompt) {
      await message.reply('❌ Uso: `!generate <prompt>`\nExemplo: `!generate a beautiful sunset`');
      return;
    }

    // Detecta style
    let style: 'realistic' | 'anime' = 'realistic';
    let cleanPrompt = prompt;

    if (prompt.startsWith('style:anime ')) {
      style = 'anime';
      cleanPrompt = prompt.substring('style:anime '.length);
    }

    // Mensagem de loading
    const loadingMsg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFFAA00)
          .setTitle('🎨 Gerando imagem...')
          .setDescription(`**Prompt:** ${cleanPrompt}\n**Style:** ${style}`)
          .setFooter({ text: 'Pode levar até 30 segundos' })
      ]
    });

    try {
      const client = getCloudRunClient();
      const result = await client.generateImage({
        prompt: cleanPrompt,
        userId: message.author.id,
        style
      });

      if (!result.success || !result.imageUrl) {
        await loadingMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('❌ Erro ao gerar imagem')
              .setDescription(result.error || 'Erro desconhecido')
          ]
        });
        return;
      }

      // Sucesso!
      await loadingMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Imagem gerada!')
            .setDescription(`**Prompt:** ${cleanPrompt}`)
            .setImage(result.imageUrl)
            .addFields(
              { name: 'Style', value: style, inline: true },
              { name: 'User', value: `<@${message.author.id}>`, inline: true }
            )
            .setFooter({ text: `Gerado em ${new Date(result.timestamp || '').toLocaleString('pt-BR')}` })
        ]
      });

    } catch (error: any) {
      console.error('[ImageGen] Error:', error);
      await loadingMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Erro')
            .setDescription(`Falha ao conectar com o serviço: ${error.message}`)
        ]
      });
    }
  }

  // !enhance
  else if (content.startsWith('!enhance ')) {
    const imageUrl = content.substring('!enhance '.length).trim();

    if (!imageUrl || !imageUrl.startsWith('http')) {
      await message.reply('❌ Uso: `!enhance <url-da-imagem>`');
      return;
    }

    const loadingMsg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFFAA00)
          .setTitle('✨ Melhorando imagem...')
          .setDescription('Upscaling 2x com Real-ESRGAN')
          .setFooter({ text: 'Pode levar até 1 minuto' })
      ]
    });

    try {
      const client = getCloudRunClient();
      const result = await client.enhanceImage({
        imageUrl,
        userId: message.author.id
      });

      if (!result.success || !result.enhancedUrl) {
        await loadingMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('❌ Erro ao melhorar imagem')
              .setDescription(result.error || 'Erro desconhecido')
          ]
        });
        return;
      }

      await loadingMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Imagem melhorada!')
            .setDescription('Qualidade aumentada em 2x')
            .setImage(result.enhancedUrl)
            .addFields(
              { name: 'Original', value: `[Link](${result.originalUrl})`, inline: true },
              { name: 'Melhorada', value: `[Link](${result.enhancedUrl})`, inline: true }
            )
            .setFooter({ text: `Processado em ${new Date(result.timestamp || '').toLocaleString('pt-BR')}` })
        ]
      });

    } catch (error: any) {
      console.error('[ImageGen] Error:', error);
      await loadingMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Erro')
            .setDescription(`Falha ao conectar com o serviço: ${error.message}`)
        ]
      });
    }
  }
}

/**
 * Helper: Verifica se mensagem é comando image-gen
 */
export function isImageGenCommand(content: string): boolean {
  return content.startsWith('!generate ') || content.startsWith('!enhance ');
}
