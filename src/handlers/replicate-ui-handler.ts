/**
 * Replicate UI Button Handlers for Discord
 * 
 * Handles all button interactions for the image generation UI:
 * - Regenerate
 * - Remix (with style selection)
 * - Change Ratio (with ratio selection)
 * - Create Video
 * - Upscale
 * - Download
 */

import { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import {
  getGenerationSession,
  handleRegenerateAction,
  handleRemixAction,
  handleRatioChangeAction,
  handleVideoCreationAction,
  handleUpscaleAction,
  createRatioSelectMenu,
  createRemixStyleMenu,
  createImageActionButtons,
  saveGenerationSession,
  formatImageMessage,
  formatVideoMessage,
  formatUpscaleMessage
} from '../tools/replicate-ui';
import { smartGenerateImage } from '../tools/replicate-enhanced';
import Replicate from 'replicate';
import { log } from '../logger';

/**
 * Main handler for all replicate:* button interactions
 */
export async function handleReplicateUIButtons(
  interaction: ButtonInteraction | StringSelectMenuInteraction
): Promise<void> {
  await interaction.deferReply();

  const customId = interaction.customId;
  const parts = customId.split(':');
  const action = parts[1]; // regenerate, remix, ratio, video, upscale, download
  const sessionId = parts[2];

  log.info('[ReplicateUI] Button interaction', {
    action,
    sessionId,
    userId: interaction.user.id
  });

  try {
    switch (action) {
      case 'regenerate':
        await handleRegenerate(interaction, sessionId);
        break;

      case 'remix':
        await handleRemixPrompt(interaction, sessionId);
        break;

      case 'remix_style':
        await handleRemixWithStyle(interaction as StringSelectMenuInteraction, sessionId);
        break;

      case 'ratio':
        await handleRatioPrompt(interaction, sessionId);
        break;

      case 'ratio_select':
        await handleRatioChange(interaction as StringSelectMenuInteraction, sessionId);
        break;

      case 'video':
        await handleVideoCreation(interaction, sessionId);
        break;

      case 'upscale':
        await handleUpscale(interaction, sessionId);
        break;

      case 'download':
        await handleDownload(interaction, sessionId);
        break;

      default:
        await interaction.editReply({
          content: '❌ Unknown action. Please regenerate the image to get fresh buttons.'
        });
    }
  } catch (error: any) {
    log.error('[ReplicateUI] Button handler error', {
      error: error.message,
      action,
      sessionId
    });

    await interaction.editReply({
      content: `❌ Error: ${error.message}`
    });
  }
}

// ============================================================================
// INDIVIDUAL HANDLERS
// ============================================================================

async function handleRegenerate(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  sessionId: string
): Promise<void> {
  const params = await handleRegenerateAction(sessionId);
  const userId = interaction.user.id;

  await interaction.editReply({
    content: '🔄 Regenerating image with same settings...'
  });

  try {
    const result = await smartGenerateImage(params.prompt, userId, {
      model: params.model,
      aspect_ratio: params.aspectRatio,
      negative_prompt: params.negativePrompt
    });

    // Save new session
    const newSessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await saveGenerationSession({
      id: newSessionId,
      userId,
      prompt: params.prompt,
      model: result.model,
      imageUrl: result.url,
      aspectRatio: params.aspectRatio,
      negativePrompt: params.negativePrompt,
      createdAt: Date.now(),
      messageId: interaction.message.id
    });

    // Send new image with buttons
    const message = formatImageMessage(
      result.url,
      result.model,
      result.cost,
      params.prompt,
      params.aspectRatio
    );

    const buttons = createImageActionButtons(newSessionId);

    await interaction.editReply({
      content: message,
      components: buttons
    });

  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Regeneration failed: ${error.message}`
    });
  }
}

async function handleRemixPrompt(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  sessionId: string
): Promise<void> {
  // Show style selection menu
  const menu = createRemixStyleMenu(sessionId);

  await interaction.editReply({
    content: '🎨 Choose a style for your remix:',
    components: [menu]
  });
}

async function handleRemixWithStyle(
  interaction: StringSelectMenuInteraction,
  sessionId: string
): Promise<void> {
  const style = interaction.values[0];
  const params = await handleRemixAction(sessionId, style);
  const userId = interaction.user.id;

  await interaction.editReply({
    content: `🎨 Remixing with ${style} style...`,
    components: []
  });

  try {
    const result = await smartGenerateImage(params.prompt, userId, {
      model: params.model,
      aspect_ratio: params.aspectRatio,
      negative_prompt: params.negativePrompt
    });

    // Save new session
    const newSessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await saveGenerationSession({
      id: newSessionId,
      userId,
      prompt: params.prompt,
      model: result.model,
      imageUrl: result.url,
      aspectRatio: params.aspectRatio,
      negativePrompt: params.negativePrompt,
      createdAt: Date.now(),
      messageId: interaction.message.id
    });

    const message = formatImageMessage(
      result.url,
      result.model,
      result.cost,
      params.prompt,
      params.aspectRatio
    );

    const buttons = createImageActionButtons(newSessionId);

    await interaction.editReply({
      content: message,
      components: buttons
    });

  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Remix failed: ${error.message}`
    });
  }
}

async function handleRatioPrompt(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  sessionId: string
): Promise<void> {
  const session = await getGenerationSession(sessionId);
  
  if (!session) {
    await interaction.editReply({
      content: '❌ Session expired. Please generate a new image.'
    });
    return;
  }

  const menu = createRatioSelectMenu(sessionId, session.aspectRatio);

  await interaction.editReply({
    content: '📐 Choose a new aspect ratio:',
    components: [menu]
  });
}

async function handleRatioChange(
  interaction: StringSelectMenuInteraction,
  sessionId: string
): Promise<void> {
  const newRatio = interaction.values[0];
  const params = await handleRatioChangeAction(sessionId, newRatio);
  const userId = interaction.user.id;

  await interaction.editReply({
    content: `📐 Generating with ${newRatio} aspect ratio...`,
    components: []
  });

  try {
    const result = await smartGenerateImage(params.prompt, userId, {
      model: params.model,
      aspect_ratio: params.aspectRatio,
      negative_prompt: params.negativePrompt
    });

    // Save new session
    const newSessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await saveGenerationSession({
      id: newSessionId,
      userId,
      prompt: params.prompt,
      model: result.model,
      imageUrl: result.url,
      aspectRatio: params.aspectRatio,
      negativePrompt: params.negativePrompt,
      createdAt: Date.now(),
      messageId: interaction.message.id
    });

    const message = formatImageMessage(
      result.url,
      result.model,
      result.cost,
      params.prompt,
      params.aspectRatio
    );

    const buttons = createImageActionButtons(newSessionId);

    await interaction.editReply({
      content: message,
      components: buttons
    });

  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Ratio change failed: ${error.message}`
    });
  }
}

async function handleVideoCreation(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  sessionId: string
): Promise<void> {
  const params = await handleVideoCreationAction(sessionId);

  await interaction.editReply({
    content: '🎬 Creating video from image... This may take 1-2 minutes.'
  });

  try {
    const client = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN || ''
    });

    // Use Stable Video Diffusion
    const output = await client.run(
      'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438' as any,
      {
        input: {
          input_image: params.imageUrl,
          frames_per_second: 6,
          motion_bucket_id: 127
        }
      }
    );

    const videoUrl = Array.isArray(output) ? output[0] : output;

    const message = formatVideoMessage(videoUrl as string, 3, 0.02);

    await interaction.editReply({
      content: message
    });

  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Video creation failed: ${error.message}`
    });
  }
}

async function handleUpscale(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  sessionId: string
): Promise<void> {
  const params = await handleUpscaleAction(sessionId);

  await interaction.editReply({
    content: '⬆️ Upscaling image to 4x resolution...'
  });

  try {
    const client = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN || ''
    });

    // Use Real-ESRGAN for upscaling
    const output = await client.run(
      'xinntao/realesrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b' as any,
      {
        input: {
          image: params.imageUrl,
          scale: 4,
          face_enhance: false
        }
      }
    );

    const upscaledUrl = Array.isArray(output) ? output[0] : output;

    const message = formatUpscaleMessage(upscaledUrl as string, 4, 0.002);

    await interaction.editReply({
      content: message
    });

  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Upscale failed: ${error.message}`
    });
  }
}

async function handleDownload(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  sessionId: string
): Promise<void> {
  const session = await getGenerationSession(sessionId);

  if (!session) {
    await interaction.editReply({
      content: '❌ Session expired. Please generate a new image.'
    });
    return;
  }

  await interaction.editReply({
    content: `⬇️ **Download HD Image**

🔗 Direct link: ${session.imageUrl}

Right-click → Save Image As...
Or click the link to open in browser.

Original settings:
- Model: ${session.model}
- Ratio: ${session.aspectRatio}
- Prompt: ${session.prompt.substring(0, 100)}...`
  });
}
