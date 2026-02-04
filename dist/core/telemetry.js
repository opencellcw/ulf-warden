"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetry = exports.TelemetryManager = void 0;
const api_1 = require("@opentelemetry/api");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const logger_1 = require("../logger");
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
class TelemetryManager {
    provider = null;
    tracer;
    enabled;
    totalCost = 0;
    costByUser = new Map();
    costByTool = new Map();
    constructor() {
        this.enabled = process.env.TELEMETRY_ENABLED === 'true';
        if (this.enabled) {
            this.initializeTracing();
        }
        else {
            logger_1.log.info('[Telemetry] Disabled (set TELEMETRY_ENABLED=true to enable)');
        }
    }
    /**
     * Initialize OpenTelemetry tracing
     */
    initializeTracing() {
        try {
            this.provider = new sdk_trace_node_1.NodeTracerProvider({
                resource: new resources_1.Resource({
                    [semantic_conventions_1.ATTR_SERVICE_NAME]: SERVICE_NAME,
                    [semantic_conventions_1.ATTR_SERVICE_VERSION]: process.env.VERSION || '1.0.0'
                })
            });
            // Use console exporter for local development
            // In production, replace with OTLP exporter
            this.provider.addSpanProcessor(new sdk_trace_base_1.BatchSpanProcessor(new sdk_trace_base_1.ConsoleSpanExporter()));
            this.provider.register();
            this.tracer = api_1.trace.getTracer(SERVICE_NAME);
            logger_1.log.info('[Telemetry] Initialized with OpenTelemetry', {
                service: SERVICE_NAME,
                exporter: 'console'
            });
        }
        catch (error) {
            logger_1.log.error('[Telemetry] Failed to initialize', { error });
            this.enabled = false;
        }
    }
    /**
     * Scrub PII from data
     */
    scrubPII(data) {
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
            const scrubbed = {};
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
    startSpan(name, attributes, kind) {
        if (!this.enabled || !this.tracer) {
            return null;
        }
        try {
            const scrubbedAttributes = attributes ? this.scrubPII(attributes) : {};
            return this.tracer.startSpan(name, {
                kind: kind || api_1.SpanKind.INTERNAL,
                attributes: scrubbedAttributes
            });
        }
        catch (error) {
            logger_1.log.error('[Telemetry] Failed to start span', { error, name });
            return null;
        }
    }
    /**
     * Wrap function execution in a span
     */
    async trace(name, fn, attributes, kind) {
        if (!this.enabled) {
            return await fn(null);
        }
        const span = this.startSpan(name, attributes, kind);
        try {
            const result = await fn(span);
            span?.setStatus({ code: api_1.SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            span?.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: error.message
            });
            span?.recordException(error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Add event to current span
     */
    addEvent(name, attributes) {
        if (!this.enabled) {
            return;
        }
        try {
            const span = api_1.trace.getActiveSpan();
            if (span) {
                const scrubbedAttributes = attributes ? this.scrubPII(attributes) : {};
                span.addEvent(name, scrubbedAttributes);
            }
        }
        catch (error) {
            logger_1.log.error('[Telemetry] Failed to add event', { error, name });
        }
    }
    /**
     * Set attribute on current span
     */
    setAttribute(key, value) {
        if (!this.enabled) {
            return;
        }
        try {
            const span = api_1.trace.getActiveSpan();
            if (span) {
                const scrubbedValue = this.scrubPII(value);
                span.setAttribute(key, scrubbedValue);
            }
        }
        catch (error) {
            logger_1.log.error('[Telemetry] Failed to set attribute', { error, key });
        }
    }
    /**
     * Track cost for LLM call
     */
    trackCost(costInfo, userId, toolName) {
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
        logger_1.log.info('[Telemetry] Cost tracked', {
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
    calculateCost(model, inputTokens, outputTokens) {
        const pricing = CLAUDE_PRICING[model];
        if (!pricing) {
            logger_1.log.warn('[Telemetry] Unknown model for pricing', { model });
            return 0;
        }
        const inputCost = (inputTokens / 1_000_000) * pricing.input;
        const outputCost = (outputTokens / 1_000_000) * pricing.output;
        return inputCost + outputCost;
    }
    /**
     * Get cost statistics
     */
    getCostStats() {
        return {
            totalCost: this.totalCost,
            byUser: Object.fromEntries(this.costByUser),
            byTool: Object.fromEntries(this.costByTool)
        };
    }
    /**
     * Reset cost statistics
     */
    resetCostStats() {
        this.totalCost = 0;
        this.costByUser.clear();
        this.costByTool.clear();
        logger_1.log.info('[Telemetry] Cost statistics reset');
    }
    /**
     * Check if telemetry is enabled
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Shutdown telemetry
     */
    async shutdown() {
        if (this.provider) {
            await this.provider.shutdown();
            logger_1.log.info('[Telemetry] Shutdown complete');
        }
    }
}
exports.TelemetryManager = TelemetryManager;
// Singleton instance
exports.telemetry = new TelemetryManager();
