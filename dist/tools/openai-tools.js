"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPENAI_TOOLS = void 0;
exports.executeOpenAITool = executeOpenAITool;
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../logger");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
/**
 * OpenAI Tools - GPT, DALL-E, Whisper, and more
 *
 * Features:
 * - GPT-4 for complex reasoning
 * - DALL-E for image generation
 * - Whisper for speech-to-text
 * - Vision for image understanding
 */
let openaiClient = null;
function getOpenAIClient() {
    if (!openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY not configured');
        }
        openaiClient = new openai_1.default({ apiKey });
    }
    return openaiClient;
}
exports.OPENAI_TOOLS = [
    {
        name: 'openai_generate_image',
        description: `Generate images using DALL-E 3 or DALL-E 2.

DALL-E 3: Best quality, most accurate
DALL-E 2: Faster, cheaper

Examples:
- "A cat wearing a astronaut suit"
- "Abstract art with vibrant colors"
- "Photo of a coffee shop interior"

Returns URL to generated image.`,
        input_schema: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'Description of the image to generate'
                },
                model: {
                    type: 'string',
                    description: 'DALL-E model to use (default: dall-e-3)',
                    enum: ['dall-e-3', 'dall-e-2']
                },
                size: {
                    type: 'string',
                    description: 'Image size (default: 1024x1024)',
                    enum: ['1024x1024', '1024x1792', '1792x1024', '256x256', '512x512']
                },
                quality: {
                    type: 'string',
                    description: 'Quality for DALL-E 3 (default: standard)',
                    enum: ['standard', 'hd']
                }
            },
            required: ['prompt']
        }
    },
    {
        name: 'openai_gpt_chat',
        description: `Use GPT-4 or GPT-3.5 for complex reasoning, creative writing, or specialized tasks.

Useful when:
- Need different perspective than Claude
- Specific GPT capabilities
- Compare responses

Examples:
- prompt="Explain quantum physics simply"
- prompt="Write a poem about the ocean", model="gpt-4"

Returns GPT response.`,
        input_schema: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'Prompt for GPT'
                },
                model: {
                    type: 'string',
                    description: 'GPT model (default: gpt-4-turbo)',
                    enum: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
                },
                max_tokens: {
                    type: 'number',
                    description: 'Maximum response length (default: 1000)'
                },
                temperature: {
                    type: 'number',
                    description: 'Creativity (0-2, default: 0.7)'
                }
            },
            required: ['prompt']
        }
    },
    {
        name: 'openai_transcribe_audio',
        description: `Convert audio/video to text using Whisper.

Supports:
- MP3, MP4, WAV, M4A, and more
- Multiple languages
- Automatic language detection
- High accuracy

Examples:
- file_url="https://example.com/audio.mp3"
- file_path="/path/to/audio.wav"

Returns transcribed text.`,
        input_schema: {
            type: 'object',
            properties: {
                file_url: {
                    type: 'string',
                    description: 'URL of audio file to transcribe'
                },
                file_path: {
                    type: 'string',
                    description: 'Local path to audio file'
                },
                language: {
                    type: 'string',
                    description: 'Language code (optional, auto-detected if not provided)'
                }
            }
        }
    },
    {
        name: 'openai_analyze_image',
        description: `Analyze and describe images using GPT-4 Vision.

Can answer questions about images:
- "What's in this image?"
- "Describe the scene"
- "Read text from this image"
- "Is there a dog in this photo?"

Examples:
- image_url="https://example.com/photo.jpg", prompt="What's happening?"
- image_url="...", prompt="Describe in detail"

Returns analysis from GPT-4 Vision.`,
        input_schema: {
            type: 'object',
            properties: {
                image_url: {
                    type: 'string',
                    description: 'URL of the image to analyze'
                },
                prompt: {
                    type: 'string',
                    description: 'Question or instruction about the image (default: "Describe this image")'
                }
            },
            required: ['image_url']
        }
    }
];
async function executeOpenAITool(toolName, input) {
    try {
        const client = getOpenAIClient();
        switch (toolName) {
            case 'openai_generate_image':
                return await generateImage(client, input);
            case 'openai_gpt_chat':
                return await gptChat(client, input);
            case 'openai_transcribe_audio':
                return await transcribeAudio(client, input);
            case 'openai_analyze_image':
                return await analyzeImage(client, input);
            default:
                return `Unknown OpenAI tool: ${toolName}`;
        }
    }
    catch (error) {
        logger_1.log.error(`[OpenAI] Tool execution failed: ${toolName}`, { error: error.message });
        return `Error: ${error.message}`;
    }
}
async function generateImage(client, input) {
    const { prompt, model = 'dall-e-3', size = '1024x1024', quality = 'standard' } = input;
    logger_1.log.info('[OpenAI] Generating image with DALL-E', { model, size });
    try {
        const response = await client.images.generate({
            model,
            prompt,
            size: size,
            quality: model === 'dall-e-3' ? quality : undefined,
            n: 1
        });
        const imageUrl = response.data?.[0]?.url;
        if (!imageUrl) {
            throw new Error('No image URL returned');
        }
        logger_1.log.info('[OpenAI] Image generated successfully', { url: imageUrl });
        return `✅ Image generated with ${model.toUpperCase()}!\n\nURL: ${imageUrl}\n\nPrompt: ${prompt}\nSize: ${size}\nQuality: ${quality}`;
    }
    catch (error) {
        logger_1.log.error('[OpenAI] Image generation failed', { error: error.message });
        throw error;
    }
}
async function gptChat(client, input) {
    const { prompt, model = 'gpt-4-turbo', max_tokens = 1000, temperature = 0.7 } = input;
    logger_1.log.info('[OpenAI] Calling GPT', { model, promptLength: prompt.length });
    try {
        const response = await client.chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens,
            temperature
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from GPT');
        }
        logger_1.log.info('[OpenAI] GPT response received', {
            model,
            tokensUsed: response.usage?.total_tokens
        });
        return `GPT-${model} Response:\n\n${content}\n\n---\nTokens used: ${response.usage?.total_tokens || 'N/A'}`;
    }
    catch (error) {
        logger_1.log.error('[OpenAI] GPT call failed', { error: error.message });
        throw error;
    }
}
async function transcribeAudio(client, input) {
    const { file_url, file_path, language } = input;
    logger_1.log.info('[OpenAI] Transcribing audio with Whisper');
    try {
        let audioFile;
        if (file_path) {
            // Local file
            const buffer = fs_1.default.readFileSync(file_path);
            const filename = path_1.default.basename(file_path);
            audioFile = new File([buffer], filename);
        }
        else if (file_url) {
            // Download from URL
            const response = await axios_1.default.get(file_url, { responseType: 'arraybuffer' });
            const data = response?.data;
            if (!data) {
                throw new Error('Failed to download audio file');
            }
            const filename = file_url.split('/').pop() || 'audio.mp3';
            audioFile = new File([data], filename);
        }
        else {
            throw new Error('Either file_url or file_path must be provided');
        }
        const transcription = await client.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: language || undefined
        });
        logger_1.log.info('[OpenAI] Audio transcribed successfully', {
            textLength: transcription.text.length
        });
        return `✅ Audio transcribed successfully!\n\nTranscription:\n${transcription.text}\n\n---\nLanguage: ${language || 'auto-detected'}`;
    }
    catch (error) {
        logger_1.log.error('[OpenAI] Transcription failed', { error: error.message });
        throw error;
    }
}
async function analyzeImage(client, input) {
    const { image_url, prompt = 'Describe this image in detail' } = input;
    logger_1.log.info('[OpenAI] Analyzing image with GPT-4 Vision');
    try {
        const response = await client.chat.completions.create({
            model: 'gpt-4-vision-preview',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: image_url } }
                    ]
                }
            ],
            max_tokens: 500
        });
        const analysis = response.choices[0]?.message?.content;
        if (!analysis) {
            throw new Error('No analysis returned');
        }
        logger_1.log.info('[OpenAI] Image analyzed successfully');
        return `✅ Image Analysis:\n\n${analysis}\n\n---\nImage: ${image_url}`;
    }
    catch (error) {
        logger_1.log.error('[OpenAI] Image analysis failed', { error: error.message });
        throw error;
    }
}
