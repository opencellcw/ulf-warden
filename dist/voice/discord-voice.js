"use strict";
/**
 * Discord Voice Connection Manager
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceManager = void 0;
const voice_1 = require("@discordjs/voice");
const logger_1 = require("../logger");
class DiscordVoiceManager {
    voices = new Map();
    async joinChannel(channel) {
        try {
            const guildId = channel.guild.id;
            if (this.voices.has(guildId)) {
                logger_1.log.info('[Voice] Already connected', { guildId });
                return true;
            }
            logger_1.log.info('[Voice] Joining channel', {
                guildId,
                channelId: channel.id,
                channelName: channel.name
            });
            const connection = (0, voice_1.joinVoiceChannel)({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false
            });
            const player = (0, voice_1.createAudioPlayer)();
            connection.subscribe(player);
            // Add detailed status logging
            connection.on('stateChange', (oldState, newState) => {
                logger_1.log.info('[Voice] Connection state changed', {
                    from: oldState.status,
                    to: newState.status,
                    guildId
                });
            });
            connection.on('error', (error) => {
                logger_1.log.error('[Voice] Connection error', { error: error.message, stack: error.stack, guildId });
            });
            connection.on(voice_1.VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        (0, voice_1.entersState)(connection, voice_1.VoiceConnectionStatus.Signalling, 5000),
                        (0, voice_1.entersState)(connection, voice_1.VoiceConnectionStatus.Connecting, 5000)
                    ]);
                }
                catch (error) {
                    logger_1.log.error('[Voice] Disconnected and failed to reconnect', { error: error.message, guildId });
                    this.leaveChannel(guildId);
                }
            });
            player.on(voice_1.AudioPlayerStatus.Idle, () => {
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
            logger_1.log.info('[Voice] Waiting for connection to be ready...', { guildId });
            await (0, voice_1.entersState)(connection, voice_1.VoiceConnectionStatus.Ready, 20000);
            logger_1.log.info('[Voice] Connected successfully', { guildId });
            return true;
        }
        catch (error) {
            logger_1.log.error('[Voice] Failed to join', {
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }
    leaveChannel(guildId) {
        const state = this.voices.get(guildId);
        if (!state)
            return;
        logger_1.log.info('[Voice] Leaving channel', { guildId });
        state.player.stop(true);
        state.connection.destroy();
        this.voices.delete(guildId);
    }
    async playAudio(guildId, audioStream, text) {
        const state = this.voices.get(guildId);
        if (!state) {
            throw new Error('Not connected to voice channel');
        }
        state.queue.push({ text, stream: audioStream });
        if (!state.speaking) {
            await this.processQueue(guildId);
        }
    }
    async processQueue(guildId) {
        const state = this.voices.get(guildId);
        if (!state || state.queue.length === 0)
            return;
        const item = state.queue.shift();
        try {
            const resource = (0, voice_1.createAudioResource)(item.stream, { inlineVolume: true });
            resource.volume?.setVolume(0.5);
            state.player.play(resource);
            state.speaking = true;
        }
        catch (error) {
            logger_1.log.error('[Voice] Play error', { error: error.message });
            state.speaking = false;
            await this.processQueue(guildId);
        }
    }
    isConnected(guildId) {
        return this.voices.has(guildId);
    }
    skip(guildId) {
        const state = this.voices.get(guildId);
        if (state)
            state.player.stop();
    }
}
exports.voiceManager = new DiscordVoiceManager();
