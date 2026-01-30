import Anthropic from '@anthropic-ai/sdk';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { log } from '../logger';
import fs from 'fs';
import path from 'path';

/**
 * ElevenLabs Tools - Text-to-Speech and Voice Cloning
 *
 * Features:
 * - High-quality TTS
 * - Multiple voices
 * - Voice cloning
 * - Multi-language support
 */

let elevenLabsClient: ElevenLabsClient | null = null;

function getElevenLabsClient(): ElevenLabsClient {
  if (!elevenLabsClient) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }
    elevenLabsClient = new ElevenLabsClient({ apiKey });
  }
  return elevenLabsClient;
}

export const ELEVENLABS_TOOLS: Anthropic.Tool[] = [
  {
    name: 'elevenlabs_text_to_speech',
    description: `Convert text to natural-sounding speech using AI voices.

Perfect for:
- Creating voiceovers
- Audio content
- Accessibility
- Language learning

Examples:
- text="Hello, how are you today?"
- text="Welcome to our podcast", voice="adam"
- text="Olá, como está?", voice="matilda"

Returns URL to generated audio file (MP3).`,
    input_schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to convert to speech'
        },
        voice: {
          type: 'string',
          description: 'Voice to use (default: rachel)',
          enum: ['rachel', 'adam', 'arnold', 'bella', 'domi', 'elli', 'josh', 'matilda', 'sam']
        },
        model: {
          type: 'string',
          description: 'TTS model (default: eleven_multilingual_v2)',
          enum: ['eleven_multilingual_v2', 'eleven_monolingual_v1', 'eleven_turbo_v2']
        }
      },
      required: ['text']
    }
  },
  {
    name: 'elevenlabs_list_voices',
    description: `List all available voices in your ElevenLabs account.

Shows:
- Voice name
- Voice ID
- Language
- Description

Useful to discover available voices before generating speech.`,
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'elevenlabs_get_voice_info',
    description: `Get detailed information about a specific voice.

Examples:
- voice_id="21m00Tcm4TlvDq8ikWAM" (Rachel)
- voice_name="adam"

Returns voice details including settings and samples.`,
    input_schema: {
      type: 'object',
      properties: {
        voice_id: {
          type: 'string',
          description: 'Voice ID or name'
        }
      },
      required: ['voice_id']
    }
  }
];

// Voice ID mapping (popular voices)
const VOICE_MAP: Record<string, string> = {
  'rachel': '21m00Tcm4TlvDq8ikWAM',
  'adam': 'pNInz6obpgDQGcFmaJgB',
  'arnold': 'VR6AewLTigWG4xSOukaG',
  'bella': 'EXAVITQu4vr4xnSDxMaL',
  'domi': 'AZnzlk1XvdvUeBnXmlld',
  'elli': 'MF3mGyEYCl7XYWbV9V6O',
  'josh': 'TxGEqnHWrfWFTfGW9XjX',
  'matilda': 'XrExE9yKIg1WjnnlVkGX',
  'sam': 'yoZ06aMxZJJ28mfd3POQ'
};

export async function executeElevenLabsTool(toolName: string, input: any): Promise<string> {
  try {
    const client = getElevenLabsClient();

    switch (toolName) {
      case 'elevenlabs_text_to_speech':
        return await textToSpeech(client, input);
      case 'elevenlabs_list_voices':
        return await listVoices(client);
      case 'elevenlabs_get_voice_info':
        return await getVoiceInfo(client, input);
      default:
        return `Unknown ElevenLabs tool: ${toolName}`;
    }
  } catch (error: any) {
    log.error(`[ElevenLabs] Tool execution failed: ${toolName}`, { error: error.message });
    return `Error: ${error.message}`;
  }
}

async function textToSpeech(client: ElevenLabsClient, input: any): Promise<string> {
  const {
    text,
    voice = 'rachel',
    model = 'eleven_multilingual_v2'
  } = input;

  // Get voice ID
  const voiceId = VOICE_MAP[voice.toLowerCase()] || voice;

  log.info('[ElevenLabs] Generating speech', {
    voice,
    textLength: text.length,
    model
  });

  try {
    // Generate speech
    const audio = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: model
    });

    // Save to temporary file
    const outputDir = path.join(process.env.DATA_DIR || './data', 'audio');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `tts_${timestamp}.mp3`;
    const filepath = path.join(outputDir, filename);

    // Write audio stream to file
    const chunks: Uint8Array[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));
    fs.writeFileSync(filepath, buffer);

    const fileSize = (buffer.length / 1024).toFixed(2);

    log.info('[ElevenLabs] Speech generated successfully', {
      filepath,
      size: `${fileSize}KB`
    });

    return `✅ Audio generated successfully!\n\nFile: ${filepath}\nSize: ${fileSize}KB\nVoice: ${voice}\nModel: ${model}\n\nText: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`;
  } catch (error: any) {
    log.error('[ElevenLabs] Speech generation failed', { error: error.message });
    throw error;
  }
}

async function listVoices(client: ElevenLabsClient): Promise<string> {
  log.info('[ElevenLabs] Listing voices');

  try {
    const response = await client.voices.getAll();
    const voices = response.voices || [];

    if (voices.length === 0) {
      return 'No voices available in your account.';
    }

    const voiceList = voices.map((voice: any) => {
      return `• ${voice.name} (${voice.voiceId})\n  Category: ${voice.category || 'N/A'}\n  Language: ${voice.labels?.language || 'Multiple'}`;
    }).join('\n\n');

    log.info('[ElevenLabs] Listed voices', { count: voices.length });

    return `Available Voices (${voices.length}):\n\n${voiceList}`;
  } catch (error: any) {
    log.error('[ElevenLabs] Failed to list voices', { error: error.message });
    throw error;
  }
}

async function getVoiceInfo(client: ElevenLabsClient, input: any): Promise<string> {
  const { voice_id } = input;

  // Check if it's a name, convert to ID
  const voiceId = VOICE_MAP[voice_id.toLowerCase()] || voice_id;

  log.info('[ElevenLabs] Getting voice info', { voiceId });

  try {
    const voice = await client.voices.get(voiceId);

    const info = `
Voice Information:

Name: ${voice.name}
ID: ${voice.voiceId}
Category: ${voice.category || 'N/A'}
Description: ${voice.description || 'No description'}

Settings:
- Stability: ${voice.settings?.stability || 'N/A'}
- Similarity Boost: ${voice.settings?.similarityBoost || 'N/A'}

Labels:
${voice.labels ? Object.entries(voice.labels).map(([k, v]) => `- ${k}: ${v}`).join('\n') : 'None'}
`.trim();

    log.info('[ElevenLabs] Retrieved voice info', { name: voice.name });

    return info;
  } catch (error: any) {
    log.error('[ElevenLabs] Failed to get voice info', { error: error.message });
    throw error;
  }
}
