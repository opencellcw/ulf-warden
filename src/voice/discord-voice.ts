/**
 * Discord Voice Connection Manager
 */

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnection,
  AudioPlayer,
  VoiceConnectionStatus,
  entersState
} from '@discordjs/voice';
import { VoiceChannel, StageChannel } from 'discord.js';
import { log } from '../logger';
import { Readable } from 'stream';

interface VoiceState {
  connection: VoiceConnection;
  player: AudioPlayer;
  guildId: string;
  channelId: string;
  queue: Array<{ text: string; stream: Readable }>;
  speaking: boolean;
}

class DiscordVoiceManager {
  private voices: Map<string, VoiceState> = new Map();

  async joinChannel(channel: VoiceChannel | StageChannel): Promise<boolean> {
    try {
      const guildId = channel.guild.id;
      
      if (this.voices.has(guildId)) {
        log.info('[Voice] Already connected', { guildId });
        return true;
      }

      log.info('[Voice] Joining channel', {
        guildId,
        channelId: channel.id,
        channelName: channel.name
      });

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator as any,
        selfDeaf: true,
        selfMute: false
      });

      const player = createAudioPlayer();
      connection.subscribe(player);

      // Add detailed status logging
      connection.on('stateChange', (oldState, newState) => {
        log.info('[Voice] Connection state changed', {
          from: oldState.status,
          to: newState.status,
          guildId
        });
      });

      connection.on('error', (error) => {
        log.error('[Voice] Connection error', { error: error.message, stack: error.stack, guildId });
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5000)
          ]);
        } catch (error: any) {
          log.error('[Voice] Disconnected and failed to reconnect', { error: error.message, guildId });
          this.leaveChannel(guildId);
        }
      });

      player.on(AudioPlayerStatus.Idle, () => {
        const state = this.voices.get(guildId);
        if (state) {
          state.speaking = false;
          this.processQueue(guildId);
        }
      });

      this.voices.set(guildId, {
        connection,
        player,
        guildId,
        channelId: channel.id,
        queue: [],
        speaking: false
      });

      log.info('[Voice] Waiting for connection to be ready...', { guildId });
      await entersState(connection, VoiceConnectionStatus.Ready, 20000);
      log.info('[Voice] Connected successfully', { guildId });
      return true;
    } catch (error: any) {
      log.error('[Voice] Failed to join', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  leaveChannel(guildId: string): void {
    const state = this.voices.get(guildId);
    if (!state) return;

    log.info('[Voice] Leaving channel', { guildId });
    state.player.stop(true);
    state.connection.destroy();
    this.voices.delete(guildId);
  }

  async playAudio(guildId: string, audioStream: Readable, text: string): Promise<void> {
    const state = this.voices.get(guildId);
    if (!state) {
      throw new Error('Not connected to voice channel');
    }

    state.queue.push({ text, stream: audioStream });
    
    if (!state.speaking) {
      await this.processQueue(guildId);
    }
  }

  private async processQueue(guildId: string): Promise<void> {
    const state = this.voices.get(guildId);
    if (!state || state.queue.length === 0) return;

    const item = state.queue.shift()!;

    try {
      const resource = createAudioResource(item.stream, { inlineVolume: true });
      resource.volume?.setVolume(0.5);
      state.player.play(resource);
      state.speaking = true;
    } catch (error: any) {
      log.error('[Voice] Play error', { error: error.message });
      state.speaking = false;
      await this.processQueue(guildId);
    }
  }

  isConnected(guildId: string): boolean {
    return this.voices.has(guildId);
  }

  skip(guildId: string): void {
    const state = this.voices.get(guildId);
    if (state) state.player.stop();
  }
}

export const voiceManager = new DiscordVoiceManager();
