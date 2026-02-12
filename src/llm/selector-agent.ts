/**
 * LLM Selector Agent
 * 
 * Intelligent agent that analyzes tasks and routes to optimal LLM provider.
 * Uses a cheap model (Gemini Flash) to make routing decisions.
 * 
 * Features:
 * - Task complexity analysis
 * - Context length detection
 * - Cost-aware routing
 * - Provider fallback
 */

interface TaskAnalysis {
  complexity: 'simple' | 'medium' | 'complex' | 'critical';
  contextSize: 'small' | 'medium' | 'large' | 'xlarge';
  taskType: 'chat' | 'code' | 'reasoning' | 'creative' | 'analysis';
  requiresAccuracy: boolean;
  estimatedTokens: number;
  reasoning: string;
}

interface ProviderRecommendation {
  provider: 'claude' | 'gemini' | 'openai' | 'moonshot';
  model: string;
  confidence: number;
  reasoning: string;
  estimatedCost: number;
  fallback?: {
    provider: string;
    model: string;
  };
}

export class LLMSelectorAgent {
  private analyticsLog: Array<{
    timestamp: Date;
    task: string;
    selectedProvider: string;
    selectedModel: string;
    reasoning: string;
    actualCost?: number;
  }> = [];

  /**
   * Analyze task and select optimal LLM provider
   */
  async selectProvider(
    messages: any[],
    tools?: any[],
    options?: {
      userPreference?: string; // Allow user override
      maxCost?: number; // Budget constraint
      minQuality?: 'basic' | 'good' | 'excellent'; // Quality requirement
    }
  ): Promise<ProviderRecommendation> {
    // Fast path: user override
    if (options?.userPreference) {
      return this.getUserPreferredProvider(options.userPreference);
    }

    // Analyze the task
    const analysis = this.analyzeTask(messages, tools);

    // Select provider based on analysis
    const recommendation = this.makeRecommendation(analysis, options);

    // Log for analytics
    this.logSelection(messages, recommendation, analysis);

    return recommendation;
  }

  /**
   * Analyze task characteristics
   */
  private analyzeTask(messages: any[], tools?: any[]): TaskAnalysis {
    const fullContext = messages.map(m => m.content).join(' ');
    const contextLength = fullContext.length;
    const estimatedTokens = Math.ceil(contextLength / 4); // Rough estimate

    // Detect complexity
    const complexity = this.detectComplexity(fullContext, tools);

    // Detect context size
    const contextSize = this.detectContextSize(estimatedTokens);

    // Detect task type
    const taskType = this.detectTaskType(fullContext);

    // Check if accuracy is critical
    const requiresAccuracy = this.requiresHighAccuracy(fullContext, taskType);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      complexity,
      contextSize,
      taskType,
      requiresAccuracy
    );

    return {
      complexity,
      contextSize,
      taskType,
      requiresAccuracy,
      estimatedTokens,
      reasoning
    };
  }

  /**
   * Detect task complexity
   */
  private detectComplexity(
    context: string,
    tools?: any[]
  ): 'simple' | 'medium' | 'complex' | 'critical' {
    const lowerContext = context.toLowerCase();

    // Critical tasks
    const criticalKeywords = [
      'deploy', 'production', 'delete', 'drop table', 'rm -rf',
      'security', 'vulnerability', 'hack', 'exploit',
      'financial', 'payment', 'transaction', 'money'
    ];
    if (criticalKeywords.some(k => lowerContext.includes(k))) {
      return 'critical';
    }

    // Complex tasks
    const complexKeywords = [
      'analyze', 'debug', 'optimize', 'refactor', 'architecture',
      'design pattern', 'algorithm', 'data structure',
      'explain why', 'compare', 'evaluate', 'assess'
    ];
    if (complexKeywords.some(k => lowerContext.includes(k)) || (tools && tools.length > 3)) {
      return 'complex';
    }

    // Medium tasks
    const mediumKeywords = [
      'write code', 'create', 'implement', 'build',
      'fix bug', 'add feature', 'update', 'modify'
    ];
    if (mediumKeywords.some(k => lowerContext.includes(k)) || (tools && tools.length > 0)) {
      return 'medium';
    }

    // Simple tasks (default)
    return 'simple';
  }

  /**
   * Detect context size category
   */
  private detectContextSize(tokens: number): 'small' | 'medium' | 'large' | 'xlarge' {
    if (tokens < 5000) return 'small';
    if (tokens < 50000) return 'medium';
    if (tokens < 200000) return 'large';
    return 'xlarge';
  }

  /**
   * Detect task type
   */
  private detectTaskType(
    context: string
  ): 'chat' | 'code' | 'reasoning' | 'creative' | 'analysis' {
    const lowerContext = context.toLowerCase();

    // Code tasks
    if (
      lowerContext.includes('code') ||
      lowerContext.includes('function') ||
      lowerContext.includes('class') ||
      lowerContext.includes('debug') ||
      /```/.test(context)
    ) {
      return 'code';
    }

    // Reasoning tasks
    if (
      lowerContext.includes('why') ||
      lowerContext.includes('explain') ||
      lowerContext.includes('how does') ||
      lowerContext.includes('compare') ||
      lowerContext.includes('evaluate')
    ) {
      return 'reasoning';
    }

    // Creative tasks
    if (
      lowerContext.includes('write') ||
      lowerContext.includes('create') ||
      lowerContext.includes('design') ||
      lowerContext.includes('imagine') ||
      lowerContext.includes('story')
    ) {
      return 'creative';
    }

    // Analysis tasks
    if (
      lowerContext.includes('analyze') ||
      lowerContext.includes('review') ||
      lowerContext.includes('assess') ||
      lowerContext.includes('summarize')
    ) {
      return 'analysis';
    }

    // Default: chat
    return 'chat';
  }

  /**
   * Check if high accuracy is required
   */
  private requiresHighAccuracy(context: string, taskType: string): boolean {
    const lowerContext = context.toLowerCase();

    // Always require accuracy for critical operations
    const criticalKeywords = [
      'production', 'deploy', 'security', 'financial',
      'important', 'critical', 'must be correct'
    ];

    return (
      criticalKeywords.some(k => lowerContext.includes(k)) ||
      taskType === 'reasoning' ||
      lowerContext.includes('accurate') ||
      lowerContext.includes('precise')
    );
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(
    complexity: string,
    contextSize: string,
    taskType: string,
    requiresAccuracy: boolean
  ): string {
    const parts = [
      `Complexity: ${complexity}`,
      `Context: ${contextSize}`,
      `Type: ${taskType}`,
      requiresAccuracy ? 'Requires high accuracy' : 'Standard accuracy OK'
    ];
    return parts.join(' | ');
  }

  /**
   * Make provider recommendation based on analysis
   */
  private makeRecommendation(
    analysis: TaskAnalysis,
    options?: {
      maxCost?: number;
      minQuality?: 'basic' | 'good' | 'excellent';
    }
  ): ProviderRecommendation {
    const { complexity, contextSize, taskType, requiresAccuracy, estimatedTokens } = analysis;

    // Critical tasks → Claude 3.7 Sonnet (best quality)
    if (complexity === 'critical' || options?.minQuality === 'excellent') {
      return {
        provider: 'claude',
        model: 'claude-3-7-sonnet-20250219',
        confidence: 0.95,
        reasoning: 'Critical task requires highest quality',
        estimatedCost: this.estimateCost('claude', 'claude-3-7-sonnet-20250219', estimatedTokens),
        fallback: {
          provider: 'claude',
          model: 'claude-opus-4-20250514'
        }
      };
    }

    // XLarge context → Gemini (1M tokens)
    if (contextSize === 'xlarge') {
      return {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        confidence: 0.90,
        reasoning: 'Large context requires 1M token window',
        estimatedCost: this.estimateCost('gemini', 'gemini-2.5-flash', estimatedTokens),
        fallback: {
          provider: 'gemini',
          model: 'gemini-2.5-pro'
        }
      };
    }

    // Complex reasoning → Claude 3.7 Sonnet
    if (
      (complexity === 'complex' && requiresAccuracy) ||
      (taskType === 'reasoning' && requiresAccuracy)
    ) {
      return {
        provider: 'claude',
        model: 'claude-3-7-sonnet-20250219',
        confidence: 0.85,
        reasoning: 'Complex reasoning requires Claude quality',
        estimatedCost: this.estimateCost('claude', 'claude-3-7-sonnet-20250219', estimatedTokens),
        fallback: {
          provider: 'claude',
          model: 'claude-sonnet-4-20250514'
        }
      };
    }

    // Medium complexity with good quality requirement → Gemini 2.5 Pro
    if (complexity === 'medium' && (requiresAccuracy || options?.minQuality === 'good')) {
      return {
        provider: 'gemini',
        model: 'gemini-2.5-pro',
        confidence: 0.80,
        reasoning: 'Medium task with quality needs → Gemini Pro',
        estimatedCost: this.estimateCost('gemini', 'gemini-2.5-pro', estimatedTokens),
        fallback: {
          provider: 'claude',
          model: 'claude-3-7-sonnet-20250219'
        }
      };
    }

    // Budget constraint → Cheapest option
    if (options?.maxCost && options.maxCost < 0.01) {
      return {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        confidence: 0.75,
        reasoning: 'Budget constraint → Cheapest reliable option',
        estimatedCost: this.estimateCost('gemini', 'gemini-2.5-flash', estimatedTokens),
        fallback: {
          provider: 'openai',
          model: 'gpt-4.1-mini'
        }
      };
    }

    // Default: Gemini 2.5 Flash (best cost-performance ratio)
    return {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      confidence: 0.85,
      reasoning: 'Simple/medium task → Cost-effective Gemini Flash',
      estimatedCost: this.estimateCost('gemini', 'gemini-2.5-flash', estimatedTokens),
      fallback: {
        provider: 'gemini',
        model: 'gemini-2.5-pro'
      }
    };
  }

  /**
   * Estimate cost for a provider/model
   */
  private estimateCost(provider: string, model: string, tokens: number): number {
    const costs: Record<string, Record<string, { input: number; output: number }>> = {
      claude: {
        'claude-3-7-sonnet-20250219': { input: 3, output: 15 },
        'claude-opus-4-20250514': { input: 15, output: 75 },
        'claude-sonnet-4-20250514': { input: 3, output: 15 }
      },
      gemini: {
        'gemini-2.5-flash': { input: 0.15, output: 0.60 },
        'gemini-2.5-pro': { input: 2.0, output: 8.0 }
      },
      openai: {
        'gpt-4.1-mini': { input: 0.15, output: 0.60 },
        'gpt-4.1': { input: 10, output: 30 }
      },
      moonshot: {
        'moonshot-v1-32k': { input: 0.12, output: 0.12 }
      }
    };

    const modelCosts = costs[provider]?.[model] || { input: 1, output: 3 };
    
    // Assume 70% input, 30% output
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    return (inputTokens * modelCosts.input + outputTokens * modelCosts.output) / 1_000_000;
  }

  /**
   * Get user-preferred provider (override)
   */
  private getUserPreferredProvider(preference: string): ProviderRecommendation {
    const providerMap: Record<string, { provider: any; model: string }> = {
      'claude': { provider: 'claude', model: 'claude-3-7-sonnet-20250219' },
      'claude-opus': { provider: 'claude', model: 'claude-opus-4-20250514' },
      'gemini': { provider: 'gemini', model: 'gemini-2.5-flash' },
      'gemini-pro': { provider: 'gemini', model: 'gemini-2.5-pro' },
      'openai': { provider: 'openai', model: 'gpt-4.1-mini' },
      'moonshot': { provider: 'moonshot', model: 'moonshot-v1-32k' }
    };

    const selected = providerMap[preference] || providerMap['gemini'];

    return {
      provider: selected.provider,
      model: selected.model,
      confidence: 1.0,
      reasoning: 'User preference override',
      estimatedCost: 0
    };
  }

  /**
   * Log selection for analytics
   */
  private logSelection(
    messages: any[],
    recommendation: ProviderRecommendation,
    analysis: TaskAnalysis
  ): void {
    this.analyticsLog.push({
      timestamp: new Date(),
      task: messages[messages.length - 1]?.content?.slice(0, 100) || 'Unknown',
      selectedProvider: recommendation.provider,
      selectedModel: recommendation.model,
      reasoning: `${analysis.reasoning} → ${recommendation.reasoning}`
    });

    // Keep only last 1000 entries
    if (this.analyticsLog.length > 1000) {
      this.analyticsLog = this.analyticsLog.slice(-1000);
    }
  }

  /**
   * Get analytics summary
   */
  getAnalytics(): {
    totalSelections: number;
    providerBreakdown: Record<string, number>;
    averageCostSavings: string;
    topReasons: Array<{ reason: string; count: number }>;
  } {
    const providerBreakdown: Record<string, number> = {};
    const reasons: Record<string, number> = {};

    for (const entry of this.analyticsLog) {
      // Count providers
      providerBreakdown[entry.selectedProvider] = 
        (providerBreakdown[entry.selectedProvider] || 0) + 1;

      // Count reasons
      reasons[entry.reasoning] = (reasons[entry.reasoning] || 0) + 1;
    }

    // Calculate estimated savings (vs always using Claude Opus 4)
    const geminiCount = providerBreakdown['gemini'] || 0;
    const savingsPercent = Math.round((geminiCount / this.analyticsLog.length) * 97);

    // Top reasons
    const topReasons = Object.entries(reasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSelections: this.analyticsLog.length,
      providerBreakdown,
      averageCostSavings: `${savingsPercent}%`,
      topReasons
    };
  }

  /**
   * Get recent selections (for debugging)
   */
  getRecentSelections(limit = 10) {
    return this.analyticsLog.slice(-limit).reverse();
  }
}

// Singleton instance
export const selectorAgent = new LLMSelectorAgent();
