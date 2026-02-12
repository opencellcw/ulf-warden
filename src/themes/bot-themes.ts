import { log } from '../logger';

/**
 * Bot Themes & Personalities System
 * 
 * Customize bot appearance and personality for maximum engagement.
 * 
 * Features:
 * - Visual themes (cyberpunk, minimal, neon, retro)
 * - Personalities (professional, casual, sarcastic, motivational)
 * - Custom color schemes
 * - Emoji styles
 * - Response formatting
 * - Mix & match themes + personalities
 * 
 * Example:
 *   /theme cyberpunk
 *   /personality sarcastic
 *   
 *   Result: Sarcastic bot with cyberpunk visuals 🔥
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  emojis: {
    success: string;
    error: string;
    warning: string;
    info: string;
    loading: string;
  };
  formatting: {
    codeBlock: 'standard' | 'fancy' | 'minimal';
    headers: 'bold' | 'underline' | 'emoji';
    lists: 'bullets' | 'numbers' | 'emojis';
  };
}

export interface Personality {
  id: string;
  name: string;
  description: string;
  traits: {
    formality: number; // 0-1 (casual to formal)
    enthusiasm: number; // 0-1 (calm to excited)
    verbosity: number; // 0-1 (concise to detailed)
    humor: number; // 0-1 (serious to funny)
  };
  vocabulary: {
    greetings: string[];
    farewells: string[];
    confirmations: string[];
    apologies: string[];
    encouragements: string[];
  };
  responseStyle: {
    prefixEmoji: boolean;
    usePuns: boolean;
    addMotivation: boolean;
    includeTips: boolean;
  };
}

export interface UserPreferences {
  userId: string;
  theme: string;
  personality: string;
  customColors?: Partial<Theme['colors']>;
  customEmojis?: Partial<Theme['emojis']>;
}

// Pre-defined themes
export const THEMES: Record<string, Theme> = {
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: '🌆 Neon lights and futuristic vibes',
    colors: {
      primary: '#00fff9',
      secondary: '#ff00ff',
      accent: '#ff006e',
      background: '#0a0e27',
      text: '#e0e0e0',
    },
    emojis: {
      success: '⚡',
      error: '⚠️',
      warning: '🔺',
      info: '💾',
      loading: '⏳',
    },
    formatting: {
      codeBlock: 'fancy',
      headers: 'emoji',
      lists: 'emojis',
    },
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: '⚪ Clean and simple',
    colors: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#999999',
      background: '#ffffff',
      text: '#333333',
    },
    emojis: {
      success: '✓',
      error: '✗',
      warning: '!',
      info: 'i',
      loading: '...',
    },
    formatting: {
      codeBlock: 'minimal',
      headers: 'bold',
      lists: 'bullets',
    },
  },

  neon: {
    id: 'neon',
    name: 'Neon Dreams',
    description: '🌈 Bright colors everywhere',
    colors: {
      primary: '#ff00ff',
      secondary: '#00ffff',
      accent: '#ffff00',
      background: '#1a1a2e',
      text: '#ffffff',
    },
    emojis: {
      success: '✨',
      error: '💥',
      warning: '⚡',
      info: '💫',
      loading: '🌀',
    },
    formatting: {
      codeBlock: 'fancy',
      headers: 'emoji',
      lists: 'emojis',
    },
  },

  retro: {
    id: 'retro',
    name: 'Retro',
    description: '📟 80s terminal vibes',
    colors: {
      primary: '#00ff00',
      secondary: '#00ff00',
      accent: '#00ff00',
      background: '#000000',
      text: '#00ff00',
    },
    emojis: {
      success: '[OK]',
      error: '[ERR]',
      warning: '[!!!]',
      info: '[>>>]',
      loading: '[...]',
    },
    formatting: {
      codeBlock: 'standard',
      headers: 'underline',
      lists: 'bullets',
    },
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    description: '💼 Business ready',
    colors: {
      primary: '#0066cc',
      secondary: '#003d7a',
      accent: '#00a3e0',
      background: '#f5f5f5',
      text: '#333333',
    },
    emojis: {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      loading: '⏳',
    },
    formatting: {
      codeBlock: 'standard',
      headers: 'bold',
      lists: 'numbers',
    },
  },
};

// Pre-defined personalities
export const PERSONALITIES: Record<string, Personality> = {
  professional: {
    id: 'professional',
    name: 'Professional',
    description: '💼 Polished and business-like',
    traits: {
      formality: 0.9,
      enthusiasm: 0.4,
      verbosity: 0.6,
      humor: 0.2,
    },
    vocabulary: {
      greetings: ['Hello', 'Good day', 'Greetings'],
      farewells: ['Best regards', 'Thank you', 'Have a productive day'],
      confirmations: ['Understood', 'Noted', 'Acknowledged'],
      apologies: ['I apologize', 'My apologies', 'I regret the inconvenience'],
      encouragements: ['Well done', 'Excellent work', 'Good progress'],
    },
    responseStyle: {
      prefixEmoji: false,
      usePuns: false,
      addMotivation: false,
      includeTips: true,
    },
  },

  casual: {
    id: 'casual',
    name: 'Casual',
    description: '😊 Friendly and relaxed',
    traits: {
      formality: 0.3,
      enthusiasm: 0.6,
      verbosity: 0.5,
      humor: 0.6,
    },
    vocabulary: {
      greetings: ['Hey!', 'Yo!', "What's up?", 'Hi there!'],
      farewells: ['See ya!', 'Catch you later!', 'Peace! ✌️', 'Later!'],
      confirmations: ['Got it!', 'Cool!', 'Awesome!', 'Sweet!'],
      apologies: ['Oops!', 'My bad!', 'Sorry about that!'],
      encouragements: ['Nice!', 'Great job!', "You're killing it!", 'Keep it up!'],
    },
    responseStyle: {
      prefixEmoji: true,
      usePuns: false,
      addMotivation: true,
      includeTips: true,
    },
  },

  sarcastic: {
    id: 'sarcastic',
    name: 'Sarcastic',
    description: '😏 Witty with a twist',
    traits: {
      formality: 0.5,
      enthusiasm: 0.4,
      verbosity: 0.6,
      humor: 0.9,
    },
    vocabulary: {
      greetings: ['Oh, hello there', "Well well well...", 'Fancy seeing you here'],
      farewells: ["Don't let the door hit you", 'Try not to break anything', 'Good luck with that'],
      confirmations: ['Oh really?', 'Fascinating', 'How surprising', 'Shocker'],
      apologies: ['My deepest regrets', "Oh I'm SO sorry", 'What a tragedy'],
      encouragements: ["Sure, that'll work", 'Bold strategy', "Couldn't have done it worse myself"],
    },
    responseStyle: {
      prefixEmoji: true,
      usePuns: true,
      addMotivation: false,
      includeTips: true,
    },
  },

  motivational: {
    id: 'motivational',
    name: 'Motivational',
    description: '🔥 Pump you up!',
    traits: {
      formality: 0.4,
      enthusiasm: 1.0,
      verbosity: 0.7,
      humor: 0.5,
    },
    vocabulary: {
      greetings: ["LET'S GO!", 'Ready to CRUSH IT?', 'Time to DOMINATE!'],
      farewells: ['Go GET IT!', 'You GOT THIS!', 'UNLEASH YOUR POTENTIAL!'],
      confirmations: ['ABSOLUTELY!', 'HELL YEAH!', 'NOW WE TALKING!'],
      apologies: ["That's just a setup for COMEBACK!", 'Temporary setback!'],
      encouragements: ['UNSTOPPABLE!', 'LEGENDARY!', 'CRUSHING IT!', 'ON FIRE! 🔥'],
    },
    responseStyle: {
      prefixEmoji: true,
      usePuns: false,
      addMotivation: true,
      includeTips: true,
    },
  },

  zen: {
    id: 'zen',
    name: 'Zen Master',
    description: '🧘 Calm and wise',
    traits: {
      formality: 0.6,
      enthusiasm: 0.3,
      verbosity: 0.8,
      humor: 0.3,
    },
    vocabulary: {
      greetings: ['Peace be with you', 'Welcome, friend', 'Greetings, seeker'],
      farewells: ['May you find clarity', 'Journey well', 'Peace'],
      confirmations: ['Indeed', 'As it should be', 'The path is clear'],
      apologies: ['All is as it must be', 'From challenge comes growth'],
      encouragements: ['You are capable', 'Trust the process', 'Balance will come'],
    },
    responseStyle: {
      prefixEmoji: true,
      usePuns: false,
      addMotivation: true,
      includeTips: true,
    },
  },
};

export class BotThemesSystem {
  private preferences: Map<string, UserPreferences> = new Map();

  constructor() {
    log.info('[BotThemes] Initialized');
  }

  /**
   * Set theme for user
   */
  setTheme(userId: string, themeId: string): boolean {
    if (!THEMES[themeId]) {
      return false;
    }

    let prefs = this.preferences.get(userId);
    if (!prefs) {
      prefs = {
        userId,
        theme: themeId,
        personality: 'professional',
      };
      this.preferences.set(userId, prefs);
    } else {
      prefs.theme = themeId;
    }

    log.info('[BotThemes] Theme changed', {
      userId,
      theme: themeId,
    });

    return true;
  }

  /**
   * Set personality for user
   */
  setPersonality(userId: string, personalityId: string): boolean {
    if (!PERSONALITIES[personalityId]) {
      return false;
    }

    let prefs = this.preferences.get(userId);
    if (!prefs) {
      prefs = {
        userId,
        theme: 'professional',
        personality: personalityId,
      };
      this.preferences.set(userId, prefs);
    } else {
      prefs.personality = personalityId;
    }

    log.info('[BotThemes] Personality changed', {
      userId,
      personality: personalityId,
    });

    return true;
  }

  /**
   * Get user preferences
   */
  getPreferences(userId: string): UserPreferences {
    return (
      this.preferences.get(userId) || {
        userId,
        theme: 'professional',
        personality: 'professional',
      }
    );
  }

  /**
   * Get theme
   */
  getTheme(userId: string): Theme {
    const prefs = this.getPreferences(userId);
    return THEMES[prefs.theme] || THEMES.professional;
  }

  /**
   * Get personality
   */
  getPersonality(userId: string): Personality {
    const prefs = this.getPreferences(userId);
    return PERSONALITIES[prefs.personality] || PERSONALITIES.professional;
  }

  /**
   * Format response with theme and personality
   */
  formatResponse(userId: string, text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): string {
    const theme = this.getTheme(userId);
    const personality = this.getPersonality(userId);

    let formatted = text;

    // Add emoji prefix based on personality
    if (personality.responseStyle.prefixEmoji) {
      const emoji = theme.emojis[type];
      formatted = `${emoji} ${formatted}`;
    }

    // Add motivation if personality wants it
    if (personality.responseStyle.addMotivation && type === 'success') {
      const motivation = this.getRandomFrom(personality.vocabulary.encouragements);
      formatted += `\n\n${motivation}`;
    }

    return formatted;
  }

  /**
   * Get greeting based on personality
   */
  getGreeting(userId: string): string {
    const personality = this.getPersonality(userId);
    return this.getRandomFrom(personality.vocabulary.greetings);
  }

  /**
   * Get farewell based on personality
   */
  getFarewell(userId: string): string {
    const personality = this.getPersonality(userId);
    return this.getRandomFrom(personality.vocabulary.farewells);
  }

  /**
   * Get confirmation based on personality
   */
  getConfirmation(userId: string): string {
    const personality = this.getPersonality(userId);
    return this.getRandomFrom(personality.vocabulary.confirmations);
  }

  /**
   * List all themes
   */
  listThemes(): Theme[] {
    return Object.values(THEMES);
  }

  /**
   * List all personalities
   */
  listPersonalities(): Personality[] {
    return Object.values(PERSONALITIES);
  }

  /**
   * Format theme preview
   */
  formatThemePreview(themeId: string): string {
    const theme = THEMES[themeId];
    if (!theme) return 'Theme not found';

    return (
      `**${theme.name}** - ${theme.description}\n\n` +
      `Colors: ${theme.colors.primary} / ${theme.colors.secondary}\n` +
      `Success: ${theme.emojis.success} | ` +
      `Error: ${theme.emojis.error} | ` +
      `Warning: ${theme.emojis.warning}`
    );
  }

  /**
   * Format personality preview
   */
  formatPersonalityPreview(personalityId: string): string {
    const personality = PERSONALITIES[personalityId];
    if (!personality) return 'Personality not found';

    return (
      `**${personality.name}** - ${personality.description}\n\n` +
      `Greeting: "${this.getRandomFrom(personality.vocabulary.greetings)}"\n` +
      `Confirmation: "${this.getRandomFrom(personality.vocabulary.confirmations)}"\n` +
      `Encouragement: "${this.getRandomFrom(personality.vocabulary.encouragements)}"`
    );
  }

  /**
   * Helper: get random item from array
   */
  private getRandomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}

// Singleton
let themesInstance: BotThemesSystem | null = null;

export function getBotThemes(): BotThemesSystem {
  if (!themesInstance) {
    themesInstance = new BotThemesSystem();
  }
  return themesInstance;
}

export const botThemes = getBotThemes();
