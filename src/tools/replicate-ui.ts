/**
 * Replicate UI - Interactive Content Creation Studio
 * 
 * Transforms image generation into a professional content creation hub:
 * - 🔄 Regenerate: Create new variation
 * - 🎨 Remix: Apply style variations
 * - 📐 Ratio: Change aspect ratio
 * - ⬇️ Download: Get high-res download link
 * - 🎬 Video: Animate image (image-to-video)
 * 
 * Uses Discord buttons and select menus for professional UX.
 */

import { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } from 'discord.js';
import { log } from '../logger';
import { RedisCache } from '../core/redis-cache';

// ============================================================================
// SESSION CACHE (stores generation context for UI interactions)
// ============================================================================

export interface GenerationSession {
  id: string;
  userId: string;
  prompt: string;
  model: string;
  imageUrl: string;
  aspectRatio: string;
  negativePrompt?: string;
  createdAt: number;
  messageId: string;
}

const cache = new RedisCache();
const SESSION_TTL = 3600; // 1 hour

export async function saveGenerationSession(session: GenerationSession): Promise<void> {
  const key = `gen_session:${session.id}`;
  await cache.set(key, session, SESSION_TTL);
  log.info('[ReplicateUI] Session saved', { sessionId: session.id, ttl: SESSION_TTL });
}

export async function getGenerationSession(sessionId: string): Promise<GenerationSession | null> {
  const key = `gen_session:${sessionId}`;
  const session = await cache.get<GenerationSession>(key);
  
  if (!session) {
    log.warn('[ReplicateUI] Session not found or expired', { sessionId });
  }
  
  return session;
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

export function createImageActionButtons(sessionId: string): ActionRowBuilder<ButtonBuilder>[] {
  // Row 1: Main actions
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`replicate:regenerate:${sessionId}`)
      .setLabel('Regenerate')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    
    new ButtonBuilder()
      .setCustomId(`replicate:remix:${sessionId}`)
      .setLabel('Remix')
      .setEmoji('🎨')
      .setStyle(ButtonStyle.Primary),
    
    new ButtonBuilder()
      .setCustomId(`replicate:video:${sessionId}`)
      .setLabel('Create Video')
      .setEmoji('🎬')
      .setStyle(ButtonStyle.Success)
  );

  // Row 2: Utilities
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`replicate:ratio:${sessionId}`)
      .setLabel('Change Ratio')
      .setEmoji('📐')
      .setStyle(ButtonStyle.Secondary),
    
    new ButtonBuilder()
      .setCustomId(`replicate:upscale:${sessionId}`)
      .setLabel('Upscale 4x')
      .setEmoji('⬆️')
      .setStyle(ButtonStyle.Secondary),
    
    new ButtonBuilder()
      .setCustomId(`replicate:download:${sessionId}`)
      .setLabel('Download HD')
      .setEmoji('⬇️')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

export function createRatioSelectMenu(sessionId: string, currentRatio: string): ActionRowBuilder<StringSelectMenuBuilder> {
  const options = [
    { label: '1:1 Square', value: '1:1', emoji: '⬛', description: 'Perfect for Instagram posts' },
    { label: '16:9 Landscape', value: '16:9', emoji: '🖼️', description: 'YouTube thumbnails, banners' },
    { label: '9:16 Portrait', value: '9:16', emoji: '📱', description: 'Instagram Stories, TikTok' },
    { label: '4:3 Classic', value: '4:3', emoji: '📺', description: 'Classic photo format' },
    { label: '3:4 Portrait', value: '3:4', emoji: '🖼️', description: 'Portrait photos' },
    { label: '21:9 Cinematic', value: '21:9', emoji: '🎬', description: 'Ultra-wide cinematic' },
  ];

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`replicate:ratio_select:${sessionId}`)
    .setPlaceholder(`Current: ${currentRatio} - Select new aspect ratio`)
    .addOptions(options.map(opt => ({
      ...opt,
      default: opt.value === currentRatio
    })));

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function createRemixStyleMenu(sessionId: string): ActionRowBuilder<StringSelectMenuBuilder> {
  const styles = [
    { label: 'Anime Style', value: 'anime', emoji: '🎌', description: 'Japanese anime aesthetic' },
    { label: 'Oil Painting', value: 'oil_painting', emoji: '🎨', description: 'Classic oil painting look' },
    { label: 'Cyberpunk', value: 'cyberpunk', emoji: '🌆', description: 'Neon lights, futuristic' },
    { label: 'Watercolor', value: 'watercolor', emoji: '💧', description: 'Soft watercolor painting' },
    { label: 'Sketch', value: 'sketch', emoji: '✏️', description: 'Pencil sketch style' },
    { label: '3D Render', value: '3d_render', emoji: '🎲', description: 'Pixar-style 3D render' },
    { label: 'Photorealistic', value: 'photorealistic', emoji: '📷', description: 'Ultra realistic photo' },
    { label: 'Pop Art', value: 'pop_art', emoji: '🎭', description: 'Andy Warhol style' },
    { label: 'Studio Ghibli', value: 'ghibli', emoji: '🌸', description: 'Ghibli animation style' },
    { label: 'Dark Fantasy', value: 'dark_fantasy', emoji: '🗡️', description: 'Gothic, dramatic' },
  ];

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`replicate:remix_style:${sessionId}`)
    .setPlaceholder('Choose a style for remix')
    .addOptions(styles);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

export async function handleRegenerateAction(sessionId: string): Promise<{
  prompt: string;
  model: string;
  aspectRatio: string;
  negativePrompt?: string;
}> {
  const session = await getGenerationSession(sessionId);
  
  if (!session) {
    throw new Error('Session expired. Please generate a new image.');
  }

  log.info('[ReplicateUI] Regenerating image', {
    sessionId,
    model: session.model
  });

  // Add variation seed to prompt for different result
  const seed = Math.floor(Math.random() * 1000000);
  
  return {
    prompt: session.prompt,
    model: session.model,
    aspectRatio: session.aspectRatio,
    negativePrompt: session.negativePrompt
  };
}

export async function handleRemixAction(
  sessionId: string, 
  style: string
): Promise<{
  prompt: string;
  model: string;
  aspectRatio: string;
  negativePrompt?: string;
}> {
  const session = await getGenerationSession(sessionId);
  
  if (!session) {
    throw new Error('Session expired. Please generate a new image.');
  }

  log.info('[ReplicateUI] Remixing image', {
    sessionId,
    style
  });

  // Style prompt additions
  const stylePrompts: Record<string, string> = {
    'anime': ', anime style, manga aesthetic, vibrant colors',
    'oil_painting': ', oil painting, impressionist, brush strokes, canvas texture',
    'cyberpunk': ', cyberpunk style, neon lights, futuristic, blade runner aesthetic',
    'watercolor': ', watercolor painting, soft colors, paper texture',
    'sketch': ', pencil sketch, hand drawn, artistic line work',
    '3d_render': ', 3D render, Pixar style, volumetric lighting, ray tracing',
    'photorealistic': ', photorealistic, ultra detailed, professional photography, 8k',
    'pop_art': ', pop art style, Andy Warhol, bold colors, comic book aesthetic',
    'ghibli': ', Studio Ghibli style, Miyazaki aesthetic, whimsical, anime',
    'dark_fantasy': ', dark fantasy, gothic, dramatic lighting, dark souls aesthetic'
  };

  const styleAddition = stylePrompts[style] || '';
  const remixedPrompt = session.prompt + styleAddition;

  return {
    prompt: remixedPrompt,
    model: session.model,
    aspectRatio: session.aspectRatio,
    negativePrompt: session.negativePrompt
  };
}

export async function handleRatioChangeAction(
  sessionId: string,
  newRatio: string
): Promise<{
  prompt: string;
  model: string;
  aspectRatio: string;
  negativePrompt?: string;
}> {
  const session = await getGenerationSession(sessionId);
  
  if (!session) {
    throw new Error('Session expired. Please generate a new image.');
  }

  log.info('[ReplicateUI] Changing aspect ratio', {
    sessionId,
    oldRatio: session.aspectRatio,
    newRatio
  });

  return {
    prompt: session.prompt,
    model: session.model,
    aspectRatio: newRatio,
    negativePrompt: session.negativePrompt
  };
}

export async function handleVideoCreationAction(
  sessionId: string
): Promise<{
  imageUrl: string;
  model: string;
  prompt: string;
}> {
  const session = await getGenerationSession(sessionId);
  
  if (!session) {
    throw new Error('Session expired. Please generate a new image.');
  }

  log.info('[ReplicateUI] Creating video from image', {
    sessionId,
    imageUrl: session.imageUrl
  });

  return {
    imageUrl: session.imageUrl,
    model: 'stable-video-diffusion', // Default video model
    prompt: session.prompt
  };
}

export async function handleUpscaleAction(
  sessionId: string
): Promise<{
  imageUrl: string;
  scale: number;
}> {
  const session = await getGenerationSession(sessionId);
  
  if (!session) {
    throw new Error('Session expired. Please generate a new image.');
  }

  log.info('[ReplicateUI] Upscaling image', {
    sessionId,
    imageUrl: session.imageUrl
  });

  return {
    imageUrl: session.imageUrl,
    scale: 4 // 4x upscale
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function formatImageMessage(
  imageUrl: string,
  model: string,
  cost: number,
  prompt: string,
  aspectRatio: string
): string {
  return `✅ **Image Generated Successfully!**

🎨 **Model:** ${model}
📐 **Ratio:** ${aspectRatio}
💰 **Cost:** $${cost.toFixed(4)}

📝 **Prompt:** ${prompt.substring(0, 150)}${prompt.length > 150 ? '...' : ''}

🔗 **URL:** ${imageUrl}

---
**🎬 Content Creation Studio**
Use the buttons below to enhance, remix, or animate your image!
⏰ Session expires in 1 hour.`;
}

export function formatVideoMessage(
  videoUrl: string,
  duration: number,
  cost: number
): string {
  return `✅ **Video Created Successfully!**

🎬 **Duration:** ${duration}s
💰 **Cost:** $${cost.toFixed(4)}

🔗 **URL:** ${videoUrl}

---
Your animated video is ready! Download or share it.`;
}

export function formatUpscaleMessage(
  imageUrl: string,
  scale: number,
  cost: number
): string {
  return `✅ **Image Upscaled Successfully!**

⬆️ **Scale:** ${scale}x (4x resolution!)
💰 **Cost:** $${cost.toFixed(4)}

🔗 **High-Res URL:** ${imageUrl}

---
Your high-resolution image is ready for download!`;
}
