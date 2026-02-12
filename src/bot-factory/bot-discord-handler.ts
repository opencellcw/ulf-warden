import { Client, GatewayIntentBits, Message, EmbedBuilder } from 'discord.js';
import { BotRuntime, botRuntimeRegistry } from './bot-runtime';
import { botRegistry } from './registry';
import { BotConfig } from './types';
import { log } from '../logger';
import { generatePersonaEmbed, formatPersonaIntro } from './persona-formatter';

/**
 * Discord handler for individual bot instances
 * Each bot created via Bot Factory runs this handler
 * 
 * This is separate from Ulf's main handler - each bot is independent
 */

interface BotHandlerConfig {
  botId: string;
  discordToken: string;
  listenChannels?: string[]; // Optional: specific channels to listen to
}

export class BotDiscordHandler {
  private client: Client;
  private runtime: BotRuntime | null = null;
  private config: BotHandlerConfig;
  private botConfig: BotConfig | null = null;

  constructor(config: BotHandlerConfig) {
    this.config = config;
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
  }

  /**
   * Initialize bot and start listening
   */
  async start(): Promise<void> {
    try {
      // Load bot config from database
      const bot = await botRegistry.getBot(this.config.botId);
      
      if (!bot) {
        throw new Error(`Bot ${this.config.botId} not found in registry`);
      }

      this.botConfig = JSON.parse(bot.deploymentConfig) as BotConfig;

      log.info('[BotDiscordHandler] Starting bot', {
        botId: this.config.botId,
        type: this.botConfig.type,
        name: bot.name
      });

      // Get or create runtime
      this.runtime = await botRuntimeRegistry.getRuntime(
        this.config.botId,
        this.botConfig
      );

      // Set up Discord event handlers
      this.setupEventHandlers();

      // Login to Discord
      await this.client.login(this.config.discordToken);

      log.info('[BotDiscordHandler] Bot started successfully', {
        botId: this.config.botId,
        username: this.client.user?.username
      });
    } catch (error: any) {
      log.error('[BotDiscordHandler] Failed to start bot', {
        botId: this.config.botId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Set up Discord event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('ready', () => {
      log.info('[BotDiscordHandler] Discord client ready', {
        botId: this.config.botId,
        username: this.client.user?.tag
      });
    });

    this.client.on('messageCreate', async (message: Message) => {
      await this.handleMessage(message);
    });

    this.client.on('error', (error) => {
      log.error('[BotDiscordHandler] Discord client error', {
        botId: this.config.botId,
        error: error.message
      });
    });
  }

  /**
   * Handle incoming Discord messages
   */
  private async handleMessage(message: Message): Promise<void> {
    try {
      // Ignore bot messages
      if (message.author.bot) return;

      // Determine if bot should respond
      const isDM = message.channel.isDMBased();
      const isMentioned = message.mentions.has(this.client.user!);
      
      // Only respond if mentioned or in DM
      if (!isDM && !isMentioned) return;

      let text = message.content;

      // Remove mention from text
      if (isMentioned) {
        text = text.replace(/<@!?\d+>/g, '').trim();
      }

      if (!text) {
        // Send intro if no message
        const intro = formatPersonaIntro(
          this.botConfig!.name.replace('bot-', ''),
          this.botConfig!
        );
        await message.reply(intro);
        return;
      }

      // Special commands
      if (text.toLowerCase() === 'help' || text.toLowerCase() === 'ajuda') {
        const intro = formatPersonaIntro(
          this.botConfig!.name.replace('bot-', ''),
          this.botConfig!
        );
        await message.reply(intro);
        return;
      }

      log.info('[BotDiscordHandler] Processing message', {
        botId: this.config.botId,
        userId: message.author.id,
        textLength: text.length
      });

      // Show typing indicator
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      // Process message through runtime
      if (!this.runtime) {
        throw new Error('Runtime not initialized');
      }

      // Decide whether to use embed or plain text
      const useEmbed = this.shouldUseEmbed(text);

      const response = await this.runtime.processMessage(
        text,
        [], // TODO: Add conversation history support
        { 
          includePersonaHeader: !useEmbed, // Don't include header if using embed
          useEmbed 
        }
      );

      // Send response
      if (useEmbed && this.botConfig) {
        const embedData = generatePersonaEmbed(
          this.botConfig.name.replace('bot-', ''),
          this.botConfig,
          response
        );

        const embed = new EmbedBuilder()
          .setColor(embedData.color)
          .setAuthor({ name: embedData.author.name })
          .setDescription(embedData.description)
          .addFields(embedData.fields)
          .setFooter({ text: embedData.footer.text })
          .setTimestamp(new Date(embedData.timestamp));

        await message.reply({ embeds: [embed] });
      } else {
        // Send plain text response (already has persona header)
        await this.sendLongMessage(message, response);
      }

      log.info('[BotDiscordHandler] Response sent', {
        botId: this.config.botId,
        responseLength: response.length,
        useEmbed
      });
    } catch (error: any) {
      log.error('[BotDiscordHandler] Error handling message', {
        botId: this.config.botId,
        error: error.message
      });
      
      await message.reply('⚠️ Sorry, I encountered an error processing your message. Please try again.');
    }
  }

  /**
   * Decide whether to use Discord embed based on message context
   */
  private shouldUseEmbed(text: string): boolean {
    // Use embed for first interaction or help commands
    const lowerText = text.toLowerCase();
    
    if (lowerText === 'hello' || lowerText === 'hi' || lowerText === 'olá' || lowerText === 'oi') {
      return true;
    }

    if (lowerText.includes('who are you') || lowerText.includes('quem é você')) {
      return true;
    }

    // Use plain text for everything else (cleaner for conversation)
    return false;
  }

  /**
   * Send long messages (split if needed)
   */
  private async sendLongMessage(message: Message, text: string): Promise<void> {
    const maxLength = 2000; // Discord limit

    if (text.length <= maxLength) {
      await message.reply(text);
      return;
    }

    // Split into chunks
    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Find last newline before limit
      let splitIndex = remaining.lastIndexOf('\n', maxLength);
      if (splitIndex === -1) {
        splitIndex = maxLength;
      }

      chunks.push(remaining.substring(0, splitIndex));
      remaining = remaining.substring(splitIndex);
    }

    // Send first chunk as reply
    await message.reply(chunks[0]);

    // Send remaining chunks as follow-ups
    for (let i = 1; i < chunks.length; i++) {
      if ('send' in message.channel) {
        await (message.channel as any).send(chunks[i]);
      }
    }
  }

  /**
   * Stop the bot and cleanup
   */
  async stop(): Promise<void> {
    log.info('[BotDiscordHandler] Stopping bot', {
      botId: this.config.botId
    });

    // Cleanup runtime
    if (this.runtime) {
      await this.runtime.cleanup();
    }

    // Cleanup from registry
    await botRuntimeRegistry.removeRuntime(this.config.botId);

    // Destroy Discord client
    this.client.destroy();

    log.info('[BotDiscordHandler] Bot stopped', {
      botId: this.config.botId
    });
  }
}

/**
 * Start a bot instance (called from bot deployment)
 */
export async function startBotInstance(botId: string): Promise<BotDiscordHandler> {
  // Get Discord token from environment
  const discordToken = process.env.DISCORD_BOT_TOKEN;
  
  if (!discordToken) {
    throw new Error('DISCORD_BOT_TOKEN not configured');
  }

  const handler = new BotDiscordHandler({
    botId,
    discordToken
  });

  await handler.start();

  return handler;
}
