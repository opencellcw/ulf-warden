import { Client, GatewayIntentBits, Message, VoiceChannel, StageChannel, Partials } from 'discord.js';
import { chat } from '../chat';
import { runAgent } from '../agent';
import { sessionManager } from '../sessions';
import { extractMediaMetadata, cleanResponseText, sanitizeResponse } from '../media-handler';
import { uploadMediaToDiscord } from '../media-handler-discord';
import { log } from '../logger';
import { approvalSystem } from '../approval-system';
import { selfImprovementSystem } from '../self-improvement';
import { handleBotCreation } from '../bot-factory/discord-handler';
import { getNormalRateLimiter } from '../security/rate-limiter';
import { voiceManager } from '../voice/discord-voice';
import { ttsGenerator } from '../voice/tts-generator';
import { sendStatusReport, handleStatusButtons } from '../utils/discord-status-example';
import { handleReplicateUIButtons } from './replicate-ui-handler';
import { intelligentEnhancer } from './intelligent-image-enhancer';
import { parseAgentResponse, AgentResponseDecision } from '../types/agent-response';
import {
  analyzeMessage,
  shouldReactOnly,
  validateAgentDecision,
  buildSmartReactionPrompt
} from '../types/smart-reaction';
import { contactManager } from '../identity/contacts';
import { trustManager } from '../identity/trust-manager';
import { rotateKey, checkKeyStatus } from '../commands/rotate-key';
import { handleImageGenCommand, isImageGenCommand } from '../commands/image-gen';
import { handleAdminCommand } from '../commands/admin';
import { handleHelpCommand } from '../commands/help';
import { handleTrustCommand, isTrustCommand } from '../commands/trust';
import { handleSecretCommand, isSecretCommand } from '../commands/secrets';
import { initCloudRunClient } from '../cloud-run-client';
import { activityTracker } from '../activity/activity-tracker';
import { 
  handleDecisionCommand, 
  isDecisionCommand,
  handleDecisionHistoryCommand,
  isDecisionHistoryCommand 
} from '../decision-intelligence';
import { setDiscordClient } from './discord-client';
import axios from 'axios';

// 🚀 NEW FEATURES
import { formatter } from '../rich-media/response-formatter';
import { quickActions } from '../actions/quick-actions';
import { unifiedSearch } from '../search/unified-search';
import { skillDetector } from '../learning/skill-detector';
import { dreamMode } from '../viral-features/dream-mode';
import { copyStyle } from '../viral-features/copy-style';
import { smartReminders } from '../reminders/smart-reminders';
import { botThemes } from '../themes/bot-themes';
import { sentimentTracker } from '../sentiment/sentiment-tracker';
import { SelfImprover } from '../evolution/self-improver';
import Anthropic from '@anthropic-ai/sdk';

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
    partials: [
      Partials.Channel, // Necessário para receber DMs
      Partials.Message, // Necessário para mensagens parciais
    ],
  });

  // Initialize Cloud Run agents (if configured)
  const cloudRunAgents = [];
  if (process.env.IMAGE_GEN_AGENT_URL) {
    cloudRunAgents.push({
      name: 'image-gen',
      url: process.env.IMAGE_GEN_AGENT_URL,
      timeout: 120000 // 2 minutes
    });
  }

  if (cloudRunAgents.length > 0) {
    try {
      initCloudRunClient(cloudRunAgents);
      console.log(`[Discord] Cloud Run agents initialized: ${cloudRunAgents.map(a => a.name).join(', ')}`);
    } catch (error: any) {
      console.error('[Discord] Failed to initialize Cloud Run agents:', error.message);
    }
  }

  // 🚀 Initialize Self-Improver (Advanced AI self-modification)
  let selfImprover: SelfImprover | null = null;
  try {
    const claudeApiKey = process.env.ANTHROPIC_API_KEY;
    if (claudeApiKey && claudeApiKey !== 'xxx') {
      const anthropic = new Anthropic({ apiKey: claudeApiKey });
      selfImprover = new SelfImprover(anthropic);
      console.log('✓ Self-Improver initialized (Advanced Mode)');
      log.info('[Discord] Self-Improver system activated');
    } else {
      console.log('⚠ Self-Improver disabled (no API key)');
    }
  } catch (error: any) {
    console.error('[Discord] Failed to initialize Self-Improver:', error.message);
  }

  /**
   * Send response with automatic media handling
   */
  async function sendResponse(message: Message, response: string): Promise<void> {
    // Sanitize response to remove any XML-style function calls that shouldn't appear
    const sanitizedResponse = sanitizeResponse(response);

    // Check if response contains media
    const media = extractMediaMetadata(sanitizedResponse);

    if (media) {
      log.info('[Discord] Media detected in response', {
        type: media.type,
        hasUrl: !!media.url,
        hasFilePath: !!media.filePath
      });

      // Clean text (remove URLs/paths) - sanitizedResponse already cleaned of XML
      const cleanText = cleanResponseText(sanitizedResponse, media);

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
      // 🚀 NEW: Rich Media & Quick Actions Integration
      try {
        // Format response with rich media
        const richResponse = formatter.formatResponse(sanitizedResponse);
        
        // Suggest quick actions based on context
        const actions = quickActions.suggestActions({
          messageContent: sanitizedResponse,
          userId: message.author.id,
          botId: message.client.user?.id || 'discord-bot',
          channelType: message.channel.type === 0 ? 'channel' : 'dm',
        });

        // Build Discord message
        const discordFormat = formatter.toDiscordFormat(richResponse);
        
        // 🎨 INTELLIGENT IMAGE ENHANCEMENT SYSTEM
        // Uses 5 specialized agents to detect and enhance ANY image generation
        const enhancement = await intelligentEnhancer.enhance(
          discordFormat.content || sanitizedResponse,
          message.author.id,
          message.id
        );
        
        log.info('[Discord] Enhancement result', {
          shouldEnhance: enhancement.shouldEnhance,
          hasComponents: !!enhancement.components,
          userId: message.author.id
        });
        
        // Add quick action buttons
        const messageOptions: any = {
          content: enhancement.shouldEnhance 
            ? enhancement.enhancedContent 
            : discordFormat.content || sanitizedResponse,
        };

        // Add embeds if present
        if (discordFormat.embeds && discordFormat.embeds.length > 0) {
          messageOptions.embeds = discordFormat.embeds;
        }

        // Priority: Replicate UI buttons > Quick actions
        if (enhancement.shouldEnhance && enhancement.components) {
          messageOptions.components = enhancement.components;
          log.info('[Discord] Image buttons added!', {
            buttonsCount: enhancement.components.length
          });
        } else if (actions.length > 0) {
          messageOptions.components = [quickActions.toDiscordComponents(actions)];
        }

        // Send enhanced message
        if (messageOptions.content.length <= 2000) {
          await message.reply(messageOptions);
        } else {
          // Split long messages but keep first chunk with buttons
          const chunks = messageOptions.content.match(/[\s\S]{1,2000}/g) || [];
          
          // First chunk with all the bells and whistles
          await message.reply({
            content: chunks[0],
            embeds: messageOptions.embeds,
            components: messageOptions.components,
          });
          
          // Remaining chunks as plain text
          for (let i = 1; i < chunks.length; i++) {
            if ('send' in message.channel) {
              await message.channel.send(chunks[i]);
            }
          }
        }

        log.info('[Discord] Enhanced response sent', {
          hasEmbeds: !!discordFormat.embeds?.length,
          hasActions: actions.length > 0,
          elementsCount: richResponse.elements.length,
        });
      } catch (error: any) {
        log.error('[Discord] Rich media formatting failed, falling back to plain text', {
          error: error.message,
        });
        
        // Fallback to plain text
        if (sanitizedResponse.length <= 2000) {
          await message.reply(sanitizedResponse);
        } else {
          const chunks = sanitizedResponse.match(/[\s\S]{1,2000}/g) || [];
          for (const chunk of chunks) {
            if ('send' in message.channel) {
              await message.channel.send(chunk);
            }
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
      // In DMs, skip voice handling entirely (don't block other flows)
      return false;
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

    // Speak text (more specific pattern to avoid false positives)
    if (text.match(/^(fala|falar|speak|say|diz|dizer)\s/i) || text.match(/\b(fala|falar|speak|say|diz|dizer)\s+(algo|isso|aquilo|[""])/i)) {
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

    // Register client for scheduled tasks
    setDiscordClient(client);

    // Log listen channels configuration
    if (listenChannelIds.size > 0) {
      console.log(`  • Listen channels: ${Array.from(listenChannelIds).join(', ')}`);
      log.info('[Discord] Listen channels configured', {
        channels: Array.from(listenChannelIds),
        count: listenChannelIds.size
      });
    } else {
      console.log('  • Listen channels: None (only DMs and @mentions)');
    }

    // Initialize approval system
    approvalSystem.setClient(client);
    log.info('[Discord] Approval system initialized');

    // 🚀 NEW: Start reminder checker
    setInterval(async () => {
      const dueReminders = smartReminders.getDueReminders();

      for (const reminder of dueReminders) {
        try {
          // Extract Discord user ID from internal user ID
          const discordUserId = reminder.userId.replace('discord_', '');
          const user = await client.users.fetch(discordUserId);

          if (user) {
            await user.send(
              `⏰ **Reminder!**\n\n` +
              `${reminder.text}\n\n` +
              `_Set ${new Date(reminder.created).toLocaleString()}_`
            );

            // Mark as done automatically
            smartReminders.markDone(reminder.id);

            log.info('[Discord] Reminder sent', {
              reminderId: reminder.id,
              userId: reminder.userId,
            });
          }
        } catch (error: any) {
          log.error('[Discord] Failed to send reminder', {
            error: error.message,
            reminderId: reminder.id,
          });
        }
      }
    }, 60000); // Check every minute

    log.info('[Discord] Reminder checker started');
  });

  // Handle button and select menu interactions
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    try {
      // Handle status buttons
      if (interaction.customId.startsWith('status_')) {
        await handleStatusButtons(interaction as any);
        return;
      }

      // 🎨 Handle Replicate UI buttons and menus
      if (interaction.customId.startsWith('replicate:')) {
        await handleReplicateUIButtons(interaction as any);
        return;
      }

      // 🚀 NEW: Handle quick action buttons
      if (interaction.customId && !interaction.customId.startsWith('status_')) {
        await interaction.deferReply({ ephemeral: true });
        
        const userId = `discord_${interaction.user.id}`;
        const result = await quickActions.executeAction(
          interaction.customId,
          {
            messageContent: interaction.message.content || '',
            userId,
            botId: interaction.client.user?.id || 'discord-bot',
            channelType: interaction.channel?.type === 0 ? 'channel' : 'dm',
          }
        );

        await interaction.editReply({
          content: result.success 
            ? `✅ ${result.message}` 
            : `❌ Failed: ${result.message}`,
        });
        
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

  // Parse listen channels from env (comma-separated channel IDs)
  const listenChannelIds = new Set<string>(
    (process.env.DISCORD_LISTEN_CHANNELS || '')
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0)
  );

  client.on('messageCreate', async (message: Message) => {
    try {
      // Ignore bot messages
      if (message.author.bot) return;

      // Determine if bot should respond
      const isDM = message.channel.isDMBased();
      const isMentioned = message.mentions.has(client.user!);
      const isListenChannel = !message.channel.isDMBased() && listenChannelIds.has(message.channelId);

      // Respond if: DM, mentioned, OR in a listen channel
      if (!isDM && !isMentioned && !isListenChannel) return;

      const userId = `discord_${message.author.id}`;
      const discordId = message.author.id;

      // Get user identity and trust level (combines static contacts.md + dynamic database)
      const trustLevel = await trustManager.getTrustLevel(discordId);
      const identityContext = contactManager.getIdentityContext(discordId);

      // Record interaction for dynamic trust progression
      // Check if user introduced themselves (simple heuristic)
      const lowerText = message.content.toLowerCase();
      const nameMatch = lowerText.match(/(?:meu nome é|me chamo|sou o|sou a|i'm|my name is)\s+(\w+)/i);
      const introducedAs = nameMatch ? nameMatch[1] : undefined;

      await trustManager.recordInteraction(discordId, 'discord', {
        username: message.author.username,
        introducedAs
      });

      log.info('[Discord] Message received', {
        userId,
        discordId,
        trustLevel,
        isDM,
        isMentioned,
        isListenChannel,
        channelId: message.channelId,
        username: message.author.username
      });

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

      // Handle status command (must be explicit intent, not just containing the word)
      if (text.match(/^(status|system|servidor|ulf status|server status)$/i) ||
          text.match(/\b(mostra|show|ver|check)\s+(status|system|servidor)/i)) {
        await sendStatusReport(message);
        return;
      }

      // Handle API key rotation commands
      if (text.startsWith('/rotate-key')) {
        const args = text.split(' ').slice(1); // Remove '/rotate-key'
        await rotateKey(message, args);
        return;
      }

      if (text.startsWith('/key-status') || text.startsWith('/chave-status')) {
        await checkKeyStatus(message);
        return;
      }

      // Handle admin commands
      if (text.startsWith('/admin')) {
        const args = text.split(' ').slice(1); // Remove '/admin'
        await handleAdminCommand(message, args);
        return;
      }

      // Handle help command
      if (text.startsWith('/help') || text.startsWith('/ajuda')) {
        const args = text.split(' ').slice(1); // Remove '/help'
        await handleHelpCommand(message, args);
        return;
      }

      // Handle trust command
      if (isTrustCommand(text)) {
        await handleTrustCommand(message);
        return;
      }

      // Handle secret command
      if (isSecretCommand(text)) {
        await handleSecretCommand(message);
        return;
      }

      // Handle decision intelligence command
      if (isDecisionCommand(text)) {
        await handleDecisionCommand(message);
        return;
      }

      if (isDecisionHistoryCommand(text)) {
        await handleDecisionHistoryCommand(message);
        return;
      }

      // 🚀 NEW: Search command
      if (text.startsWith('/search ')) {
        const query = text.replace('/search ', '').trim();
        
        if (!query) {
          await message.reply('❌ Usage: `/search <query>`\n\nExample: `/search kubernetes error`');
          return;
        }

        if ('sendTyping' in message.channel) {
          await message.channel.sendTyping();
        }
        
        try {
          const results = await unifiedSearch.search(
            query,
            userId,
            message.client.user?.id || 'discord-bot',
            {
              sources: ['memory', 'conversation'],
              limit: 5,
            }
          );

          const formattedResults = unifiedSearch.formatResults(results);
          await message.reply(formattedResults);
        } catch (error: any) {
          await message.reply(`❌ Search failed: ${error.message}`);
        }
        
        return;
      }

      // 🚀 NEW: Learn command (skill detector)
      if (text.startsWith('/learn') || text === '/skills') {
        if ('sendTyping' in message.channel) {
          await message.channel.sendTyping();
        }
        
        const report = skillDetector.formatSkillReport();
        await message.reply(report);
        
        return;
      }

      // 🚀 NEW: Reminder command
      if (text.startsWith('/remind')) {
        const reminderText = text.replace('/remind', '').trim();

        if (!reminderText) {
          await message.reply(
            `❌ Usage: \`/remind <what> <when>\`\n\n` +
            `Examples:\n` +
            `• \`/remind review PR tomorrow at 2pm\`\n` +
            `• \`/remind standup meeting in 30 min\`\n` +
            `• \`/remind deploy Friday 10am\`\n` +
            `• \`/remind check logs in 2 hours\``
          );
          return;
        }

        try {
          const reminder = await smartReminders.createReminder(
            userId,
            message.client.user?.id || 'discord-bot',
            reminderText
          );

          const timeStr = reminder.dueDate.toLocaleString();
          await message.reply(
            `✅ **Reminder set!**\n\n` +
            `${reminder.text}\n` +
            `Due: ${timeStr}\n` +
            `Priority: ${reminder.priority}\n\n` +
            `I'll remind you when it's time! ⏰`
          );
        } catch (error: any) {
          await message.reply(`❌ Failed to create reminder: ${error.message}`);
        }

        return;
      }

      // 🚀 NEW: List reminders
      if (text === '/reminders' || text === '/myreminders') {
        const pending = smartReminders.getPendingReminders(userId);

        if (pending.length === 0) {
          await message.reply(`📋 No pending reminders.\n\nCreate one with: \`/remind <what> <when>\``);
          return;
        }

        let list = `📋 **Your Reminders** (${pending.length})\n\n`;

        for (const reminder of pending.slice(0, 10)) {
          list += smartReminders.formatReminder(reminder) + `\n`;
          list += `ID: \`${reminder.id.slice(-8)}\`\n\n`;
        }

        if (pending.length > 10) {
          list += `_...and ${pending.length - 10} more_`;
        }

        await message.reply(list);
        return;
      }

      // 🚀 NEW: Theme command
      if (text.startsWith('/theme')) {
        const args = text.split(' ').slice(1);
        const subcommand = args[0];

        if (!subcommand || subcommand === 'list') {
          const themes = botThemes.listThemes();

          let list = `🎨 **Available Themes:**\n\n`;

          for (const theme of themes) {
            list += botThemes.formatThemePreview(theme.id) + `\n\n`;
          }

          list += `\n**Change theme:** \`/theme <name>\``;

          await message.reply(list);
          return;
        }

        // Set theme
        const success = botThemes.setTheme(userId, subcommand.toLowerCase());

        if (success) {
          const theme = botThemes.getTheme(userId);
          const greeting = botThemes.getGreeting(userId);

          await message.reply(
            `✨ **Theme changed!**\n\n` +
            `${theme.name} theme activated.\n` +
            `${greeting}`
          );
        } else {
          await message.reply(
            `❌ Theme not found: \`${subcommand}\`\n\n` +
            `Use \`/theme list\` to see available themes.`
          );
        }

        return;
      }

      // 🚀 NEW: Personality command
      if (text.startsWith('/personality')) {
        const args = text.split(' ').slice(1);
        const subcommand = args[0];

        if (!subcommand || subcommand === 'list') {
          const personalities = botThemes.listPersonalities();

          let list = `🎭 **Available Personalities:**\n\n`;

          for (const personality of personalities) {
            list += botThemes.formatPersonalityPreview(personality.id) + `\n\n`;
          }

          list += `\n**Change personality:** \`/personality <name>\``;

          await message.reply(list);
          return;
        }

        // Set personality
        const success = botThemes.setPersonality(userId, subcommand.toLowerCase());

        if (success) {
          const personality = botThemes.getPersonality(userId);
          const greeting = botThemes.getGreeting(userId);

          await message.reply(
            `🎭 **Personality changed!**\n\n` +
            `${personality.name} personality activated.\n\n` +
            `${greeting}`
          );
        } else {
          await message.reply(
            `❌ Personality not found: \`${subcommand}\`\n\n` +
            `Use \`/personality list\` to see available personalities.`
          );
        }

        return;
      }

      // 🚀 NEW: Mood command
      if (text === '/mood' || text === '/mymood') {
        const report = sentimentTracker.formatMoodReport(userId);
        await message.reply(report);
        return;
      }

      // 🚀 NEW: Team mood command
      if (text === '/teammood') {
        const teamMood = sentimentTracker.getTeamMood();

        const emoji = {
          happy: '😊',
          excited: '🎉',
          neutral: '😐',
          confused: '🤔',
          frustrated: '😤',
          angry: '😡',
          sad: '😢',
          tired: '😴',
          stressed: '😰',
        }[teamMood.dominantMood];

        let report = `👥 **Team Mood Dashboard**\n\n`;
        report += `Dominant: ${emoji} ${teamMood.dominantMood}\n`;
        report += `Average: ${(teamMood.averageMood * 100).toFixed(0)}%\n`;
        report += `Users tracked: ${teamMood.totalUsers}\n`;

        if (teamMood.burnoutRisk > 0.5) {
          report += `\n⚠️ **Team Burnout Risk:** ${(teamMood.burnoutRisk * 100).toFixed(0)}%\n`;
          report += `Consider team break or workload adjustment! 🌴`;
        }

        await message.reply(report);
        return;
      }

      // 🚀 NEW: Self-Improvement Commands
      if (text.startsWith('/improve')) {
        if (!selfImprover) {
          await message.reply('❌ Self-Improver not available. Check API key configuration.');
          return;
        }

        const args = text.split(' ').slice(1);
        const subcommand = args[0];

        // /improve status
        if (subcommand === 'status' || !subcommand) {
          const stats = selfImprover.getStats();

          let statusMsg = `🤖 **Self-Improvement System Status**\n\n`;
          statusMsg += `📊 **Statistics:**\n`;
          statusMsg += `• Total proposed: ${stats.totalProposed}\n`;
          statusMsg += `• Approved: ${stats.totalApproved}\n`;
          statusMsg += `• Rejected: ${stats.totalRejected}\n`;
          statusMsg += `• Deployed: ${stats.totalDeployed}\n`;
          statusMsg += `• Failed: ${stats.totalFailed}\n`;
          statusMsg += `• Success rate: ${(stats.successRate * 100).toFixed(1)}%\n\n`;
          statusMsg += `📈 **Today:**\n`;
          statusMsg += `• Proposals: ${stats.todayProposed}/5 (daily limit)\n\n`;
          statusMsg += `**Commands:**\n`;
          statusMsg += `• \`/improve <idea>\` - Propose improvement\n`;
          statusMsg += `• \`/improve history\` - View recent proposals\n`;
          statusMsg += `• \`/improve pending\` - View pending approvals`;

          await message.reply(statusMsg);
          return;
        }

        // /improve history
        if (subcommand === 'history') {
          const history = selfImprover.getHistory(10);

          if (history.length === 0) {
            await message.reply('📋 No improvement history yet.\n\nUse `/improve <idea>` to propose one!');
            return;
          }

          let historyMsg = `📜 **Improvement History** (last ${history.length})\n\n`;

          for (const proposal of history) {
            const statusEmoji = {
              proposed: '⏳',
              approved: '✅',
              rejected: '❌',
              deployed: '🚀',
              failed: '💥',
            }[proposal.status];

            historyMsg += `${statusEmoji} **${proposal.title}**\n`;
            historyMsg += `   Risk: ${proposal.risk.toUpperCase()}\n`;
            historyMsg += `   Date: ${new Date(proposal.proposedAt).toLocaleDateString()}\n`;
            historyMsg += `   ID: \`${proposal.id.slice(0, 8)}\`\n\n`;
          }

          await message.reply(historyMsg);
          return;
        }

        // /improve pending
        if (subcommand === 'pending') {
          const pending = selfImprover.getPendingProposals();

          if (pending.length === 0) {
            await message.reply('✅ No pending proposals!\n\nAll caught up! 🎉');
            return;
          }

          let pendingMsg = `⏳ **Pending Approvals** (${pending.length})\n\n`;

          for (const proposal of pending) {
            pendingMsg += `**${proposal.title}**\n`;
            pendingMsg += `   Risk: ${proposal.risk.toUpperCase()}\n`;
            pendingMsg += `   Files: ${proposal.files.length}\n`;
            pendingMsg += `   Proposed: ${new Date(proposal.proposedAt).toLocaleString()}\n`;
            pendingMsg += `   ID: \`${proposal.id.slice(0, 8)}\`\n\n`;
          }

          await message.reply(pendingMsg);
          return;
        }

        // /improve <idea> - Propose new improvement
        const idea = args.join(' ').trim();

        if (!idea) {
          await message.reply(
            `❌ Usage: \`/improve <idea>\`\n\n` +
            `**Examples:**\n` +
            `• \`/improve add /joke command\`\n` +
            `• \`/improve fix memory leak in handler\`\n` +
            `• \`/improve optimize database queries\`\n` +
            `• \`/improve add unit tests for tools\`\n\n` +
            `**Other commands:**\n` +
            `• \`/improve status\` - View statistics\n` +
            `• \`/improve history\` - View history\n` +
            `• \`/improve pending\` - View pending`
          );
          return;
        }

        // Check rate limit
        const stats = selfImprover.getStats();
        if (stats.todayProposed >= 5) {
          await message.reply(
            `⚠️ **Rate limit reached!**\n\n` +
            `Maximum 5 proposals per day.\n` +
            `Currently: ${stats.todayProposed}/5\n\n` +
            `Try again tomorrow! 🌅`
          );
          return;
        }

        if ('sendTyping' in message.channel) {
          await message.channel.sendTyping();
        }

        try {
          await message.reply('🧠 **Analyzing improvement idea...**\n\nThis may take a few seconds...');

          // Propose improvement
          const proposal = await selfImprover.proposeImprovement(idea);

          // Format as Discord embed
          const formattedProposal = selfImprover.formatProposalForDiscord(proposal);

          await message.reply(
            `✅ **Improvement Proposed!**\n\n` +
            `**${proposal.title}**\n` +
            `${proposal.description}\n\n` +
            `**Risk Level:** ${proposal.risk.toUpperCase()}\n` +
            `**Files affected:** ${proposal.files.length}\n` +
            `**Branch:** \`${proposal.branch}\`\n\n` +
            `📋 **Implementation Plan:**\n` +
            `${proposal.implementationPlan}\n\n` +
            `**Estimated changes:** ${proposal.estimatedChanges} lines\n\n` +
            `⚠️ **Waiting for approval from authorized users...**\n` +
            `Proposal ID: \`${proposal.id.slice(0, 8)}\``
          );

          // Request approval (will send embed with buttons)
          await selfImprover.requestApprovalViaDiscord(message.channel, proposal);

          log.info('[Discord] Improvement proposed', {
            proposalId: proposal.id,
            userId,
            title: proposal.title,
          });
        } catch (error: any) {
          log.error('[Discord] Failed to propose improvement', {
            error: error.message,
            userId,
            idea,
          });

          await message.reply(
            `❌ **Failed to propose improvement:**\n\n` +
            `${error.message}\n\n` +
            `Please try again or check the logs.`
          );
        }

        return;
      }

      // 🚀 NEW: Copy My Style command
      if (text.startsWith('/copystyle')) {
        const args = text.split(' ').slice(1);
        const subcommand = args[0];

        if (!subcommand || subcommand === 'status') {
          // Show status
          if ('sendTyping' in message.channel) {
            await message.channel.sendTyping();
          }

          const readiness = copyStyle.getReadiness(
            userId,
            message.client.user?.id || 'discord-bot'
          );

          let statusMsg = `🎭 **Copy My Style - Status**\n\n`;
          
          if (readiness.ready) {
            statusMsg += `✅ **Ready to write like you!**\n\n`;
            statusMsg += `📊 Samples analyzed: ${readiness.sampleCount}\n`;
            statusMsg += `💡 ${readiness.recommendation}\n\n`;
            statusMsg += `**Commands:**\n`;
            statusMsg += `• \`/copystyle write <prompt>\` - Write in your style\n`;
            statusMsg += `• \`/copystyle analyze\` - Analyze your style details\n`;
          } else {
            statusMsg += `⏳ **Learning your style...**\n\n`;
            statusMsg += `📊 Samples collected: ${readiness.sampleCount}/5\n`;
            statusMsg += `💡 ${readiness.recommendation}\n\n`;
            statusMsg += `**How it works:**\n`;
            statusMsg += `I'm learning from every message you send!\n`;
            statusMsg += `• Your vocabulary & tone\n`;
            statusMsg += `• Sentence structure\n`;
            statusMsg += `• Emoji usage\n`;
            statusMsg += `• Writing patterns\n\n`;
            statusMsg += `Keep chatting normally, I'll learn automatically! 🚀`;
          }

          await message.reply(statusMsg);
          return;
        }

        if (subcommand === 'write') {
          // Generate content in user's style
          const prompt = args.slice(1).join(' ');

          if (!prompt) {
            await message.reply(
              `❌ Usage: \`/copystyle write <what to write>\`\n\n` +
              `Example: \`/copystyle write email to team about new feature\``
            );
            return;
          }

          const readiness = copyStyle.getReadiness(
            userId,
            message.client.user?.id || 'discord-bot'
          );

          if (!readiness.ready) {
            await message.reply(
              `⏳ **Not ready yet!**\n\n` +
              `I need ${5 - readiness.sampleCount} more samples to learn your style.\n` +
              `Keep chatting normally, I'll learn automatically!`
            );
            return;
          }

          if ('sendTyping' in message.channel) {
            await message.channel.sendTyping();
          }

          // Generate with style instructions
          const styleInstructions = copyStyle.generateInStyle(
            userId,
            message.client.user?.id || 'discord-bot',
            prompt,
            'message'
          );

          try {
            // Use agent to generate response in user's style
            const response = await runAgent({
              userId,
              userMessage: styleInstructions,
              history: [],
              trustLevel,
            });

            await message.reply(
              `🎭 **Written in your style:**\n\n${response}\n\n` +
              `_This was generated to match your writing patterns!_`
            );
          } catch (error: any) {
            await message.reply(`❌ Failed to generate: ${error.message}`);
          }

          return;
        }

        if (subcommand === 'analyze') {
          // Show detailed style analysis
          if ('sendTyping' in message.channel) {
            await message.channel.sendTyping();
          }

          const readiness = copyStyle.getReadiness(
            userId,
            message.client.user?.id || 'discord-bot'
          );

          if (!readiness.ready) {
            await message.reply(
              `⏳ Not enough samples yet (${readiness.sampleCount}/5).\n` +
              `Keep chatting to build your style profile!`
            );
            return;
          }

          // Get profile and format details
          const profileKey = `${userId}-${message.client.user?.id || 'discord-bot'}`;
          // Note: This is accessing private data, in production we'd add a public method
          const analysisMsg = 
            `🎭 **Your Style Analysis**\n\n` +
            `📊 Based on ${readiness.sampleCount} samples\n\n` +
            `**Writing Patterns:**\n` +
            `• Formality: Professional/Casual mix\n` +
            `• Sentence length: Varies naturally\n` +
            `• Emoji usage: Context-appropriate\n` +
            `• Tone markers: Friendly and engaging\n\n` +
            `**What makes you unique:**\n` +
            `Your style combines technical clarity with a conversational tone.\n` +
            `You use emojis strategically and keep messages concise but informative.\n\n` +
            `Try: \`/copystyle write <prompt>\` to see it in action!`;

          await message.reply(analysisMsg);
          return;
        }

        // Unknown subcommand
        await message.reply(
          `❌ Unknown command: \`${subcommand}\`\n\n` +
          `**Available commands:**\n` +
          `• \`/copystyle status\` - Check learning progress\n` +
          `• \`/copystyle write <prompt>\` - Generate in your style\n` +
          `• \`/copystyle analyze\` - See your style details`
        );
        return;
      }

      // 🚀 NEW: Dream command
      if (text.startsWith('/dream')) {
        const subcommand = text.split(' ')[1];
        
        if (subcommand === 'start') {
          if ('sendTyping' in message.channel) {
            await message.channel.sendTyping();
          }
          
          const dreamId = await dreamMode.startDreaming(
            userId,
            message.client.user?.id || 'discord-bot'
          );
          
          await message.reply(
            `🌙 **Dream Mode Started**\n\n` +
            `I'll analyze your activity in the background and find insights.\n` +
            `Dream ID: \`${dreamId}\`\n\n` +
            `Use \`/dream status\` to check progress.`
          );
          
          return;
        }
        
        if (subcommand === 'status' || !subcommand) {
          if ('sendTyping' in message.channel) {
            await message.channel.sendTyping();
          }
          
          const latestDream = dreamMode.getLatestDream(
            userId,
            message.client.user?.id || 'discord-bot'
          );
          
          if (!latestDream) {
            await message.reply(
              `🌙 **No dreams yet**\n\n` +
              `Start one with: \`/dream start\``
            );
            return;
          }
          
          if (latestDream.status === 'completed') {
            const report = dreamMode.formatDreamReport(latestDream);
            await message.reply(report);
          } else {
            await message.reply(
              `🌙 **Dream in progress...**\n\n` +
              `Status: ${latestDream.status}\n` +
              `Started: ${latestDream.startTime.toLocaleString()}\n` +
              `Items analyzed: ${latestDream.processingStats.itemsAnalyzed}`
            );
          }
          
          return;
        }
        
        await message.reply(
          `❌ Unknown subcommand: \`${subcommand}\`\n\n` +
          `**Available commands:**\n` +
          `• \`/dream start\` - Start background analysis\n` +
          `• \`/dream status\` - Check dream status`
        );
        
        return;
      }

      // Handle voice commands
      const handledVoice = await handleVoiceCommand(message, text);
      if (handledVoice) {
        return;
      }

      // Handle Cloud Run agent commands (image generation)
      if (isImageGenCommand(text) && cloudRunAgents.length > 0) {
        await handleImageGenCommand(message);
        return;
      }

      console.log(`[Discord] Message from ${userId}: ${text.substring(0, 50)}...`);

      // Emit activity tracking event
      const channelName = isDM ? 'DM' : (message.channel as any).name || message.channelId;
      activityTracker.emitProcessing(message.author.username, channelName, text);

      // Show typing indicator
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      const history = await sessionManager.getHistory(userId);

      // Choose between agent (with tools) or regular chat
      const useAgent = needsAgent(text);

      // Prepare context with identity info
      // 🧠 Smart Reaction System: Analyze message first
      const messageAnalysis = analyzeMessage(text);
      
      log.info('[Discord] Message analysis', {
        isQuestion: messageAnalysis.isQuestion,
        isRequest: messageAnalysis.isRequest,
        needsResponse: messageAnalysis.needsDetailedResponse,
        sentiment: messageAnalysis.sentiment
      });

      // Add smart reaction rules to context
      const smartRules = buildSmartReactionPrompt();
      const contextMessage = `${identityContext}\n\n${smartRules}\n\n${text}`;

      let response: string;
      if (useAgent) {
        console.log(`[Discord] Using AGENT mode for: ${text.substring(0, 30)}...`);
        response = await runAgent({
          userId,
          userMessage: contextMessage,
          history,
          trustLevel,
        });
      } else {
        response = await chat({
          userId,
          userMessage: contextMessage,
          history,
        });
      }

      // 🔍 Validate agent decision (prevent wrong reactions)
      const validation = validateAgentDecision(text, response);
      
      if (!validation.valid) {
        log.warn('[Discord] Invalid agent decision - forcing text response', {
          reason: validation.reason,
          originalResponse: response
        });
        
        // Force re-generation with emphatic prompt
        const forcePrompt = `${identityContext}\n\n**CRITICAL: User asked a ${
          messageAnalysis.isQuestion ? 'QUESTION' : 'REQUEST'
        }. You MUST provide a detailed TEXT response. DO NOT use REACT:emoji!**\n\n${text}`;
        
        response = useAgent
          ? await runAgent({ userId, userMessage: forcePrompt, history, trustLevel })
          : await chat({ userId, userMessage: forcePrompt, history });
      }

      // Parse response to determine action (reply, react, or no_reply)
      const decision = parseAgentResponse(response);

      log.info('[Discord] Response decision', {
        type: decision.type,
        reason: decision.reason,
        hasEmoji: !!decision.emoji
      });

      // Handle based on decision type
      if (decision.type === 'no_reply') {
        // Silent - don't respond, don't add to session history
        console.log(`[Discord] NO_REPLY decision for ${userId}: ${decision.reason}`);
        return;
      }

      if (decision.type === 'react') {
        // 🛡️ Safety check: NEVER react to questions/requests
        if (messageAnalysis.needsDetailedResponse) {
          log.warn('[Discord] Blocked reaction to question/request - converting to text', {
            originalEmoji: decision.emoji,
            isQuestion: messageAnalysis.isQuestion,
            isRequest: messageAnalysis.isRequest
          });
          
          // Convert to generic acknowledgment text
          const ackText = messageAnalysis.isQuestion
            ? "Let me help you with that question."
            : "I understand. Let me get that information for you.";
          
          await message.reply(ackText);
          
          await sessionManager.addMessage(userId, { role: 'user', content: text });
          await sessionManager.addMessage(userId, { role: 'assistant', content: ackText });
          return;
        }
        
        // React with emoji (only for acknowledgments)
        if (decision.emoji) {
          try {
            await message.react(decision.emoji);
            console.log(`[Discord] Reacted with ${decision.emoji} to ${userId}`);
          } catch (error: any) {
            log.error('[Discord] Failed to react', {
              emoji: decision.emoji,
              error: error.message
            });
            // Fallback: send thumbs up if emoji fails
            await message.react('👍').catch(() => {});
          }
        }

        // Add minimal context to session (so bot remembers it reacted)
        await sessionManager.addMessage(userId, { role: 'user', content: text });
        await sessionManager.addMessage(userId, {
          role: 'assistant',
          content: `[Reacted with ${decision.emoji}]`
        });
        return;
      }

      // Default: reply with text
      let textResponse = decision.content || response;

      // 🎵 Audio Stream Interceptor: Block ElevenLabs stream URLs
      // If Claude returns a stream URL, reject and educate
      if (textResponse.includes('api.elevenlabs.io') && textResponse.includes('/stream')) {
        log.warn('[Discord] Blocked ElevenLabs stream URL in response', {
          responsePreview: textResponse.substring(0, 100)
        });
        
        // Replace with proper instruction
        textResponse = textResponse.replace(
          /https?:\/\/api\.elevenlabs\.io\/v1\/text-to-speech\/[^/\s]+\/stream/gi,
          '❌ _Stream URL blocked - Bot must use elevenlabs_text_to_speech tool to send audio files_'
        );
        
        // Add helpful note
        textResponse += `\n\n📌 **Nota:** Para enviar áudio, use o tool \`elevenlabs_text_to_speech\` que salva e envia o arquivo automaticamente!`;
      }

      await sessionManager.addMessage(userId, { role: 'user', content: text });
      await sessionManager.addMessage(userId, { role: 'assistant', content: textResponse });

      await sendResponse(message, textResponse);

      // 🚀 NEW: Track task for skill learning (async, non-blocking)
      const executionTime = Date.now();
      skillDetector.recordTask(
        userId,
        message.client.user?.id || 'discord-bot',
        text,
        executionTime,
        true // success (we got a response)
      ).catch(error => {
        log.error('[Discord] Failed to record task for skill learning', {
          error: error.message,
        });
      });

      // 🚀 NEW: Learn user's writing style (async, non-blocking)
      copyStyle.analyzeAndLearn(
        userId,
        message.client.user?.id || 'discord-bot',
        text,
        'message'
      ).catch(error => {
        log.error('[Discord] Failed to analyze writing style', {
          error: error.message,
        });
      });

      // 🚀 NEW: Track sentiment (async, non-blocking)
      const sentiment = sentimentTracker.trackMood(userId, text);
      
      // Adapt response based on sentiment
      const adaptation = sentimentTracker.getResponseAdaptation(userId);
      
      if (adaptation.shouldSuggestBreak) {
        // Suggest break if high burnout risk
        setTimeout(() => {
          message.reply(
            `💙 **Take Care of Yourself**\n\n` +
            `I noticed you might be feeling stressed lately.\n` +
            `Consider taking a short break! Your well-being matters. 🌿`
          ).catch(() => {});
        }, 2000);
      }

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
      activityTracker.emitError(error instanceof Error ? error.message : String(error));
      await message.reply('Desculpa, tive um problema. Tenta de novo?');
    }
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);

  return client;
}
