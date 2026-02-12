import { log } from '../logger';

/**
 * Sentiment Tracking System
 * 
 * Tracks user mood and adapts bot responses accordingly.
 * 
 * Features:
 * - Real-time sentiment analysis
 * - Mood history tracking
 * - Burnout detection
 * - Team mood dashboard
 * - Proactive support
 * - Response adaptation
 * 
 * Example:
 *   User: "This bug is driving me CRAZY!!!"
 *   Detected: 😤 Frustrated (85%)
 *   
 *   Bot adapts:
 *   - More empathetic
 *   - Offers quick solutions
 *   - Suggests break
 *   - "I got this, let me handle it"
 */

export type SentimentType =
  | 'happy' // 😊
  | 'excited' // 🎉
  | 'neutral' // 😐
  | 'confused' // 🤔
  | 'frustrated' // 😤
  | 'angry' // 😡
  | 'sad' // 😢
  | 'tired' // 😴
  | 'stressed'; // 😰

export interface SentimentScore {
  type: SentimentType;
  confidence: number; // 0-1
  intensity: number; // 0-1
  timestamp: Date;
}

export interface MoodEntry {
  userId: string;
  timestamp: Date;
  sentiment: SentimentScore;
  message: string;
  context?: string;
}

export interface MoodHistory {
  userId: string;
  entries: MoodEntry[];
  currentMood: SentimentType;
  averageMood: number; // -1 to 1 (negative to positive)
  moodTrend: 'improving' | 'stable' | 'declining';
  burnoutRisk: number; // 0-1
}

export class SentimentTracker {
  private history: Map<string, MoodEntry[]> = new Map();

  // Sentiment keywords and patterns
  private readonly patterns = {
    happy: [
      /\b(happy|glad|great|awesome|amazing|wonderful|fantastic|excellent|love|loving)\b/i,
      /😊|😀|😁|🙂|😄|🥰|❤️/,
      /\b(thanks|thank you|appreciate)\b/i,
    ],
    excited: [
      /\b(excited|pumped|hyped|stoked|cant wait|looking forward)\b/i,
      /🎉|🚀|🔥|⚡|💪|🙌/,
      /!/,
    ],
    confused: [
      /\b(confused|lost|dont understand|not sure|unclear|what|how|why)\?/i,
      /🤔|❓|🤷/,
      /\?\?+/,
    ],
    frustrated: [
      /\b(frustrated|annoying|irritating|stuck|again|still not working)\b/i,
      /😤|😠|🙄|😒/,
      /!!+/,
    ],
    angry: [
      /\b(angry|furious|pissed|mad|hate|stupid|wtf|damn|shit|fuck)\b/i,
      /😡|🤬|💢/,
      /[A-Z]{4,}/,
    ],
    sad: [
      /\b(sad|depressed|down|disappointed|unfortunate|failed|failure)\b/i,
      /😢|😞|😔|😟|☹️|😿/,
    ],
    tired: [
      /\b(tired|exhausted|burned out|burnout|cant anymore|done)\b/i,
      /😴|😫|😩|🥱/,
    ],
    stressed: [
      /\b(stressed|overwhelmed|too much|pressure|deadline|urgent|asap|help)\b/i,
      /😰|😱|😨|💀/,
    ],
  };

  constructor() {
    log.info('[SentimentTracker] Initialized');
  }

  /**
   * Analyze sentiment from text
   */
  analyzeSentiment(text: string): SentimentScore {
    const scores: Record<SentimentType, number> = {
      happy: 0,
      excited: 0,
      neutral: 0,
      confused: 0,
      frustrated: 0,
      angry: 0,
      sad: 0,
      tired: 0,
      stressed: 0,
    };

    // Check each sentiment pattern
    for (const [sentiment, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          scores[sentiment as SentimentType] += matches.length;
        }
      }
    }

    // Find dominant sentiment
    let maxScore = 0;
    let dominant: SentimentType = 'neutral';

    for (const [sentiment, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = sentiment as SentimentType;
      }
    }

    // Calculate confidence and intensity
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? maxScore / totalScore : 0.5;
    const intensity = Math.min(maxScore / 5, 1); // Normalize to 0-1

    return {
      type: dominant,
      confidence,
      intensity,
      timestamp: new Date(),
    };
  }

  /**
   * Track user mood
   */
  trackMood(userId: string, message: string, context?: string): SentimentScore {
    const sentiment = this.analyzeSentiment(message);

    const entry: MoodEntry = {
      userId,
      timestamp: new Date(),
      sentiment,
      message: message.substring(0, 100), // Store first 100 chars
      context,
    };

    // Get or create history
    let userHistory = this.history.get(userId);
    if (!userHistory) {
      userHistory = [];
      this.history.set(userId, userHistory);
    }

    // Add entry
    userHistory.push(entry);

    // Keep last 100 entries
    if (userHistory.length > 100) {
      userHistory.shift();
    }

    log.info('[SentimentTracker] Mood tracked', {
      userId,
      sentiment: sentiment.type,
      confidence: sentiment.confidence.toFixed(2),
      intensity: sentiment.intensity.toFixed(2),
    });

    return sentiment;
  }

  /**
   * Get mood history for user
   */
  getMoodHistory(userId: string): MoodHistory {
    const entries = this.history.get(userId) || [];

    if (entries.length === 0) {
      return {
        userId,
        entries: [],
        currentMood: 'neutral',
        averageMood: 0,
        moodTrend: 'stable',
        burnoutRisk: 0,
      };
    }

    // Current mood (last entry)
    const currentMood = entries[entries.length - 1].sentiment.type;

    // Calculate average mood score
    const moodScores = entries.map(e => this.getSentimentValue(e.sentiment.type));
    const averageMood = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;

    // Calculate trend
    const recentScores = moodScores.slice(-10);
    const olderScores = moodScores.slice(-20, -10);
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / (olderScores.length || 1);

    const moodTrend =
      recentAvg > olderAvg + 0.1
        ? 'improving'
        : recentAvg < olderAvg - 0.1
        ? 'declining'
        : 'stable';

    // Calculate burnout risk
    const burnoutRisk = this.calculateBurnoutRisk(entries);

    return {
      userId,
      entries,
      currentMood,
      averageMood,
      moodTrend,
      burnoutRisk,
    };
  }

  /**
   * Get sentiment value (-1 to 1)
   */
  private getSentimentValue(sentiment: SentimentType): number {
    const values: Record<SentimentType, number> = {
      happy: 0.8,
      excited: 1.0,
      neutral: 0.0,
      confused: -0.2,
      frustrated: -0.5,
      angry: -0.8,
      sad: -0.7,
      tired: -0.4,
      stressed: -0.6,
    };

    return values[sentiment] || 0;
  }

  /**
   * Calculate burnout risk
   */
  private calculateBurnoutRisk(entries: MoodEntry[]): number {
    if (entries.length < 10) return 0;

    const recent = entries.slice(-20);

    // Factors:
    // 1. High frequency of negative emotions
    const negativeCount = recent.filter(e =>
      ['frustrated', 'angry', 'stressed', 'tired'].includes(e.sentiment.type)
    ).length;
    const negativeRatio = negativeCount / recent.length;

    // 2. Declining trend
    const scores = recent.map(e => this.getSentimentValue(e.sentiment.type));
    const firstHalf = scores.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const secondHalf = scores.slice(10).reduce((a, b) => a + b, 0) / 10;
    const decline = Math.max(0, firstHalf - secondHalf);

    // 3. Intensity of stress/frustration
    const intensityAvg =
      recent
        .filter(e => ['stressed', 'frustrated', 'tired'].includes(e.sentiment.type))
        .reduce((sum, e) => sum + e.sentiment.intensity, 0) / (recent.length || 1);

    // Combine factors
    const risk = (negativeRatio * 0.4 + decline * 0.3 + intensityAvg * 0.3);

    return Math.min(risk, 1);
  }

  /**
   * Get response adaptation suggestions
   */
  getResponseAdaptation(userId: string): {
    tone: 'empathetic' | 'neutral' | 'cheerful';
    suggestions: string[];
    shouldOfferHelp: boolean;
    shouldSuggestBreak: boolean;
  } {
    const history = this.getMoodHistory(userId);
    const current = history.currentMood;

    // Empathetic tone for negative emotions
    if (['frustrated', 'angry', 'stressed', 'sad'].includes(current)) {
      return {
        tone: 'empathetic',
        suggestions: [
          'Acknowledge frustration',
          'Offer immediate solutions',
          'Be more concise',
          'Show you understand',
        ],
        shouldOfferHelp: true,
        shouldSuggestBreak: history.burnoutRisk > 0.6,
      };
    }

    // Cheerful for positive emotions
    if (['happy', 'excited'].includes(current)) {
      return {
        tone: 'cheerful',
        suggestions: [
          'Celebrate success',
          'Build on momentum',
          'Suggest next challenge',
        ],
        shouldOfferHelp: false,
        shouldSuggestBreak: false,
      };
    }

    // Neutral default
    return {
      tone: 'neutral',
      suggestions: ['Professional tone', 'Clear and direct'],
      shouldOfferHelp: false,
      shouldSuggestBreak: false,
    };
  }

  /**
   * Format mood report
   */
  formatMoodReport(userId: string): string {
    const history = this.getMoodHistory(userId);

    const emoji = this.getMoodEmoji(history.currentMood);
    const trendEmoji = {
      improving: '📈',
      stable: '➡️',
      declining: '📉',
    }[history.moodTrend];

    let report = `🧠 **Mood Report**\n\n`;
    report += `Current: ${emoji} ${history.currentMood}\n`;
    report += `Trend: ${trendEmoji} ${history.moodTrend}\n`;
    report += `Average: ${(history.averageMood * 100).toFixed(0)}%\n`;

    if (history.burnoutRisk > 0.5) {
      report += `\n⚠️ **Burnout Risk:** ${(history.burnoutRisk * 100).toFixed(0)}%\n`;
      report += `Consider taking a break! 🌴`;
    }

    return report;
  }

  /**
   * Get mood emoji
   */
  private getMoodEmoji(mood: SentimentType): string {
    const emojis: Record<SentimentType, string> = {
      happy: '😊',
      excited: '🎉',
      neutral: '😐',
      confused: '🤔',
      frustrated: '😤',
      angry: '😡',
      sad: '😢',
      tired: '😴',
      stressed: '😰',
    };

    return emojis[mood] || '😐';
  }

  /**
   * Get team mood (average of all users)
   */
  getTeamMood(): {
    averageMood: number;
    dominantMood: SentimentType;
    burnoutRisk: number;
    totalUsers: number;
  } {
    const allUsers = Array.from(this.history.keys());

    if (allUsers.length === 0) {
      return {
        averageMood: 0,
        dominantMood: 'neutral',
        burnoutRisk: 0,
        totalUsers: 0,
      };
    }

    const histories = allUsers.map(userId => this.getMoodHistory(userId));

    const averageMood =
      histories.reduce((sum, h) => sum + h.averageMood, 0) / histories.length;

    const burnoutRisk =
      histories.reduce((sum, h) => sum + h.burnoutRisk, 0) / histories.length;

    // Find dominant mood
    const moodCounts: Record<string, number> = {};
    for (const history of histories) {
      moodCounts[history.currentMood] = (moodCounts[history.currentMood] || 0) + 1;
    }

    const dominantMood = Object.entries(moodCounts).sort(
      ([, a], [, b]) => b - a
    )[0][0] as SentimentType;

    return {
      averageMood,
      dominantMood,
      burnoutRisk,
      totalUsers: allUsers.length,
    };
  }
}

// Singleton
let sentimentInstance: SentimentTracker | null = null;

export function getSentimentTracker(): SentimentTracker {
  if (!sentimentInstance) {
    sentimentInstance = new SentimentTracker();
  }
  return sentimentInstance;
}

export const sentimentTracker = getSentimentTracker();
