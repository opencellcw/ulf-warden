import Anthropic from '@anthropic-ai/sdk';
import Replicate from 'replicate';
import { log } from '../logger';
import { 
  isAdminUser, 
  canUseExpensiveAPI, 
  detectModelFromPrompt,
  smartGenerateImage,
  REPLICATE_MODELS 
} from './replicate-enhanced';

/**
 * Replicate Tools - Image, Video, and Model Generation
 *
 * 🔐 PERMISSION SYSTEM:
 * - Admin users: Can use ALL models (including expensive ones)
 * - Unknown users: BLOCKED from image/video/audio generation
 * 
 * Popular models:
 * - Flux Schnell (fast, cheap)
 * - Nanobanana Pro (artistic, expensive) 
 * - SDXL (reliable, cheap)
 * - Flux Pro/Dev (best quality, expensive)
 * - And hundreds more...
 */

let replicateClient: Replicate | null = null;

function getReplicateClient(): Replicate {
  if (!replicateClient) {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      throw new Error('REPLICATE_API_TOKEN not configured');
    }
    replicateClient = new Replicate({ auth: apiToken });
  }
  return replicateClient;
}

export const REPLICATE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'replicate_generate_image',
    description: `Generate images using AI models via Replicate.

🔐 PERMISSION: Admin users only! Unknown users are blocked.

📚 SMART MODEL DETECTION:
The system automatically detects which model to use based on keywords in the prompt:
- "nanobanana", "nano banana" → Nanobanana Pro (artistic, expensive)
- "flux schnell", "fast" → Flux Schnell (fast, cheap)
- "flux dev", "best quality" → Flux Dev (highest quality)
- "flux pro", "professional" → Flux Pro (production-grade)
- "sdxl", "stable diffusion xl" → SDXL (reliable)
- "sd3", "stable diffusion 3" → SD3 (latest)
- "playground", "aesthetic" → Playground v2.5 (aesthetic)
- "realvisxl", "realistic", "photo" → RealVisXL (photorealistic)
- "epicrealism", "ultra realistic" → EpicRealism (portraits)

💰 COST:
- Cheap models: $0.002/image (flux-schnell, sdxl, playground, realvisxl, epicrealism)
- Expensive models: $0.02/image (nanobanana-pro, flux-pro, flux-dev, sd3)

Examples:
- "Generate a cat pirate with nanobanana pro" → Uses Nanobanana Pro
- "Fast image of a sunset with flux schnell" → Uses Flux Schnell
- "Ultra realistic portrait with epicrealism" → Uses EpicRealism

If no model keyword is detected, defaults to flux-schnell for speed.`,
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the image to generate. Can include model name (e.g., "with nanobanana pro").'
        },
        model: {
          type: 'string',
          description: 'Model to use (optional, auto-detected from prompt)',
          enum: [
            'flux-schnell', 'flux-dev', 'flux-pro',
            'sdxl', 'sd3', 'stable-diffusion',
            'nanobanana-pro', 'playground-v2.5',
            'realvisxl', 'epicrealism'
          ]
        },
        aspect_ratio: {
          type: 'string',
          description: 'Image aspect ratio (default: 1:1)',
          enum: ['1:1', '16:9', '9:16', '4:3', '3:4']
        },
        negative_prompt: {
          type: 'string',
          description: 'What to avoid in the image'
        },
        user_id: {
          type: 'string',
          description: 'Discord user ID (for permission check)'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'replicate_generate_video',
    description: `Generate videos from text or images using AI.

Supports:
- Text-to-video: Generate videos from descriptions
- Image-to-video: Animate static images
- Video editing and effects

Examples:
- "Create a video of waves crashing on a beach"
- "Animate this image of a dog"
- "Generate a timelapse of a sunset"

Returns URL to generated video (MP4).`,
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Description of the video to generate'
        },
        image_url: {
          type: 'string',
          description: 'Optional: URL of image to animate'
        },
        duration: {
          type: 'number',
          description: 'Video duration in seconds (default: 3-5s depending on model)'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'replicate_run_model',
    description: `Run any Replicate model with custom parameters.

Use this for advanced use cases or specific models not covered by other tools.

Examples:
- model="meta/llama-3-70b-instruct", input={"prompt": "Hello"}
- model="stability-ai/sdxl", input={"prompt": "a cat", "width": 1024}

Find models at: https://replicate.com/explore

Returns the model output (varies by model).`,
    input_schema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Model identifier (owner/name or owner/name:version)'
        },
        input: {
          type: 'object',
          description: 'Input parameters for the model (JSON object)'
        }
      },
      required: ['model', 'input']
    }
  },
  {
    name: 'replicate_upscale_image',
    description: `Upscale and enhance images using AI.

Makes images larger and sharper with improved details.

Examples:
- image_url="https://example.com/small.jpg"
- scale=4 (4x larger)

Returns URL to upscaled image.`,
    input_schema: {
      type: 'object',
      properties: {
        image_url: {
          type: 'string',
          description: 'URL of the image to upscale'
        },
        scale: {
          type: 'number',
          description: 'Upscaling factor (2, 4, or 8)',
          enum: [2, 4, 8]
        }
      },
      required: ['image_url']
    }
  },
  {
    name: 'replicate_remove_background',
    description: `Remove background from images automatically.

Perfect for product photos, portraits, etc.

Example:
- image_url="https://example.com/photo.jpg"

Returns URL to image with transparent background.`,
    input_schema: {
      type: 'object',
      properties: {
        image_url: {
          type: 'string',
          description: 'URL of the image'
        }
      },
      required: ['image_url']
    }
  }
];

export async function executeReplicateTool(
  toolName: string, 
  input: any, 
  userId?: string
): Promise<string> {
  const startTime = Date.now();
  let modelName = '';
  let success = false;
  
  try {
    const client = getReplicateClient();

    // Inject user_id into input for permission checks
    const enrichedInput = { ...input, user_id: userId || input.user_id };

    let result: string;
    
    switch (toolName) {
      case 'replicate_generate_image':
        modelName = input.model || 'auto-detected';
        result = await generateImage(client, enrichedInput);
        success = result.includes('✅') || result.includes('URL:');
        break;
      case 'replicate_generate_video':
        modelName = 'video-generator';
        result = await generateVideo(client, input);
        success = result.includes('✅') || result.includes('URL:');
        break;
      case 'replicate_run_model':
        modelName = input.model || 'custom';
        result = await runModel(client, input);
        success = !result.includes('❌') && !result.includes('Error:');
        break;
      case 'replicate_upscale_image':
        modelName = 'image-upscaler';
        result = await upscaleImage(client, input);
        success = result.includes('✅') || result.includes('URL:');
        break;
      case 'replicate_remove_background':
        modelName = 'background-remover';
        result = await removeBackground(client, input);
        success = result.includes('✅') || result.includes('URL:');
        break;
      default:
        return `Unknown Replicate tool: ${toolName}`;
    }

    // Track usage in registry
    if (userId && modelName) {
      trackReplicateUsage(
        modelName,
        userId,
        input.prompt || JSON.stringify(input),
        success,
        (Date.now() - startTime) / 1000
      );
    }

    return result;
  } catch (error: any) {
    // Track failed usage
    if (userId && modelName) {
      trackReplicateUsage(
        modelName,
        userId,
        input.prompt || JSON.stringify(input),
        false,
        (Date.now() - startTime) / 1000,
        error.message
      );
    }
    
    log.error(`[Replicate] Tool execution failed: ${toolName}`, { error: error.message });
    return `Error: ${error.message}`;
  }
}

/**
 * Track usage in registry (async, non-blocking)
 */
function trackReplicateUsage(
  modelName: string,
  userId: string,
  prompt: string,
  success: boolean,
  runTime: number,
  errorMessage?: string
): void {
  // Import and call registry asynchronously
  import('../replicate/model-registry').then(({ getReplicateRegistry }) => {
    try {
      const registry = getReplicateRegistry();
      registry.recordUsage(modelName, userId, prompt, success, runTime, errorMessage);
    } catch (error: any) {
      log.warn('[Replicate] Failed to track usage', { error: error.message });
    }
  }).catch(() => {
    // Silently fail tracking, don't affect main operation
  });
}

async function generateImage(client: Replicate, input: any): Promise<string> {
  const { prompt, model, aspect_ratio = '1:1', negative_prompt, user_id } = input;

  // Permission check
  if (!user_id) {
    throw new Error('user_id is required for permission check');
  }

  if (!canUseExpensiveAPI(user_id, 'image')) {
    return `⛔ **Image generation is admin-only!**

Only administrators can generate images due to API costs.

If you're an admin, make sure your Discord User ID is in DISCORD_ADMIN_USER_IDS.

Contact an administrator for access.`;
  }

  log.info('[Replicate] Generating image (enhanced)', {
    userId: user_id,
    isAdmin: isAdminUser(user_id),
    prompt: prompt.substring(0, 50)
  });

  try {
    // Use smart generation with auto model detection
    const result = await smartGenerateImage(prompt, user_id, {
      model,
      aspect_ratio,
      negative_prompt
    });

    return `✅ Image generated! | ${result.model} | $${result.cost.toFixed(4)}

${result.url}`;
    
  } catch (error: any) {
    log.error('[Replicate] Image generation failed', { error: error.message });
    
    if (error.message.includes('admin-only') || error.message.includes('⛔')) {
      return error.message;
    }
    
    throw error;
  }
}

async function generateVideo(client: Replicate, input: any): Promise<string> {
  const { prompt, image_url, duration } = input;

  log.info('[Replicate] Generating video', { prompt: prompt?.substring(0, 50), has_image: !!image_url });

  try {
    let modelId: string;
    let modelInput: any = {};

    if (image_url) {
      // Image-to-video
      modelId = 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438';
      modelInput = {
        input_image: image_url,
        sizing_strategy: 'maintain_aspect_ratio',
        frames_per_second: 6,
        motion_bucket_id: 127
      };
    } else {
      // Text-to-video (using AnimateDiff or similar)
      modelId = 'lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f';
      modelInput = {
        prompt,
        num_frames: duration ? duration * 8 : 16,
        guidance_scale: 7.5
      };
    }

    const output = await client.run(modelId as any, { input: modelInput });

    const videoUrl = Array.isArray(output) ? output[0] : output;

    log.info('[Replicate] Video generated successfully', { url: videoUrl });

    return `✅ Video generated successfully!\n\nURL: ${videoUrl}\n\nPrompt: ${prompt || 'Image animation'}\nDuration: ~${duration || 3}s`;
  } catch (error: any) {
    log.error('[Replicate] Video generation failed', { error: error.message });
    throw error;
  }
}

async function runModel(client: Replicate, input: any): Promise<string> {
  const { model, input: modelInput } = input;

  log.info('[Replicate] Running custom model', { model });

  try {
    const output = await client.run(model as any, { input: modelInput });

    // Format output based on type
    let formattedOutput: string;

    if (typeof output === 'string') {
      formattedOutput = output;
    } else if (Array.isArray(output)) {
      // Multiple outputs (e.g., multiple images)
      formattedOutput = output.map((item, i) => `Output ${i + 1}: ${item}`).join('\n');
    } else {
      formattedOutput = JSON.stringify(output, null, 2);
    }

    log.info('[Replicate] Model executed successfully', { model });

    return `✅ Model executed successfully!\n\nModel: ${model}\n\nOutput:\n${formattedOutput}`;
  } catch (error: any) {
    log.error('[Replicate] Model execution failed', { error: error.message, model });
    throw error;
  }
}

async function upscaleImage(client: Replicate, input: any): Promise<string> {
  const { image_url, scale = 4 } = input;

  log.info('[Replicate] Upscaling image', { scale });

  try {
    const output = await client.run(
      'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b' as any,
      {
        input: {
          image: image_url,
          scale,
          face_enhance: false
        }
      }
    );

    const upscaledUrl = Array.isArray(output) ? output[0] : output;

    log.info('[Replicate] Image upscaled successfully', { url: upscaledUrl });

    return `✅ Image upscaled ${scale}x!\n\nOriginal: ${image_url}\nUpscaled: ${upscaledUrl}\n\nScale: ${scale}x`;
  } catch (error: any) {
    log.error('[Replicate] Upscaling failed', { error: error.message });
    throw error;
  }
}

async function removeBackground(client: Replicate, input: any): Promise<string> {
  const { image_url } = input;

  log.info('[Replicate] Removing background');

  try {
    const output = await client.run(
      'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003' as any,
      {
        input: {
          image: image_url
        }
      }
    );

    const processedUrl = Array.isArray(output) ? output[0] : output;

    log.info('[Replicate] Background removed successfully', { url: processedUrl });

    return `✅ Background removed!\n\nOriginal: ${image_url}\nProcessed: ${processedUrl}\n\nFormat: PNG with transparency`;
  } catch (error: any) {
    log.error('[Replicate] Background removal failed', { error: error.message });
    throw error;
  }
}
