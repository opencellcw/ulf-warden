/**
 * Text-to-Speech Generator using ElevenLabs
 */

import { Readable } from 'stream';
import { log } from '../logger';
import axios from 'axios';

interface TTSOptions {
  voice?: string;
  stability?: number;
  similarityBoost?: number;
}

class TTSGenerator {
  private elevenLabsApiKey?: string;
  private defaultVoice = 'EXAVITQu4vr4xnSDxMaL'; // Sarah

  constructor() {
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  }

  async generateSpeech(text: string, options: TTSOptions = {}): Promise<Readable> {
    if (!this.elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const voice = options.voice || this.defaultVoice;

    try {
      log.info('[TTS] Generating speech', { textLength: text.length });

      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`,
        {
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: options.stability ?? 0.5,
            similarity_boost: options.similarityBoost ?? 0.75
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': this.elevenLabsApiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'stream',
          timeout: 30000
        }
      );

      return response.data as Readable;
    } catch (error: any) {
      log.error('[TTS] Generation failed', { error: error.message });
      throw error;
    }
  }

  getVoices(): { [key: string]: string } {
    return {
      'sarah': 'EXAVITQu4vr4xnSDxMaL',
      'rachel': '21m00Tcm4TlvDq8ikWAM',
      'antoni': 'ErXwobaYiN019PkySvjV',
      'josh': 'TxGEqnHWrfWFTfGW9XjX',
      'adam': 'pNInz6obpgDQGcFmaJgB'
    };
  }
}

export const ttsGenerator = new TTSGenerator();
