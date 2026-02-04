"use strict";
/**
 * Text-to-Speech Generator using ElevenLabs
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ttsGenerator = void 0;
const logger_1 = require("../logger");
const axios_1 = __importDefault(require("axios"));
class TTSGenerator {
    elevenLabsApiKey;
    defaultVoice = 'EXAVITQu4vr4xnSDxMaL'; // Sarah
    constructor() {
        this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    }
    async generateSpeech(text, options = {}) {
        if (!this.elevenLabsApiKey) {
            throw new Error('ELEVENLABS_API_KEY not configured');
        }
        const voice = options.voice || this.defaultVoice;
        try {
            logger_1.log.info('[TTS] Generating speech', { textLength: text.length });
            const response = await axios_1.default.post(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`, {
                text: text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: options.stability ?? 0.5,
                    similarity_boost: options.similarityBoost ?? 0.75
                }
            }, {
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': this.elevenLabsApiKey,
                    'Content-Type': 'application/json'
                },
                responseType: 'stream',
                timeout: 30000
            });
            return response.data;
        }
        catch (error) {
            logger_1.log.error('[TTS] Generation failed', { error: error.message });
            throw error;
        }
    }
    getVoices() {
        return {
            'sarah': 'EXAVITQu4vr4xnSDxMaL',
            'rachel': '21m00Tcm4TlvDq8ikWAM',
            'antoni': 'ErXwobaYiN019PkySvjV',
            'josh': 'TxGEqnHWrfWFTfGW9XjX',
            'adam': 'pNInz6obpgDQGcFmaJgB'
        };
    }
}
exports.ttsGenerator = new TTSGenerator();
