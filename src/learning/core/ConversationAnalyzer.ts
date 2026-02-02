/**
 * Conversation Analyzer
 * Analisa conversas em tempo real e extrai insights
 */

import Anthropic from '@anthropic-ai/sdk';
import { Message, ConversationAnalysis, Learning, LearningOpportunity } from '../types';
import { log } from '../../logger';

export class ConversationAnalyzer {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Analisa uma interação completa
   */
  async analyzeInteraction(messages: Message[]): Promise<ConversationAnalysis> {
    try {
      const conversationText = messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n\n');

      const analysisPrompt = `Analyze this conversation and provide structured analysis:

${conversationText}

Provide analysis in JSON format:
{
  "sentiment": <number from -1.0 to 1.0>,
  "topics": [<array of topics discussed>],
  "successRating": <number from 0.0 to 1.0, how successful was the interaction>,
  "complexity": <number from 0.0 to 1.0>,
  "userIntent": "<what did the user want to accomplish>",
  "learningOpportunities": [
    {
      "type": "<technical|personal|behavioral|contextual>",
      "description": "<what could be learned>",
      "confidence": <0.0 to 1.0>,
      "importance": <0.0 to 1.0>
    }
  ]
}`;

      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307', // Fast and cheap for analysis
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: analysisPrompt
        }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        log.warn('[ConversationAnalyzer] No JSON found in response');
        return this.getFallbackAnalysis();
      }

      const analysis = JSON.parse(jsonMatch[0]);
      return analysis;

    } catch (error: any) {
      log.error('[ConversationAnalyzer] Analysis failed', { error: error.message });
      return this.getFallbackAnalysis();
    }
  }

  /**
   * Extrai learnings estruturados da análise
   */
  async extractLearnings(analysis: ConversationAnalysis, userId: string): Promise<Learning[]> {
    const learnings: Learning[] = [];

    for (const opportunity of analysis.learningOpportunities) {
      // Só extrai learnings com confidence alta o suficiente
      if (opportunity.confidence < 0.6) continue;

      learnings.push({
        category: opportunity.type,
        content: opportunity.description,
        confidence: opportunity.confidence,
        applied: false,
        importance: opportunity.importance,
        source: `conversation_${userId}`,
      });
    }

    return learnings;
  }

  /**
   * Analisa sentiment de uma mensagem isolada (rápido)
   */
  async analyzeSentiment(text: string): Promise<number> {
    try {
      // Simple sentiment analysis usando keywords
      const positiveKeywords = ['obrigado', 'thanks', 'perfeito', 'ótimo', 'excelente', 'legal', 'bom'];
      const negativeKeywords = ['erro', 'errado', 'ruim', 'problema', 'não funciona', 'bug'];

      const textLower = text.toLowerCase();
      let score = 0;

      for (const keyword of positiveKeywords) {
        if (textLower.includes(keyword)) score += 0.2;
      }

      for (const keyword of negativeKeywords) {
        if (textLower.includes(keyword)) score -= 0.2;
      }

      // Clamp to -1.0 to 1.0
      return Math.max(-1.0, Math.min(1.0, score));

    } catch (error) {
      return 0; // Neutral
    }
  }

  /**
   * Identifica topics da conversa (rápido, baseado em keywords)
   */
  identifyTopics(messages: Message[]): string[] {
    const topicKeywords: Record<string, string[]> = {
      'deployment': ['deploy', 'kubernetes', 'k8s', 'gke', 'docker', 'container'],
      'coding': ['código', 'code', 'function', 'class', 'bug', 'error'],
      'api': ['api', 'endpoint', 'request', 'response', 'webhook'],
      'database': ['database', 'sql', 'query', 'table', 'db'],
      'security': ['security', 'token', 'password', 'auth', 'credential'],
      'media': ['imagem', 'image', 'video', 'audio', 'photo'],
      'general': ['help', 'como', 'how', 'what', 'why'],
    };

    const topics = new Set<string>();
    const allText = messages.map(m => m.content.toLowerCase()).join(' ');

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => allText.includes(keyword))) {
        topics.add(topic);
      }
    }

    return Array.from(topics);
  }

  /**
   * Calcula complexity score baseado em tamanho e estrutura
   */
  calculateComplexity(messages: Message[]): number {
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    const avgLength = totalLength / messages.length;

    // Complexity based on message length and count
    const lengthScore = Math.min(1.0, avgLength / 1000);
    const countScore = Math.min(1.0, messages.length / 10);

    return (lengthScore + countScore) / 2;
  }

  /**
   * Análise fallback se API falhar
   */
  private getFallbackAnalysis(): ConversationAnalysis {
    return {
      sentiment: 0,
      topics: ['general'],
      successRating: 0.5,
      complexity: 0.5,
      userIntent: 'unknown',
      learningOpportunities: [],
    };
  }
}
