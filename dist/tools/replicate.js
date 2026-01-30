"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPLICATE_TOOLS = void 0;
exports.executeReplicateTool = executeReplicateTool;
const replicate_1 = __importDefault(require("replicate"));
const logger_1 = require("../logger");
/**
 * Replicate Tools - Image, Video, and Model Generation
 *
 * Popular models:
 * - SDXL: stability-ai/sdxl
 * - Stable Video: stability-ai/stable-video-diffusion
 * - Flux: black-forest-labs/flux-schnell
 * - Llama 3: meta/llama-3-70b-instruct
 * - And hundreds more...
 */
let replicateClient = null;
function getReplicateClient() {
    if (!replicateClient) {
        const apiToken = process.env.REPLICATE_API_TOKEN;
        if (!apiToken) {
            throw new Error('REPLICATE_API_TOKEN not configured');
        }
        replicateClient = new replicate_1.default({ auth: apiToken });
    }
    return replicateClient;
}
exports.REPLICATE_TOOLS = [
    {
        name: 'replicate_generate_image',
        description: `Generate images using AI models via Replicate.

Supports multiple models:
- SDXL (high quality, realistic)
- Flux Schnell (very fast)
- Stable Diffusion (classic)
- And more...

Examples:
- "Generate: a cat wearing sunglasses"
- "Create an image of a futuristic city"
- "Draw a landscape with mountains"

The tool will return a URL to the generated image.`,
        input_schema: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'Description of the image to generate'
                },
                model: {
                    type: 'string',
                    description: 'Model to use (default: flux-schnell for speed)',
                    enum: ['flux-schnell', 'sdxl', 'stable-diffusion']
                },
                aspect_ratio: {
                    type: 'string',
                    description: 'Image aspect ratio (default: 1:1)',
                    enum: ['1:1', '16:9', '9:16', '4:3', '3:4']
                },
                negative_prompt: {
                    type: 'string',
                    description: 'What to avoid in the image'
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
async function executeReplicateTool(toolName, input) {
    try {
        const client = getReplicateClient();
        switch (toolName) {
            case 'replicate_generate_image':
                return await generateImage(client, input);
            case 'replicate_generate_video':
                return await generateVideo(client, input);
            case 'replicate_run_model':
                return await runModel(client, input);
            case 'replicate_upscale_image':
                return await upscaleImage(client, input);
            case 'replicate_remove_background':
                return await removeBackground(client, input);
            default:
                return `Unknown Replicate tool: ${toolName}`;
        }
    }
    catch (error) {
        logger_1.log.error(`[Replicate] Tool execution failed: ${toolName}`, { error: error.message });
        return `Error: ${error.message}`;
    }
}
async function generateImage(client, input) {
    const { prompt, model = 'flux-schnell', aspect_ratio = '1:1', negative_prompt } = input;
    logger_1.log.info('[Replicate] Generating image', { model, prompt: prompt.substring(0, 50) });
    try {
        let modelId;
        let modelInput = {
            prompt,
            aspect_ratio
        };
        // Select model
        switch (model) {
            case 'flux-schnell':
                modelId = 'black-forest-labs/flux-schnell';
                break;
            case 'sdxl':
                modelId = 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
                modelInput = { ...modelInput, width: 1024, height: 1024 };
                if (negative_prompt)
                    modelInput.negative_prompt = negative_prompt;
                break;
            case 'stable-diffusion':
                modelId = 'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf';
                if (negative_prompt)
                    modelInput.negative_prompt = negative_prompt;
                break;
            default:
                modelId = 'black-forest-labs/flux-schnell';
        }
        const output = await client.run(modelId, { input: modelInput });
        // Output can be array or single URL
        const imageUrl = Array.isArray(output) ? output[0] : output;
        logger_1.log.info('[Replicate] Image generated successfully', { url: imageUrl });
        return `✅ Image generated successfully!\n\nURL: ${imageUrl}\n\nPrompt: ${prompt}\nModel: ${model}`;
    }
    catch (error) {
        logger_1.log.error('[Replicate] Image generation failed', { error: error.message });
        throw error;
    }
}
async function generateVideo(client, input) {
    const { prompt, image_url, duration } = input;
    logger_1.log.info('[Replicate] Generating video', { prompt: prompt?.substring(0, 50), has_image: !!image_url });
    try {
        let modelId;
        let modelInput = {};
        if (image_url) {
            // Image-to-video
            modelId = 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438';
            modelInput = {
                input_image: image_url,
                sizing_strategy: 'maintain_aspect_ratio',
                frames_per_second: 6,
                motion_bucket_id: 127
            };
        }
        else {
            // Text-to-video (using AnimateDiff or similar)
            modelId = 'lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f';
            modelInput = {
                prompt,
                num_frames: duration ? duration * 8 : 16,
                guidance_scale: 7.5
            };
        }
        const output = await client.run(modelId, { input: modelInput });
        const videoUrl = Array.isArray(output) ? output[0] : output;
        logger_1.log.info('[Replicate] Video generated successfully', { url: videoUrl });
        return `✅ Video generated successfully!\n\nURL: ${videoUrl}\n\nPrompt: ${prompt || 'Image animation'}\nDuration: ~${duration || 3}s`;
    }
    catch (error) {
        logger_1.log.error('[Replicate] Video generation failed', { error: error.message });
        throw error;
    }
}
async function runModel(client, input) {
    const { model, input: modelInput } = input;
    logger_1.log.info('[Replicate] Running custom model', { model });
    try {
        const output = await client.run(model, { input: modelInput });
        // Format output based on type
        let formattedOutput;
        if (typeof output === 'string') {
            formattedOutput = output;
        }
        else if (Array.isArray(output)) {
            // Multiple outputs (e.g., multiple images)
            formattedOutput = output.map((item, i) => `Output ${i + 1}: ${item}`).join('\n');
        }
        else {
            formattedOutput = JSON.stringify(output, null, 2);
        }
        logger_1.log.info('[Replicate] Model executed successfully', { model });
        return `✅ Model executed successfully!\n\nModel: ${model}\n\nOutput:\n${formattedOutput}`;
    }
    catch (error) {
        logger_1.log.error('[Replicate] Model execution failed', { error: error.message, model });
        throw error;
    }
}
async function upscaleImage(client, input) {
    const { image_url, scale = 4 } = input;
    logger_1.log.info('[Replicate] Upscaling image', { scale });
    try {
        const output = await client.run('nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b', {
            input: {
                image: image_url,
                scale,
                face_enhance: false
            }
        });
        const upscaledUrl = Array.isArray(output) ? output[0] : output;
        logger_1.log.info('[Replicate] Image upscaled successfully', { url: upscaledUrl });
        return `✅ Image upscaled ${scale}x!\n\nOriginal: ${image_url}\nUpscaled: ${upscaledUrl}\n\nScale: ${scale}x`;
    }
    catch (error) {
        logger_1.log.error('[Replicate] Upscaling failed', { error: error.message });
        throw error;
    }
}
async function removeBackground(client, input) {
    const { image_url } = input;
    logger_1.log.info('[Replicate] Removing background');
    try {
        const output = await client.run('cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003', {
            input: {
                image: image_url
            }
        });
        const processedUrl = Array.isArray(output) ? output[0] : output;
        logger_1.log.info('[Replicate] Background removed successfully', { url: processedUrl });
        return `✅ Background removed!\n\nOriginal: ${image_url}\nProcessed: ${processedUrl}\n\nFormat: PNG with transparency`;
    }
    catch (error) {
        logger_1.log.error('[Replicate] Background removal failed', { error: error.message });
        throw error;
    }
}
