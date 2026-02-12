import { VoiceHandler, getVoiceHandler } from './voice-handler';
// import { SpeechToText, getSpeechToText } from './speech-to-text'; // TODO: Re-enable when speech-to-text is fixed
import { VoiceChannel, Message } from 'discord.js';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import fs from 'fs';

export interface VoiceConversationConfig {
  autoRespond: boolean;
  ttsVoice: string;
  language: string;
  silenceTimeout: number; // ms
  maxDuration: number; // seconds
}

export interface VoiceMessage {
  userId: string;
  username: string;
  text: string;
  audioPath: string;
  timestamp: Date;
  duration: number;
}

export class VoiceConversation {
  private voiceHandler: VoiceHandler;
  // private stt: SpeechToText; // TODO: Re-enable when speech-to-text is fixed
  private claude: Anthropic;
  private config: VoiceConversationConfig;
  private conversations: Map<string, VoiceMessage[]> = new Map();
  private processingQueue: Map<string, boolean> = new Map();

  constructor(claude: Anthropic, config?: Partial<VoiceConversationConfig>) {
    this.voiceHandler = getVoiceHandler();
    // this.stt = getSpeechToText(); // TODO: Re-enable when speech-to-text is fixed
    this.claude = claude;

    this.config = {
      autoRespond: true,
      ttsVoice: 'Rachel', // ElevenLabs voice
      language: 'pt',
      silenceTimeout: 2000, // 2 seconds of silence
      maxDuration: 300, // 5 minutes max
      ...config
    };

    console.log('[VoiceConversation] ✅ Initialized');
  }

  /**
   * Start voice conversation in a channel
   */
  async start(channel: VoiceChannel, message?: Message): Promise<void> {
    const guildId = channel.guild.id;

    console.log(`[VoiceConversation] 🎙️ Starting conversation in ${channel.name}`);

    // Join voice channel
    await this.voiceHandler.join(channel);

    // Initialize conversation history
    if (!this.conversations.has(guildId)) {
      this.conversations.set(guildId, []);
    }

    // Send confirmation message
    if (message) {
      await message.reply({
        content: '🎤 **Entrei no canal de voz!**\n\n✅ Agora posso ouvir e responder por voz.\n💬 Fale algo e eu vou responder!',
        embeds: [{
          title: '🗣️ Voice Conversation Active',
          description: 'Estou escutando tudo que você fala e vou responder por voz!',
          color: 0x00FF00,
          fields: [
            { name: '🎤 Status', value: 'Listening', inline: true },
            { name: '🔊 TTS Voice', value: this.config.ttsVoice, inline: true },
            { name: '🌍 Language', value: this.config.language === 'pt' ? 'Português' : 'English', inline: true }
          ],
          footer: { text: 'Use "sair do canal" para me desconectar' }
        }]
      });
    }

    // Start processing loop
    this.startProcessingLoop(guildId);
  }

  /**
   * Process recorded audio in a loop
   */
  private async startProcessingLoop(guildId: string): Promise<void> {
    console.log('[VoiceConversation] 🔄 Starting audio processing loop...');

    // Check for new recordings every 3 seconds
    const interval = setInterval(async () => {
      // Check if still connected
      if (!this.voiceHandler.isConnected(guildId)) {
        console.log('[VoiceConversation] ⏹️ Voice disconnected, stopping loop');
        clearInterval(interval);
        return;
      }

      // Process pending recordings
      await this.processNewRecordings(guildId);
    }, 3000);
  }

  /**
   * Process new audio recordings
   */
  private async processNewRecordings(guildId: string): Promise<void> {
    // Get all users with recordings
    const recordings = this.voiceHandler.getRecordings('*'); // Would need to implement
    
    // For now, we'll process on-demand via command
    // In a real implementation, you'd monitor the recordings directory
  }

  /**
   * Process a single audio file and respond
   */
  async processAudio(
    guildId: string,
    userId: string,
    username: string,
    audioPath: string
  ): Promise<string> {
    // Check if already processing
    const key = `${guildId}-${userId}`;
    if (this.processingQueue.get(key)) {
      console.log('[VoiceConversation] ⚠️ Already processing audio for this user');
      return '';
    }

    this.processingQueue.set(key, true);

    try {
      console.log(`[VoiceConversation] 🎤 Processing audio from ${username}`);

      // Step 1: Convert PCM to WAV (if needed)
      const wavPath = await this.convertToWav(audioPath);

      // Step 2: Transcribe audio (STT)
      console.log('[VoiceConversation] 📝 Transcribing audio...');
      // TODO: Re-enable when speech-to-text is fixed
      /*
      const transcription = await this.stt.transcribe(wavPath, {
        language: this.config.language
      });
      */
      const transcription = { text: "Speech-to-text temporarily disabled", duration: 0 };

      console.log(`[VoiceConversation] 💬 User said: "${transcription.text}"`);

      // Store message
      const voiceMessage: VoiceMessage = {
        userId,
        username,
        text: transcription.text,
        audioPath,
        timestamp: new Date(),
        duration: transcription.duration
      };

      const history = this.conversations.get(guildId) || [];
      history.push(voiceMessage);
      this.conversations.set(guildId, history);

      // Step 3: Generate response with Claude
      console.log('[VoiceConversation] 🤖 Generating response...');
      const response = await this.generateResponse(guildId, transcription.text);

      console.log(`[VoiceConversation] 💭 Response: "${response}"`);

      // Step 4: Generate TTS audio
      console.log('[VoiceConversation] 🔊 Generating TTS...');
      const ttsPath = await this.generateTTS(response, guildId);

      // Step 5: Play response in voice channel
      console.log('[VoiceConversation] 📢 Playing response in voice...');
      await this.voiceHandler.play(guildId, ttsPath);

      console.log('[VoiceConversation] ✅ Voice conversation complete!');

      return response;

    } catch (error: any) {
      console.error('[VoiceConversation] ❌ Error processing audio:', error.message);
      throw error;
    } finally {
      this.processingQueue.delete(key);
    }
  }

  /**
   * Convert PCM to WAV format
   */
  private async convertToWav(pcmPath: string): Promise<string> {
    // If already WAV, return as-is
    if (pcmPath.endsWith('.wav') || pcmPath.endsWith('.mp3')) {
      return pcmPath;
    }

    const ffmpeg = require('fluent-ffmpeg');
    const wavPath = pcmPath.replace('.pcm', '.wav');

    return new Promise((resolve, reject) => {
      ffmpeg(pcmPath)
        .inputFormat('s16le')
        .audioFrequency(48000)
        .audioChannels(2)
        .toFormat('wav')
        .save(wavPath)
        .on('end', () => {
          console.log('[VoiceConversation] ✅ Converted PCM to WAV');
          resolve(wavPath);
        })
        .on('error', (err: any) => {
          console.error('[VoiceConversation] ❌ FFmpeg conversion failed:', err);
          reject(err);
        });
    });
  }

  /**
   * Generate response using Claude
   */
  private async generateResponse(guildId: string, userMessage: string): Promise<string> {
    // Get conversation history
    const history = this.conversations.get(guildId) || [];
    const recentHistory = history.slice(-5); // Last 5 messages

    // Build context
    const contextMessages = recentHistory.map(msg => 
      `${msg.username}: ${msg.text}`
    ).join('\n');

    // Call Claude
    const response = await this.claude.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 500, // Keep responses concise for voice
      messages: [{
        role: 'user',
        content: `Você está em uma conversa de voz no Discord. Responda de forma natural e conversacional.

Histórico recente:
${contextMessages}

Usuário: ${userMessage}

Responda de forma direta e natural (máximo 2-3 frases). Você vai falar esta resposta em voz alta.`
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return content.text;
  }

  /**
   * Generate TTS audio using ElevenLabs
   */
  private async generateTTS(text: string, guildId: string): Promise<string> {
    const ElevenLabsClient = require('elevenlabs').ElevenLabsClient;
    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

    const timestamp = Date.now();
    const filename = `tts-${guildId}-${timestamp}.mp3`;
    const outputPath = path.join('./data/recordings', filename);

    console.log('[VoiceConversation] 🎵 Generating TTS audio...');

    const audio = await client.textToSpeech.convert(this.config.ttsVoice, {
      text,
      model_id: 'eleven_multilingual_v2'
    });

    // Write audio to file
    const chunks: Uint8Array[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(outputPath, buffer);

    console.log(`[VoiceConversation] ✅ TTS saved: ${filename}`);

    return outputPath;
  }

  /**
   * Stop voice conversation
   */
  async stop(guildId: string): Promise<void> {
    console.log('[VoiceConversation] 🛑 Stopping conversation');

    // Leave voice channel
    this.voiceHandler.leave(guildId);

    // Clear conversation history
    this.conversations.delete(guildId);

    console.log('[VoiceConversation] ✅ Conversation stopped');
  }

  /**
   * Get conversation history
   */
  getHistory(guildId: string): VoiceMessage[] {
    return this.conversations.get(guildId) || [];
  }

  /**
   * Clear conversation history
   */
  clearHistory(guildId: string): void {
    this.conversations.delete(guildId);
    console.log('[VoiceConversation] 🗑️ History cleared');
  }

  /**
   * Get conversation statistics
   */
  getStats(guildId: string): {
    messageCount: number;
    totalDuration: number;
    participants: string[];
  } {
    const history = this.conversations.get(guildId) || [];
    
    const participants = new Set(history.map(msg => msg.username));
    const totalDuration = history.reduce((sum, msg) => sum + msg.duration, 0);

    return {
      messageCount: history.length,
      totalDuration,
      participants: Array.from(participants)
    };
  }
}

/**
 * Singleton instance
 */
let instance: VoiceConversation | null = null;

export function getVoiceConversation(claude: Anthropic): VoiceConversation {
  if (!instance) {
    instance = new VoiceConversation(claude);
  }
  return instance;
}
