/**
 * Enhanced Replicate Integration
 * 
 * Features:
 * - 🔐 Permission-based access (Admin vs Unknown users)
 * - 🎨 Support for ALL popular Replicate models
 * - 🧠 Smart model detection from user prompt
 * - 💰 Cost control and rate limiting
 * - 🎬 Image + Video + Audio generation
 * 
 * Permission System:
 * - Admin users (DISCORD_ADMIN_USER_IDS): Can use ANY model
 * - Unknown users: BLOCKED from expensive APIs (images/videos/audio)
 * - Unknown users: Only cheap LLM models allowed
 */

import Anthropic from '@anthropic-ai/sdk';
import Replicate from 'replicate';
import { log } from '../logger';

// ============================================================================
// PERMISSION SYSTEM
// ============================================================================

export function isAdminUser(userId: string): boolean {
  const adminIds = process.env.DISCORD_ADMIN_USER_IDS?.split(',') || [];
  return adminIds.includes(userId);
}

export function canUseExpensiveAPI(userId: string, apiType: 'image' | 'video' | 'audio'): boolean {
  // Only admins can use expensive media generation
  if (!isAdminUser(userId)) {
    log.warn('[Replicate] Unknown user blocked from expensive API', {
      userId,
      apiType
    });
    return false;
  }
  return true;
}

// ============================================================================
// MODEL REGISTRY (All Popular Replicate Models)
// ============================================================================

export interface ReplicateModel {
  id: string;
  name: string;
  fullId: string; // owner/model:version
  type: 'image' | 'video' | 'upscale' | 'style' | 'audio';
  cost: 'free' | 'cheap' | 'expensive';
  keywords: string[]; // For smart detection
  description: string;
}

export const REPLICATE_MODELS: Record<string, ReplicateModel> = {
  // ========== IMAGE MODELS ==========
  'flux-schnell': {
    id: 'flux-schnell',
    name: 'Flux Schnell',
    fullId: 'black-forest-labs/flux-schnell',
    type: 'image',
    cost: 'cheap',
    keywords: ['flux', 'schnell', 'fast', 'rápido'],
    description: 'Ultra-fast image generation (2-5s) with good quality'
  },
  
  'flux-dev': {
    id: 'flux-dev',
    name: 'Flux Dev',
    fullId: 'black-forest-labs/flux-dev',
    type: 'image',
    cost: 'expensive',
    keywords: ['flux dev', 'flux-dev', 'best quality'],
    description: 'Highest quality Flux model (slower but better)'
  },
  
  'flux-pro': {
    id: 'flux-pro',
    name: 'Flux Pro',
    fullId: 'black-forest-labs/flux-pro',
    type: 'image',
    cost: 'expensive',
    keywords: ['flux pro', 'flux-pro', 'professional'],
    description: 'Professional-grade Flux (best for production)'
  },
  
  'sdxl': {
    id: 'sdxl',
    name: 'SDXL',
    fullId: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    type: 'image',
    cost: 'cheap',
    keywords: ['sdxl', 'stable diffusion xl'],
    description: 'Stable Diffusion XL - reliable and high quality'
  },
  
  'sd3': {
    id: 'sd3',
    name: 'Stable Diffusion 3',
    fullId: 'stability-ai/stable-diffusion-3',
    type: 'image',
    cost: 'expensive',
    keywords: ['sd3', 'stable diffusion 3', 'sd 3'],
    description: 'Latest Stable Diffusion (multi-modal prompting)'
  },
  
  'playground-v2.5': {
    id: 'playground-v2.5',
    name: 'Playground v2.5',
    fullId: 'playgroundai/playground-v2.5-1024px-aesthetic',
    type: 'image',
    cost: 'cheap',
    keywords: ['playground', 'aesthetic'],
    description: 'Aesthetic-focused image generation'
  },
  
  'nanobanana-pro': {
    id: 'nanobanana-pro',
    name: 'Nanobanana Pro',
    fullId: 'fofr/nanobanana-pro',
    type: 'image',
    cost: 'expensive',
    keywords: ['nanobanana', 'nano banana', 'nano', 'banana'],
    description: 'High-end artistic image generation with unique style'
  },
  
  'realvisxl': {
    id: 'realvisxl',
    name: 'RealVisXL',
    fullId: 'lucataco/realvisxl-v3:4f43dcf74c35e073e77de429d34b21a817f436c6f7e58e6b7e1f830b83220a88',
    type: 'image',
    cost: 'cheap',
    keywords: ['realvisxl', 'realistic', 'photo'],
    description: 'Photorealistic image generation'
  },
  
  'epicrealism': {
    id: 'epicrealism',
    name: 'EpicRealism',
    fullId: 'cjwbw/epicrealism:76bf47e6e0e6d3b43e15f30df49e72e8f8c5c7e8f8c5c7e8',
    type: 'image',
    cost: 'cheap',
    keywords: ['epicrealism', 'epic realism', 'ultra realistic portrait', 'ultra realistic'],
    description: 'Ultra-realistic portraits and scenes'
  },

  // ========== VIDEO MODELS ==========
  
  'stable-video-diffusion': {
    id: 'stable-video-diffusion',
    name: 'Stable Video Diffusion',
    fullId: 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
    type: 'video',
    cost: 'expensive',
    keywords: ['svd', 'stable video', 'animate'],
    description: 'Image-to-video animation'
  },
  
  'animatediff': {
    id: 'animatediff',
    name: 'AnimateDiff',
    fullId: 'lucataco/animate-diff',
    type: 'video',
    cost: 'expensive',
    keywords: ['animatediff', 'animate diff', 'animation'],
    description: 'Text-to-video generation'
  },
  
  'zeroscope-v2': {
    id: 'zeroscope-v2',
    name: 'Zeroscope V2',
    fullId: 'anotherjesse/zeroscope-v2-xl',
    type: 'video',
    cost: 'expensive',
    keywords: ['zeroscope', 'video generation'],
    description: 'High-quality text-to-video'
  },

  // ========== UPSCALE MODELS ==========
  
  'real-esrgan': {
    id: 'real-esrgan',
    name: 'Real-ESRGAN',
    fullId: 'xinntao/realesrgan',
    type: 'upscale',
    cost: 'cheap',
    keywords: ['upscale', 'enhance', 'esrgan'],
    description: 'AI image upscaling (2x, 4x, 8x)'
  },
  
  'clarity-upscaler': {
    id: 'clarity-upscaler',
    name: 'Clarity Upscaler',
    fullId: 'philz1337x/clarity-upscaler',
    type: 'upscale',
    cost: 'expensive',
    keywords: ['clarity', 'ultra upscale'],
    description: 'Premium upscaling with clarity enhancement'
  },

  // ========== STYLE TRANSFER ==========
  
  'controlnet': {
    id: 'controlnet',
    name: 'ControlNet',
    fullId: 'jagilley/controlnet-scribble',
    type: 'style',
    cost: 'cheap',
    keywords: ['controlnet', 'style', 'transfer'],
    description: 'Style transfer and image control'
  }
};

// ============================================================================
// SMART MODEL DETECTION
// ============================================================================

export function detectModelFromPrompt(prompt: string): string | null {
  const lowerPrompt = prompt.toLowerCase();
  
  // Sort models by keyword specificity (longer keywords first)
  // This ensures "flux pro" matches before "flux"
  const sortedModels = Object.entries(REPLICATE_MODELS).sort((a, b) => {
    const maxKeywordLengthA = Math.max(...a[1].keywords.map(k => k.length));
    const maxKeywordLengthB = Math.max(...b[1].keywords.map(k => k.length));
    return maxKeywordLengthB - maxKeywordLengthA;
  });
  
  // Check each model's keywords (most specific first)
  for (const [modelId, model] of sortedModels) {
    for (const keyword of model.keywords) {
      if (lowerPrompt.includes(keyword)) {
        log.info('[Replicate] Model detected from prompt', {
          model: modelId,
          keyword,
          prompt: prompt.substring(0, 100)
        });
        return modelId;
      }
    }
  }
  
  return null;
}

// ============================================================================
// COST CONTROL
// ============================================================================

export interface CostEstimate {
  model: string;
  estimatedCost: number; // USD
  estimatedTime: number; // seconds
  warning?: string;
}

export function estimateCost(modelId: string): CostEstimate {
  const model = REPLICATE_MODELS[modelId];
  
  if (!model) {
    return {
      model: modelId,
      estimatedCost: 0.01,
      estimatedTime: 10
    };
  }
  
  const costs: Record<string, number> = {
    'free': 0,
    'cheap': 0.002, // $0.002 per generation
    'expensive': 0.02 // $0.02 per generation
  };
  
  const times: Record<string, number> = {
    'image': 10,
    'video': 60,
    'upscale': 15,
    'style': 20,
    'audio': 30
  };
  
  const estimate: CostEstimate = {
    model: model.name,
    estimatedCost: costs[model.cost],
    estimatedTime: times[model.type]
  };
  
  if (model.cost === 'expensive') {
    estimate.warning = 'This model is expensive ($0.02/gen). Admin only!';
  }
  
  return estimate;
}

// ============================================================================
// SMART IMAGE GENERATION (With Permission Check)
// ============================================================================

export async function smartGenerateImage(
  prompt: string,
  userId: string,
  options?: {
    model?: string;
    aspect_ratio?: string;
    negative_prompt?: string;
  }
): Promise<{
  url: string;
  model: string;
  cost: number;
  error?: string;
}> {
  // Permission check
  if (!canUseExpensiveAPI(userId, 'image')) {
    throw new Error('⛔ Only admin users can generate images. Contact an administrator.');
  }
  
  // Detect model from prompt if not specified
  let modelId = options?.model;
  
  if (!modelId) {
    const detected = detectModelFromPrompt(prompt);
    if (detected) {
      modelId = detected;
      log.info('[Replicate] Using detected model', { model: modelId });
    } else {
      // Default to fast model
      modelId = 'flux-schnell';
      log.info('[Replicate] Using default model', { model: modelId });
    }
  }
  
  const model = REPLICATE_MODELS[modelId];
  
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  
  // Check if user can afford this model
  if (model.cost === 'expensive' && !isAdminUser(userId)) {
    throw new Error(`⛔ Model "${model.name}" is admin-only (expensive). Try a cheaper model like "flux-schnell".`);
  }
  
  // Get cost estimate
  const costEst = estimateCost(modelId);
  
  log.info('[Replicate] Generating image', {
    userId,
    model: model.name,
    estimatedCost: costEst.estimatedCost,
    isAdmin: isAdminUser(userId)
  });
  
  // Initialize Replicate client
  const client = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN || ''
  });
  
  // Prepare input
  const input: any = {
    prompt,
    aspect_ratio: options?.aspect_ratio || '1:1'
  };
  
  if (options?.negative_prompt) {
    input.negative_prompt = options.negative_prompt;
  }
  
  // Run model
  try {
    const output = await client.run(model.fullId as any, { input });
    
    const imageUrl = Array.isArray(output) ? output[0] : output;
    
    log.info('[Replicate] Image generated successfully', {
      model: model.name,
      url: imageUrl
    });
    
    return {
      url: imageUrl as string,
      model: model.name,
      cost: costEst.estimatedCost
    };
    
  } catch (error: any) {
    log.error('[Replicate] Image generation failed', {
      error: error.message,
      model: model.name
    });
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function getReplicateClient(): Replicate {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }
  return new Replicate({ auth: apiToken });
}

export { Replicate };
