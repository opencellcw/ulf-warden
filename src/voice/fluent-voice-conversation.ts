/**
 * Fluent Voice Conversation System
 * 
 * Bot entra no canal de voz e mantém conversa fluida:
 * 1. Detecta automaticamente quando você para de falar (VAD)
 * 2. Transcreve sua fala (Whisper via Groq)
 * 3. Processa com Claude
 * 4. Responde em voz (ElevenLabs TTS)
 * 5. Continua ouvindo automaticamente (loop)
 * 
 * = CONVERSA NATURAL E FLUIDA! 🎤
 */

import {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
  VoiceConnection,
  AudioPlayer,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  EndBehaviorType
} from '@discordjs/voice';
import { VoiceChannel, Message, TextChannel } from 'discord.js';
import Anthropic from '@anthropic-ai/sdk';
// import { getSpeechToText } from './speech-to-text'; // TODO: Re-enable when speech-to-text is fixed
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import prism from 'prism-media';

const pipelineAsync = promisify(pipeline);

export interface FluentVoiceConfig {
  language: string;
  ttsVoice: string;
  vadSensitivity: number; // 0-1 (higher = more sensitive)
  responseDelay: number; // ms to wait before responding
}

export class FluentVoiceConversation {
  private connection: VoiceConnection | null = null;
  private player: AudioPlayer | null = null;
  private claude: Anthropic;
  // private stt = getSpeechToText(); // TODO: Re-enable when speech-to-text is fixed
  private isActive: boolean = false;
  private guildId: string = '';
  private textChannel: TextChannel | null = null;
  private recordingsDir: string;
  private conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = [];
  
  private config: FluentVoiceConfig = {
    language: 'pt',
    ttsVoice: 'Rachel',
    vadSensitivity: 0.6,
    responseDelay: 500 // 0.5s delay before responding
  };

  constructor(claude: Anthropic, config?: Partial<FluentVoiceConfig>) {
    this.claude = claude;
    this.config = { ...this.config, ...config };
    this.recordingsDir = './data/voice-recordings';
    
    // Ensure directory exists
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }

    console.log('[FluentVoice] ✅ Initialized');
  }

  /**
   * Start fluent voice conversation
   */
  async start(channel: VoiceChannel, message?: Message): Promise<void> {
    if (this.isActive) {
      throw new Error('Voice conversation already active');
    }

    this.guildId = channel.guild.id;
    this.textChannel = message?.channel as TextChannel || null;

    console.log(`[FluentVoice] 🎙️ Starting fluent conversation in ${channel.name}`);

    // Send initial message
    if (message) {
      await message.reply({
        embeds: [{
          title: '🎤 Voice Conversation Started!',
          description: '**Agora temos uma conversa fluida!**\n\n✅ Fale normalmente, eu vou ouvir\n✅ Quando você parar de falar, eu processo\n✅ E respondo automaticamente por voz!\n\n**Funciona como uma conversa real!** 🗣️',
          color: 0x00FF00,
          fields: [
            { name: '🎧 Status', value: 'Listening', inline: true },
            { name: '🌍 Language', value: this.config.language === 'pt' ? '🇧🇷 Português' : '🇺🇸 English', inline: true },
            { name: '🔊 Voice', value: this.config.ttsVoice, inline: true }
          ],
          footer: { text: 'Diga "sair do canal" para eu desconectar' }
        }]
      });
    }

    // Join voice channel
    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator as any,
      selfDeaf: false, // Must be false to hear users
      selfMute: false
    });

    // Wait for ready
    await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
    console.log('[FluentVoice] ✅ Connected to voice channel');

    // Create audio player
    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
    });
    this.connection.subscribe(this.player);

    // Start listening to users
    this.isActive = true;
    this.startListening();

    console.log('[FluentVoice] 🎧 Now listening... speak naturally!');
  }

  /**
   * Listen to users speaking and respond automatically
   */
  private startListening(): void {
    if (!this.connection) return;

    const receiver = this.connection.receiver;

    // Listen for users starting to speak
    receiver.speaking.on('start', async (userId) => {
      console.log(`[FluentVoice] 🎤 User ${userId} started speaking`);

      // Subscribe to user's audio stream
      const audioStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 1000 // 1 second of silence = end
        }
      });

      // Process this audio
      await this.processUserAudio(userId, audioStream);
    });
  }

  /**
   * Process user audio stream (STT + LLM + TTS)
   */
  private async processUserAudio(userId: string, audioStream: any): Promise<void> {
    try {
      const timestamp = Date.now();
      const pcmPath = path.join(this.recordingsDir, `${userId}-${timestamp}.pcm`);
      const wavPath = path.join(this.recordingsDir, `${userId}-${timestamp}.wav`);

      console.log('[FluentVoice] 📼 Recording audio...');

      // Decode opus to PCM
      const opusDecoder = new prism.opus.Decoder({
        rate: 48000,
        channels: 2,
        frameSize: 960
      });

      // Save to PCM file
      await pipelineAsync(audioStream, opusDecoder, fs.createWriteStream(pcmPath));
      
      console.log('[FluentVoice] ✅ Audio recorded');

      // Convert PCM to WAV (for Whisper)
      await this.convertPCMtoWAV(pcmPath, wavPath);

      // Delete PCM (don't need anymore)
      fs.unlinkSync(pcmPath);

      // Transcribe (STT)
      console.log('[FluentVoice] 📝 Transcribing...');
      // TODO: Re-enable when speech-to-text is fixed
      /*
      const transcription = await this.stt.transcribe(wavPath, {
        language: this.config.language
      });
      */
      const userText = "Speech-to-text temporarily disabled"; // transcription.text.trim();
      
      if (!userText || userText.length < 3) {
        console.log('[FluentVoice] ⚠️ No speech detected, ignoring');
        fs.unlinkSync(wavPath);
        return;
      }

      console.log(`[FluentVoice] 💬 User said: "${userText}"`);

      // Send to text channel
      if (this.textChannel) {
        await this.textChannel.send(`🎤 **User:** ${userText}`);
      }

      // Add to history
      this.conversationHistory.push({
        role: 'user',
        content: userText
      });

      // Check for exit command
      if (userText.toLowerCase().includes('sair do canal') || 
          userText.toLowerCase().includes('desconectar')) {
        await this.stop();
        return;
      }

      // Wait a bit before responding (more natural)
      await this.sleep(this.config.responseDelay);

      // Generate response (LLM)
      console.log('[FluentVoice] 🤖 Generating response...');
      const response = await this.generateResponse(userText);

      console.log(`[FluentVoice] 💭 Bot: "${response}"`);

      // Add to history
      this.conversationHistory.push({
        role: 'assistant',
        content: response
      });

      // Send to text channel
      if (this.textChannel) {
        await this.textChannel.send(`🤖 **Bot:** ${response}`);
      }

      // Generate TTS
      console.log('[FluentVoice] 🔊 Generating TTS...');
      const ttsPath = await this.generateTTS(response);

      // Play response
      console.log('[FluentVoice] 📢 Speaking response...');
      await this.speak(ttsPath);

      // Cleanup
      fs.unlinkSync(wavPath);
      fs.unlinkSync(ttsPath);

      console.log('[FluentVoice] ✅ Turn complete! Listening for next...');

    } catch (error: any) {
      console.error('[FluentVoice] ❌ Error processing audio:', error.message);
    }
  }

  /**
   * Convert PCM to WAV format
   */
  private async convertPCMtoWAV(pcmPath: string, wavPath: string): Promise<void> {
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    ffmpeg.setFfmpegPath(ffmpegPath);

    return new Promise((resolve, reject) => {
      ffmpeg(pcmPath)
        .inputFormat('s16le')
        .audioFrequency(48000)
        .audioChannels(2)
        .toFormat('wav')
        .save(wavPath)
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err));
    });
  }

  /**
   * Generate response using Claude
   */
  private async generateResponse(userMessage: string): Promise<string> {
    // Build messages from history
    const messages: any[] = this.conversationHistory.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add current message
    messages.push({
      role: 'user',
      content: userMessage
    });

    // Call Claude
    const response = await this.claude.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 300, // Keep concise for voice
      system: `Você está em uma conversa de VOZ no Discord.

REGRAS CRÍTICAS:
- Responda de forma MUITO NATURAL e CONVERSACIONAL
- Máximo 2-3 frases curtas (você vai FALAR isso)
- Seja direto e amigável
- Use linguagem casual brasileira
- Evite listas, bullet points, formatação
- Fale como se estivesse falando com um amigo

Lembre: Sua resposta será FALADA em voz alta!`,
      messages
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return content.text;
  }

  /**
   * Generate TTS audio
   */
  private async generateTTS(text: string): Promise<string> {
    const ElevenLabsClient = require('elevenlabs').ElevenLabsClient;
    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

    const timestamp = Date.now();
    const filename = `tts-${timestamp}.mp3`;
    const outputPath = path.join(this.recordingsDir, filename);

    console.log('[FluentVoice] 🎵 Generating TTS...');

    const audio = await client.textToSpeech.convert(this.config.ttsVoice, {
      text,
      model_id: 'eleven_multilingual_v2'
    });

    // Write to file
    const chunks: Uint8Array[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(outputPath, buffer);

    console.log(`[FluentVoice] ✅ TTS saved: ${filename}`);
    return outputPath;
  }

  /**
   * Speak audio in voice channel
   */
  private async speak(audioPath: string): Promise<void> {
    if (!this.player) {
      throw new Error('Audio player not initialized');
    }

    const resource = createAudioResource(audioPath);
    this.player.play(resource);

    return new Promise((resolve, reject) => {
      this.player!.once('idle', () => {
        console.log('[FluentVoice] ✅ Finished speaking');
        resolve();
      });

      this.player!.once('error', (error) => {
        console.error('[FluentVoice] ❌ Playback error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop conversation
   */
  async stop(): Promise<void> {
    console.log('[FluentVoice] 🛑 Stopping conversation...');

    this.isActive = false;

    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }

    this.player = null;
    this.conversationHistory = [];

    if (this.textChannel) {
      await this.textChannel.send({
        embeds: [{
          title: '👋 Voice Conversation Ended',
          description: 'Saí do canal de voz. Foi ótimo conversar com você!',
          color: 0xFF0000
        }]
      });
    }

    console.log('[FluentVoice] ✅ Conversation stopped');
  }

  /**
   * Get conversation history
   */
  getHistory(): Array<{ role: string, content: string }> {
    return this.conversationHistory;
  }

  /**
   * Check if active
   */
  isConversationActive(): boolean {
    return this.isActive;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance
 */
let instance: FluentVoiceConversation | null = null;

export function getFluentVoiceConversation(claude: Anthropic): FluentVoiceConversation {
  if (!instance) {
    instance = new FluentVoiceConversation(claude);
  }
  return instance;
}
