import { Client, GatewayIntentBits, Message, VoiceChannel, StageChannel } from 'discord.js';
import { chat } from '../chat';
import { runAgent } from '../agent';
import { sessionManager } from '../sessions';
import { extractMediaMetadata, cleanResponseText } from '../media-handler';
import { uploadMediaToDiscord } from '../media-handler-discord';
import { log } from '../logger';
import { approvalSystem } from '../approval-system';
import { selfImprovementSystem } from '../self-improvement';
import { handleBotCreation } from '../bot-factory/discord-handler';
import { getNormalRateLimiter } from '../security/rate-limiter';
import { voiceManager } from '../voice/discord-voice';
import { ttsGenerator } from '../voice/tts-generator';
import { sendStatusReport, handleStatusButtons } from '../utils/discord-status-example';
import axios from 'axios';

export async function startDiscordHandler() {
  if (!process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN === 'xxx') {
    console.log('[Discord] Token not configured, skipping Discord handler');
    return null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  /**
   * Send response with automatic media handling
   */
  async function sendResponse(message: Message, response: string): Promise<void> {
    // Check if response contains media
    const media = extractMediaMetadata(response);

    if (media) {
      log.info('[Discord] Media detected in response', {
        type: media.type,
        hasUrl: !!media.url,
        hasFilePath: !!media.filePath
      });

      // Clean text (remove URLs/paths)
      const cleanText = cleanResponseText(response, media);

      try {
        // Upload media to Discord
        await uploadMediaToDiscord(message, media, cleanText || '✨ Generated content');
        log.info('[Discord] Media sent successfully');
      } catch (error: any) {
        log.error('[Discord] Upload failed', {
          error: error.message,
          stack: error.stack,
          mediaType: media.type
        });

        // Send error message
        await message.reply(
          `⚠️ Content generated but failed to upload.\n\n**Error:** ${error.message}`
        );
      }
    } else {
      // No media, send normal text response
      // Split long messages (Discord limit: 2000 chars)
      if (response.length <= 2000) {
        await message.reply(response);
      } else {
        const chunks = response.match(/[\s\S]{1,2000}/g) || [];
        for (const chunk of chunks) {
          if ('send' in message.channel) {
            await message.channel.send(chunk);
          }
        }
      }
    }
  }

  /**
   * Process attachments in message (download text files)
   */
  async function processAttachments(message: Message): Promise<string> {
    if (message.attachments.size === 0) return '';

    const textParts: string[] = [];

    for (const [, attachment] of message.attachments) {
      // Only process text files (txt, md, json, etc)
      const textExtensions = ['.txt', '.md', '.json', '.csv', '.log', '.yaml', '.yml', '.xml', '.html'];
      const isTextFile = textExtensions.some(ext => attachment.name?.toLowerCase().endsWith(ext));

      if (!isTextFile) {
        log.info('[Discord] Skipping non-text attachment', { name: attachment.name });
        continue;
      }

      // Check file size (max 1MB for text files)
      if (attachment.size > 1024 * 1024) {
        log.warn('[Discord] Text file too large', { name: attachment.name, size: attachment.size });
        textParts.push(`⚠️ Arquivo ${attachment.name} muito grande (${(attachment.size / 1024).toFixed(2)}KB > 1MB)`);
        continue;
      }

      try {
        log.info('[Discord] Downloading attachment', { name: attachment.name, size: attachment.size });

        // Download file content
        const response = await axios.get(attachment.url, {
          responseType: 'text',
          timeout: 10000
        });

        const content = response.data;
        textParts.push(`\n\n--- Conteúdo do arquivo: ${attachment.name} ---\n${content}\n--- Fim do arquivo ---\n`);

        log.info('[Discord] Attachment processed', { name: attachment.name, contentLength: content.length });
      } catch (error: any) {
        log.error('[Discord] Failed to download attachment', {
          name: attachment.name,
          error: error.message
        });
        textParts.push(`⚠️ Erro ao ler ${attachment.name}: ${error.message}`);
      }
    }

    return textParts.join('\n');
  }

  // Handle voice commands
  async function handleVoiceCommand(message: Message, text: string): Promise<boolean> {
    const guildId = message.guild?.id;
    if (!guildId) {
      await message.reply('❌ Comandos de voz só funcionam em servidores!');
      return true;
    }

    // Join voice channel
    if (text.match(/entrar|join|conecta|connect/i) && text.match(/voz|voice|canal/i)) {
      const member = message.guild.members.cache.get(message.author.id);
      const voiceChannel = member?.voice.channel;

      if (!voiceChannel) {
        await message.reply('❌ Você precisa estar em um canal de voz!');
        return true;
      }

      if (voiceManager.isConnected(guildId)) {
        await message.reply('✅ Já estou conectado ao canal de voz!');
        return true;
      }

      const success = await voiceManager.joinChannel(voiceChannel as VoiceChannel | StageChannel);
      if (success) {
        await message.reply(`🎤 Conectado ao canal **${voiceChannel.name}**!`);
      } else {
        await message.reply('❌ Erro ao conectar no canal de voz.');
      }
      return true;
    }

    // Leave voice channel
    if (text.match(/sair|leave|desconecta|disconnect/i) && text.match(/voz|voice|canal/i)) {
      if (!voiceManager.isConnected(guildId)) {
        await message.reply('❌ Não estou em nenhum canal de voz!');
        return true;
      }

      voiceManager.leaveChannel(guildId);
      await message.reply('👋 Saí do canal de voz!');
      return true;
    }

    // Speak text
    if (text.match(/fala|falar|speak|say|diz|dizer/i)) {
      if (!voiceManager.isConnected(guildId)) {
        await message.reply('❌ Preciso estar em um canal de voz! Use "entrar no canal de voz" primeiro.');
        return true;
      }

      // Extract text to speak
      const speakMatch = text.match(/(?:fala|falar|speak|say|diz|dizer)\s+[""]?(.+?)[""]?$/i);
      if (!speakMatch || !speakMatch[1]) {
        await message.reply('❌ O que você quer que eu fale? Ex: "fala olá mundo"');
        return true;
      }

      const textToSpeak = speakMatch[1].trim();

      try {
        const audioStream = await ttsGenerator.generateSpeech(textToSpeak);
        await voiceManager.playAudio(guildId, audioStream, textToSpeak);
        await message.reply(`🔊 Falando: "${textToSpeak}"`);
      } catch (error: any) {
        log.error('[Voice] Failed to play audio', { error: error.message });
        await message.reply(`❌ Erro ao gerar áudio: ${error.message}`);
      }
      return true;
    }

    // List available voices
    if (text.match(/vozes|voices|lista.*voz/i)) {
      const voices = ttsGenerator.getVoices();
      const voiceList = Object.entries(voices)
        .map(([name, id]) => `• **${name}**`)
        .join('\n');
      await message.reply(`🎤 **Vozes disponíveis:**\n${voiceList}\n\nPara mudar: "usar voz rachel"`);
      return true;
    }

    return false;
  }

  // Detect if message needs agent mode (execution)
  function needsAgent(text: string): boolean {
    const agentKeywords = [
      // Development
      'sobe', 'subir', 'criar', 'instala', 'deploy', 'roda', 'executa',
      'create', 'install', 'run', 'execute', 'start', 'setup',
      'api', 'servidor', 'server', 'app', 'service',
      // Bot Factory
      'criar bot', 'create bot', 'novo bot', 'new bot',
      'listar bots', 'list bots', 'delete bot', 'deletar bot',
      'bot status', 'status do bot',
      // Multimodal
      'gera', 'gerar', 'cria', 'criar', 'generate', 'create',
      'faz', 'fazer', 'faça', 'make', 'draw', 'desenha', 'desenhar',
      'imagem', 'image', 'img', 'foto', 'photo', 'picture', 'pic',
      'video', 'vídeo', 'animate', 'anima',
      'audio', 'áudio', 'som', 'sound', 'voz', 'voice',
      'converte', 'convert', 'transcreve', 'transcribe',
      'analisa', 'analyze', 'descreve', 'describe',
      'remove fundo', 'remove background', 'upscale',
      // Scheduling
      'lembra', 'lembrar', 'reminder', 'remind',
      'agendar', 'agenda', 'schedule',
      'me avisa', 'avisa', 'notify', 'alert',
      'lista tasks', 'list tasks', 'scheduled',
      'cancela task', 'cancel task'
    ];

    const lowerText = text.toLowerCase();
    return agentKeywords.some(keyword => lowerText.includes(keyword));
  }

  client.on('ready', () => {
    console.log(`✓ Discord handler started (${client.user?.tag})`);

    // Initialize approval system
    approvalSystem.setClient(client);
    log.info('[Discord] Approval system initialized');
  });

  // Handle button interactions
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    try {
      // Handle status buttons
      if (interaction.customId.startsWith('status_')) {
        await handleStatusButtons(interaction);
        return;
      }
    } catch (error) {
      console.error('[Discord] Error handling button interaction:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Erro ao processar interação. Tente novamente.',
          ephemeral: true
        });
      }
    }
  });

  client.on('messageCreate', async (message: Message) => {
    try {
      // Ignore bot messages
      if (message.author.bot) return;

      // Respond to DMs or mentions
      const isDM = message.channel.isDMBased();
      const isMentioned = message.mentions.has(client.user!);

      if (!isDM && !isMentioned) return;

      const userId = `discord_${message.author.id}`;

      // Rate limiting check
      const rateLimiter = getNormalRateLimiter();
      const rateLimitCheck = await rateLimiter.checkLimit(userId);

      if (!rateLimitCheck.allowed) {
        await message.reply(
          `⏱️ ${rateLimitCheck.reason}\n` +
          `Aguarde ${rateLimitCheck.retryAfter} segundos antes de enviar outra mensagem.`
        );
        return;
      }

      let text = message.content;

      // Remove mention from text
      if (isMentioned) {
        text = text.replace(/<@!?\d+>/g, '').trim();
      }

      // Process attachments (text files)
      const attachmentContent = await processAttachments(message);
      if (attachmentContent) {
        text = text ? `${text}\n${attachmentContent}` : attachmentContent;
      }

      if (!text) {
        await message.reply('Oi! Como posso ajudar?');
        return;
      }

      // Handle special commands
      if (text.startsWith('/propose-improvement')) {
        // Example: /propose-improvement title: "Fix bug" | description: "..." | files: src/test.ts
        await message.reply('🔧 Sistema de self-improvement detectado. Use `propor melhoria em X` para propostas automáticas.');
        return;
      }

      // Handle bot creation commands
      if (text.match(/criar bot|create bot|novo bot|new bot/i)) {
        await handleBotCreation(message);
        return;
      }

      // Handle status command
      if (text.match(/status|system|servidor|server status|ulf status/i)) {
        await sendStatusReport(message);
        return;
      }

      // Handle voice commands
      const handledVoice = await handleVoiceCommand(message, text);
      if (handledVoice) {
        return;
      }

      console.log(`[Discord] Message from ${userId}: ${text.substring(0, 50)}...`);

      // Show typing indicator
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      const history = await sessionManager.getHistory(userId);

      // Choose between agent (with tools) or regular chat
      const useAgent = needsAgent(text);

      let response: string;
      if (useAgent) {
        console.log(`[Discord] Using AGENT mode for: ${text.substring(0, 30)}...`);
        response = await runAgent({
          userId,
          userMessage: text,
          history,
        });
      } else {
        response = await chat({
          userId,
          userMessage: text,
          history,
        });
      }

      await sessionManager.addMessage(userId, { role: 'user', content: text });
      await sessionManager.addMessage(userId, { role: 'assistant', content: response });

      await sendResponse(message, response);

      // If connected to voice channel, speak the response
      const guildId = message.guild?.id;
      if (guildId && voiceManager.isConnected(guildId)) {
        try {
          // Limit voice response to first 500 characters to avoid long speech
          const voiceText = response.substring(0, 500);
          const audioStream = await ttsGenerator.generateSpeech(voiceText);
          await voiceManager.playAudio(guildId, audioStream, voiceText);
          log.info('[Voice] Auto-speaking response', { textLength: voiceText.length });
        } catch (error: any) {
          log.error('[Voice] Failed to auto-speak', { error: error.message });
          // Don't fail the main response if voice fails
        }
      }
    } catch (error) {
      console.error('[Discord] Error handling message:', error);
      await message.reply('Desculpa, tive um problema. Tenta de novo?');
    }
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);

  return client;
}
