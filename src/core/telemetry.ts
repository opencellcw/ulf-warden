import { trace, SpanStatusCode, context, Span, SpanKind } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ConsoleSpanExporter, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { log } from '../logger';

const SERVICE_NAME = 'opencell-ai';

// PII patterns to scrub
const PII_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[CREDIT_CARD]' },
  { pattern: /\b\d{3}-\d{3}-\d{4}\b/g, replacement: '[PHONE]' },
  { pattern: /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/gi, replacement: 'Bearer [JWT]' },
  { pattern: /sk-[a-zA-Z0-9]{48}/g, replacement: 'sk-[API_KEY]' },
  { pattern: /sk-ant-[a-zA-Z0-9_-]+/g, replacement: 'sk-ant-[API_KEY]' },
  { pattern: /xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+/g, replacement: 'xoxb-[SLACK_TOKEN]' },
];

// Claude API pricing (as of 2026)
const CLAUDE_PRICING = {
  'claude-sonnet-4': { input: 3.0, output: 15.0 }, // $ per 1M tokens
  'claude-haiku-3.5': { input: 0.8, output: 4.0 },
  'claude-opus-4': { input: 15.0, output: 75.0 }
};

export interface TraceContext {
  traceId?: string;
  spanId?: string;
  userId?: string;
  toolName?: string;
  workflowName?: string;
}

export interface CostInfo {
  inputTokens: number;
  outputTokens: number;
  model: string;
  estimatedCost: number; // in USD
}

export class TelemetryManager {
  private provider: NodeTracerProvider | null = null;
  private tracer: any;
  private enabled: boolean;
  private totalCost: number = 0;
  private costByUser: Map<string, number> = new Map();
  private costByTool: Map<string, number> = new Map();

  constructor() {
    this.enabled = process.env.TELEMETRY_ENABLED === 'true';

    if (this.enabled) {
      this.initializeTracing();
    } else {
      log.info('[Telemetry] Disabled (set TELEMETRY_ENABLED=true to enable)');
    }
  }

  /**
   * Initialize OpenTelemetry tracing
   */
  private initializeTracing(): void {
    try {
      this.provider = new NodeTracerProvider({
        resource: new Resource({
          [ATTR_SERVICE_NAME]: SERVICE_NAME,
          [ATTR_SERVICE_VERSION]: process.env.VERSION || '1.0.0'
        })
      });

      // Use console exporter for local development
      // In production, replace with OTLP exporter
      this.provider.addSpanProcessor(
        new BatchSpanProcessor(new ConsoleSpanExporter())
      );

      this.provider.register();
      this.tracer = trace.getTracer(SERVICE_NAME);

      log.info('[Telemetry] Initialized with OpenTelemetry', {
        service: SERVICE_NAME,
        exporter: 'console'
      });
    } catch (error) {
      log.error('[Telemetry] Failed to initialize', { error });
      this.enabled = false;
    }
  }

  /**
   * Scrub PII from data
   */
  scrubPII(data: any): any {
    if (typeof data === 'string') {
      let scrubbed = data;
      for (const { pattern, replacement } of PII_PATTERNS) {
        scrubbed = scrubbed.replace(pattern, replacement);
      }
      return scrubbed;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.scrubPII(item));
    }

    if (typeof data === 'object' && data !== null) {
      const scrubbed: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Also scrub keys that might contain PII
        const scrubbedKey = key.toLowerCase().includes('email') ||
                          key.toLowerCase().includes('phone') ||
                          key.toLowerCase().includes('password')
          ? `${key}_REDACTED`
          : key;
        scrubbed[scrubbedKey] = this.scrubPII(value);
      }
      return scrubbed;
    }

    return data;
  }

  /**
   * Start a new span
   */
  startSpan(name: string, attributes?: Record<string, any>, kind?: SpanKind): Span | null {
    if (!this.enabled || !this.tracer) {
      return null;
    }

    try {
      const scrubbedAttributes = attributes ? this.scrubPII(attributes) : {};
      return this.tracer.startSpan(name, {
        kind: kind || SpanKind.INTERNAL,
        attributes: scrubbedAttributes
      });
    } catch (error) {
      log.error('[Telemetry] Failed to start span', { error, name });
      return null;
    }
  }

  /**
   * Wrap function execution in a span
   */
  async trace<T>(
    name: string,
    fn: (span: Span | null) => Promise<T>,
    attributes?: Record<string, any>,
    kind?: SpanKind
  ): Promise<T> {
    if (!this.enabled) {
      return await fn(null);
    }

    const span = this.startSpan(name, attributes, kind);

    try {
      const result = await fn(span);
      span?.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span?.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message
      });
      span?.recordException(error as Error);
      throw error;
    } finally {
      span?.end();
    }
  }

  /**
   * Add event to current span
   */
  addEvent(name: string, attributes?: Record<string, any>): void {
    if (!this.enabled) {
      return;
    }

    try {
      const span = trace.getActiveSpan();
      if (span) {
        const scrubbedAttributes = attributes ? this.scrubPII(attributes) : {};
        span.addEvent(name, scrubbedAttributes);
      }
    } catch (error) {
      log.error('[Telemetry] Failed to add event', { error, name });
    }
  }

  /**
   * Set attribute on current span
   */
  setAttribute(key: string, value: any): void {
    if (!this.enabled) {
      return;
    }

    try {
      const span = trace.getActiveSpan();
      if (span) {
        const scrubbedValue = this.scrubPII(value);
        span.setAttribute(key, scrubbedValue);
      }
    } catch (error) {
      log.error('[Telemetry] Failed to set attribute', { error, key });
    }
  }

  /**
   * Track cost for LLM call
   */
  trackCost(costInfo: CostInfo, userId?: string, toolName?: string): void {
    const { inputTokens, outputTokens, model, estimatedCost } = costInfo;

    // Update total cost
    this.totalCost += estimatedCost;

    // Update cost by user
    if (userId) {
      const currentCost = this.costByUser.get(userId) || 0;
      this.costByUser.set(userId, currentCost + estimatedCost);
    }

    // Update cost by tool
    if (toolName) {
      const currentCost = this.costByTool.get(toolName) || 0;
      this.costByTool.set(toolName, currentCost + estimatedCost);
    }

    // Log cost event
    log.info('[Telemetry] Cost tracked', {
      model,
      inputTokens,
      outputTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
      userId: userId?.substring(0, 12),
      toolName
    });

    // Add to current span if tracing enabled
    this.setAttribute('llm.input_tokens', inputTokens);
    this.setAttribute('llm.output_tokens', outputTokens);
    this.setAttribute('llm.model', model);
    this.setAttribute('llm.cost_usd', estimatedCost);
  }

  /**
   * Calculate cost for LLM usage
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = CLAUDE_PRICING[model as keyof typeof CLAUDE_PRICING];
    if (!pricing) {
      log.warn('[Telemetry] Unknown model for pricing', { model });
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Get cost statistics
   */
  getCostStats(): {
    totalCost: number;
    byUser: Record<string, number>;
    byTool: Record<string, number>;
  } {
    return {
      totalCost: this.totalCost,
      byUser: Object.fromEntries(this.costByUser),
      byTool: Object.fromEntries(this.costByTool)
    };
  }

  /**
   * Reset cost statistics
   */
  resetCostStats(): void {
    this.totalCost = 0;
    this.costByUser.clear();
    this.costByTool.clear();
    log.info('[Telemetry] Cost statistics reset');
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Shutdown telemetry
   */
  async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.shutdown();
      log.info('[Telemetry] Shutdown complete');
    }
  }
}

// Singleton instance
export const telemetry = new TelemetryManager();
