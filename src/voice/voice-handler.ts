import {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
  VoiceConnection,
  AudioPlayer,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  VoiceConnectionDisconnectReason,
  AudioReceiveStream
} from '@discordjs/voice';
import { VoiceChannel, GuildMember } from 'discord.js';
import { pipeline } from 'stream';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import path from 'path';
// import prism from 'prism-media'; // TODO: Add prism-media to package.json

const pipelineAsync = promisify(pipeline);

export interface VoiceConnectionInfo {
  guildId: string;
  channelId: string;
  channelName: string;
  connectedAt: Date;
  status: VoiceConnectionStatus;
  memberCount: number;
  listeningTo: string[];
}

export class VoiceHandler {
  private connections: Map<string, VoiceConnection> = new Map();
  private players: Map<string, AudioPlayer> = new Map();
  private recordings: Map<string, string[]> = new Map(); // userId -> audio files
  private recordingPath: string;

  constructor(recordingPath: string = './data/recordings') {
    this.recordingPath = recordingPath;
    
    // Ensure recordings directory exists
    const fs = require('fs');
    if (!fs.existsSync(this.recordingPath)) {
      fs.mkdirSync(this.recordingPath, { recursive: true });
    }

    console.log(`[VoiceHandler] ✅ Initialized with recording path: ${this.recordingPath}`);
  }

  /**
   * Join a voice channel
   */
  async join(channel: VoiceChannel): Promise<VoiceConnection> {
    const guildId = channel.guild.id;

    console.log(`[VoiceHandler] 🔊 Joining voice channel: ${channel.name} (${channel.id})`);

    // Check if already connected
    if (this.connections.has(guildId)) {
      console.log('[VoiceHandler] ⚠️ Already connected to a channel in this guild');
      return this.connections.get(guildId)!;
    }

    // Join channel
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator as any,
      selfDeaf: false, // IMPORTANT: Must be false to receive audio
      selfMute: false
    });

    // Wait for connection to be ready
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      console.log('[VoiceHandler] ✅ Voice connection ready');
    } catch (error) {
      console.error('[VoiceHandler] ❌ Failed to establish voice connection:', error);
      connection.destroy();
      throw error;
    }

    // Create audio player
    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    });

    connection.subscribe(player);

    // Store connection and player
    this.connections.set(guildId, connection);
    this.players.set(guildId, player);

    // Handle connection state changes
    connection.on('stateChange', (oldState, newState) => {
      console.log(`[VoiceHandler] State change: ${oldState.status} → ${newState.status}`);
      
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        if (
          newState.reason === VoiceConnectionDisconnectReason.WebSocketClose &&
          newState.closeCode === 4014
        ) {
          // If the disconnect was due to channel deletion, do not rejoin
          console.log('[VoiceHandler] Channel deleted, cleaning up...');
          this.leave(guildId);
        } else {
          // Try to reconnect
          console.log('[VoiceHandler] Attempting to reconnect...');
          connection.rejoin();
        }
      }
    });

    // Start listening for audio
    this.startListening(connection, guildId);

    console.log('[VoiceHandler] 🎤 Now listening in voice channel');

    return connection;
  }

  /**
   * Leave voice channel
   */
  leave(guildId: string): void {
    const connection = this.connections.get(guildId);
    
    if (connection) {
      console.log('[VoiceHandler] 👋 Leaving voice channel');
      connection.destroy();
      this.connections.delete(guildId);
      this.players.delete(guildId);
      console.log('[VoiceHandler] ✅ Disconnected');
    } else {
      console.log('[VoiceHandler] ⚠️ Not connected to any voice channel');
    }
  }

  /**
   * Start listening to voice channel and recording audio
   */
  private startListening(connection: VoiceConnection, guildId: string): void {
    console.log('[VoiceHandler] 🎧 Starting audio reception...');

    const receiver = connection.receiver;

    // Listen for users starting to speak
    receiver.speaking.on('start', (userId) => {
      console.log(`[VoiceHandler] 🎤 User ${userId} started speaking`);
      this.startRecording(receiver, userId, guildId);
    });
  }

  /**
   * Start recording a user's audio
   */
  private async startRecording(
    receiver: any,
    userId: string,
    guildId: string
  ): Promise<void> {
    // Create audio receive stream for this user
    const audioStream = receiver.subscribe(userId, {
      end: {
        behavior: 'manual' as any
      }
    });

    if (!audioStream) {
      console.warn(`[VoiceHandler] ⚠️ Could not subscribe to user ${userId}`);
      return;
    }

    // Generate filename
    const timestamp = Date.now();
    const filename = `${guildId}-${userId}-${timestamp}.pcm`;
    const filePath = path.join(this.recordingPath, filename);

    console.log(`[VoiceHandler] 📹 Recording to: ${filename}`);

    // TODO: Re-enable once prism-media is added to package.json
    /*
    // Create opus decoder
    const opusDecoder = new prism.opus.Decoder({
      rate: 48000,
      channels: 2,
      frameSize: 960
    });

    try {
      // Pipe audio stream through decoder to file
      await pipelineAsync(
        audioStream,
        opusDecoder,
        createWriteStream(filePath)
      );

      console.log(`[VoiceHandler] ✅ Recording saved: ${filename}`);

      // Store recording path
      if (!this.recordings.has(userId)) {
        this.recordings.set(userId, []);
      }
      this.recordings.get(userId)!.push(filePath);

    } catch (error: any) {
      console.error('[VoiceHandler] ❌ Recording failed:', error.message);
    }
    */
    console.warn('[VoiceHandler] ⚠️ Recording disabled (prism-media not installed)');
  }

  /**
   * Get recording files for a user
   */
  getRecordings(userId: string): string[] {
    return this.recordings.get(userId) || [];
  }

  /**
   * Clear recordings for a user
   */
  clearRecordings(userId: string): void {
    const files = this.recordings.get(userId);
    if (files) {
      const fs = require('fs');
      files.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
      this.recordings.delete(userId);
      console.log(`[VoiceHandler] 🗑️ Cleared ${files.length} recordings for user ${userId}`);
    }
  }

  /**
   * Play audio file in voice channel
   */
  async play(guildId: string, audioPath: string): Promise<void> {
    const player = this.players.get(guildId);
    
    if (!player) {
      throw new Error('Not connected to voice channel');
    }

    console.log(`[VoiceHandler] 🔊 Playing audio: ${path.basename(audioPath)}`);

    const resource = createAudioResource(audioPath);
    player.play(resource);

    return new Promise((resolve, reject) => {
      player.once('idle', () => {
        console.log('[VoiceHandler] ✅ Playback finished');
        resolve();
      });

      player.once('error', (error) => {
        console.error('[VoiceHandler] ❌ Playback error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop current playback
   */
  stop(guildId: string): void {
    const player = this.players.get(guildId);
    if (player) {
      player.stop();
      console.log('[VoiceHandler] ⏹️ Playback stopped');
    }
  }

  /**
   * Get connection info
   */
  getConnectionInfo(guildId: string): VoiceConnectionInfo | null {
    const connection = this.connections.get(guildId);
    
    if (!connection) {
      return null;
    }

    return {
      guildId,
      channelId: connection.joinConfig.channelId || '',
      channelName: '', // Would need Discord client to fetch
      connectedAt: new Date(), // Would need to track
      status: connection.state.status,
      memberCount: 0, // Would need Discord client to fetch
      listeningTo: Array.from(this.recordings.keys())
    };
  }

  /**
   * Check if connected to voice
   */
  isConnected(guildId: string): boolean {
    const connection = this.connections.get(guildId);
    return connection?.state.status === VoiceConnectionStatus.Ready;
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Cleanup all connections
   */
  cleanup(): void {
    console.log('[VoiceHandler] 🧹 Cleaning up all voice connections...');
    
    this.connections.forEach((connection, guildId) => {
      this.leave(guildId);
    });

    console.log('[VoiceHandler] ✅ Cleanup complete');
  }
}

/**
 * Singleton instance
 */
let instance: VoiceHandler | null = null;

export function getVoiceHandler(): VoiceHandler {
  if (!instance) {
    instance = new VoiceHandler();
  }
  return instance;
}
