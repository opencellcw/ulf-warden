/**
 * Discord Commands for Voice Conversation
 * 
 * Commands:
 * - "entrar no canal" / "join voice" - Bot enters voice channel and starts listening
 * - "sair do canal" / "leave voice" - Bot leaves voice channel
 * - "conversa de voz" / "voice chat" - Start fluent voice conversation
 */

import { Message, GuildMember, VoiceChannel } from 'discord.js';
import { getFluentVoiceConversation } from './fluent-voice-conversation';
import Anthropic from '@anthropic-ai/sdk';

export class VoiceCommands {
  private claude: Anthropic;

  constructor(claude: Anthropic) {
    this.claude = claude;
  }

  /**
   * Handle voice-related commands
   */
  async handleCommand(message: Message): Promise<boolean> {
    const content = message.content.toLowerCase();

    // Check for voice commands
    if (this.isJoinCommand(content)) {
      await this.handleJoinVoice(message);
      return true;
    }

    if (this.isLeaveCommand(content)) {
      await this.handleLeaveVoice(message);
      return true;
    }

    if (this.isVoiceChatCommand(content)) {
      await this.handleVoiceChat(message);
      return true;
    }

    return false;
  }

  /**
   * Check if message is a join voice command
   */
  private isJoinCommand(content: string): boolean {
    const patterns = [
      'entrar no canal',
      'entra no canal',
      'join voice',
      'join channel',
      'vem no voice',
      'vem aqui',
      'conversa de voz',
      'voice chat'
    ];

    return patterns.some(pattern => content.includes(pattern));
  }

  /**
   * Check if message is a leave voice command
   */
  private isLeaveCommand(content: string): boolean {
    const patterns = [
      'sair do canal',
      'sai do canal',
      'leave voice',
      'leave channel',
      'desconectar',
      'disconnect'
    ];

    return patterns.some(pattern => content.includes(pattern));
  }

  /**
   * Check if message is voice chat command
   */
  private isVoiceChatCommand(content: string): boolean {
    const patterns = [
      'conversa de voz',
      'conversa fluida',
      'voice chat',
      'fluent voice',
      'vamos conversar de voz'
    ];

    return patterns.some(pattern => content.includes(pattern));
  }

  /**
   * Handle join voice command
   */
  private async handleJoinVoice(message: Message): Promise<void> {
    try {
      // Get user's voice channel
      const member = message.member as GuildMember;
      const voiceChannel = member?.voice.channel as VoiceChannel;

      if (!voiceChannel) {
        await message.reply('❌ Você precisa estar em um canal de voz primeiro!');
        return;
      }

      // Check permissions
      const permissions = voiceChannel.permissionsFor(message.client.user!);
      if (!permissions?.has(['Connect', 'Speak'])) {
        await message.reply('❌ Não tenho permissão para entrar nesse canal!');
        return;
      }

      await message.reply('🔄 Entrando no canal de voz...');

      // Start fluent voice conversation
      const conversation = getFluentVoiceConversation(this.claude);
      await conversation.start(voiceChannel, message);

    } catch (error: any) {
      console.error('[VoiceCommands] Error joining voice:', error);
      await message.reply(`❌ Erro ao entrar no canal: ${error.message}`);
    }
  }

  /**
   * Handle leave voice command
   */
  private async handleLeaveVoice(message: Message): Promise<void> {
    try {
      const conversation = getFluentVoiceConversation(this.claude);
      
      if (!conversation.isConversationActive()) {
        await message.reply('❌ Não estou em nenhum canal de voz!');
        return;
      }

      await conversation.stop();

    } catch (error: any) {
      console.error('[VoiceCommands] Error leaving voice:', error);
      await message.reply(`❌ Erro ao sair do canal: ${error.message}`);
    }
  }

  /**
   * Handle voice chat command
   */
  private async handleVoiceChat(message: Message): Promise<void> {
    // Same as join voice (starts fluent conversation)
    await this.handleJoinVoice(message);
  }
}

/**
 * Register voice commands in Discord handler
 * Add this to your Discord message handler
 */
export function registerVoiceCommands(claude: Anthropic) {
  const voiceCommands = new VoiceCommands(claude);

  return async (message: Message): Promise<boolean> => {
    return await voiceCommands.handleCommand(message);
  };
}
