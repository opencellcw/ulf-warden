"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMRouter = void 0;
exports.getRouter = getRouter;
const interface_1 = require("./interface");
const claude_1 = require("./claude");
const local_1 = require("./local");
const logger_1 = require("../logger");
const config_1 = require("../config");
/**
 * Intelligent router between Claude API and local model
 *
 * Routing strategies:
 * 1. CLAUDE_ONLY - Always use Claude (default)
 * 2. LOCAL_ONLY - Always use local model
 * 3. HYBRID - Route based on task complexity
 * 4. LOCAL_FALLBACK - Try local first, fallback to Claude
 */
class LLMRouter {
    claudeProvider;
    localProvider;
    strategy;
    localAvailable = false;
    constructor() {
        this.claudeProvider = (0, claude_1.getClaudeProvider)();
        this.localProvider = (0, local_1.getLocalProvider)();
        // Get strategy from config
        const strategyStr = process.env.LLM_STRATEGY || config_1.config.get('LLM_STRATEGY', 'claude_only');
        this.strategy = this.parseStrategy(strategyStr);
        // Check local availability
        this.checkLocalAvailability();
    }
    parseStrategy(str) {
        switch (str.toLowerCase()) {
            case 'local_only':
                return interface_1.ModelStrategy.LOCAL_ONLY;
            case 'hybrid':
                return interface_1.ModelStrategy.HYBRID;
            case 'local_fallback':
                return interface_1.ModelStrategy.LOCAL_FALLBACK;
            default:
                return interface_1.ModelStrategy.CLAUDE_ONLY;
        }
    }
    async checkLocalAvailability() {
        this.localAvailable = await this.localProvider.isAvailable();
        logger_1.log.info('[Router] Local model availability checked', {
            available: this.localAvailable
        });
    }
    /**
     * Classify task type based on messages and options
     */
    classifyTask(messages, options) {
        // If tools are present, it's a tool use task
        if (options?.tools && options.tools.length > 0) {
            return interface_1.TaskType.TOOL_USE;
        }
        // Get the last user message
        const lastUserMessage = messages
            .filter(m => m.role === 'user')
            .pop();
        if (!lastUserMessage) {
            return interface_1.TaskType.UNKNOWN;
        }
        const content = lastUserMessage.content.toLowerCase();
        // Code generation patterns
        const codePatterns = [
            'write code', 'create a function', 'implement', 'debug',
            'sobe', 'criar', 'instala', 'deploy', 'roda', 'executa',
            'create', 'install', 'run', 'execute', 'start', 'setup'
        ];
        if (codePatterns.some(p => content.includes(p))) {
            return interface_1.TaskType.CODE_GENERATION;
        }
        // Complex reasoning patterns
        const reasoningPatterns = [
            'explain', 'analyze', 'compare', 'why', 'how',
            'what is the difference', 'pros and cons'
        ];
        if (reasoningPatterns.some(p => content.includes(p))) {
            return interface_1.TaskType.COMPLEX_REASONING;
        }
        // Simple chat patterns
        const chatPatterns = [
            'hi', 'hello', 'hey', 'oi', 'olá',
            'thanks', 'thank you', 'obrigado'
        ];
        if (chatPatterns.some(p => content.includes(p))) {
            return interface_1.TaskType.SIMPLE_CHAT;
        }
        // Summarization patterns
        if (content.includes('summarize') || content.includes('resumo')) {
            return interface_1.TaskType.SUMMARIZATION;
        }
        // Translation patterns
        if (content.includes('translate') || content.includes('traduz')) {
            return interface_1.TaskType.TRANSLATION;
        }
        // Default to simple chat if message is short
        if (content.length < 200) {
            return interface_1.TaskType.SIMPLE_CHAT;
        }
        return interface_1.TaskType.UNKNOWN;
    }
    /**
     * Determine which provider to use based on strategy and task
     */
    selectProvider(taskType, hasTools) {
        logger_1.log.debug('[Router] Selecting provider', {
            strategy: this.strategy,
            taskType,
            hasTools,
            localAvailable: this.localAvailable
        });
        // If tools are required, must use Claude
        if (hasTools) {
            logger_1.log.info('[Router] Using Claude (tools required)');
            return this.claudeProvider;
        }
        switch (this.strategy) {
            case interface_1.ModelStrategy.CLAUDE_ONLY:
                logger_1.log.info('[Router] Using Claude (strategy: claude_only)');
                return this.claudeProvider;
            case interface_1.ModelStrategy.LOCAL_ONLY:
                if (!this.localAvailable) {
                    logger_1.log.warn('[Router] Local model not available, falling back to Claude');
                    return this.claudeProvider;
                }
                logger_1.log.info('[Router] Using local model (strategy: local_only)');
                return this.localProvider;
            case interface_1.ModelStrategy.HYBRID:
                return this.selectProviderHybrid(taskType);
            case interface_1.ModelStrategy.LOCAL_FALLBACK:
                if (this.localAvailable) {
                    logger_1.log.info('[Router] Using local model (strategy: local_fallback)');
                    return this.localProvider;
                }
                logger_1.log.info('[Router] Using Claude (local not available)');
                return this.claudeProvider;
            default:
                return this.claudeProvider;
        }
    }
    /**
     * Hybrid strategy: route based on task complexity
     */
    selectProviderHybrid(taskType) {
        // Simple tasks can use local model if available
        const simpleTasksForLocal = [
            interface_1.TaskType.SIMPLE_CHAT,
            interface_1.TaskType.TEXT_CLASSIFICATION,
            interface_1.TaskType.SUMMARIZATION
        ];
        if (simpleTasksForLocal.includes(taskType) && this.localAvailable) {
            logger_1.log.info('[Router] Using local model (hybrid: simple task)', { taskType });
            return this.localProvider;
        }
        // Complex tasks use Claude
        logger_1.log.info('[Router] Using Claude (hybrid: complex task)', { taskType });
        return this.claudeProvider;
    }
    /**
     * Generate response with intelligent routing
     */
    async generate(messages, options) {
        const startTime = Date.now();
        // Classify task
        const taskType = this.classifyTask(messages, options);
        const hasTools = !!(options?.tools && options.tools.length > 0);
        // Select provider
        const provider = this.selectProvider(taskType, hasTools);
        try {
            // Generate with selected provider
            const response = await provider.generate(messages, options);
            const totalTime = Date.now() - startTime;
            logger_1.log.info('[Router] Generation complete', {
                provider: provider.name,
                taskType,
                totalTime: `${totalTime}ms`
            });
            return response;
        }
        catch (error) {
            logger_1.log.error('[Router] Generation failed with primary provider', {
                provider: provider.name,
                error: error.message
            });
            // Fallback logic
            if (this.strategy === interface_1.ModelStrategy.LOCAL_FALLBACK && provider.name === 'local-llm') {
                logger_1.log.warn('[Router] Falling back to Claude after local failure');
                return await this.claudeProvider.generate(messages, options);
            }
            throw error;
        }
    }
    /**
     * Generate with tools (always uses Claude)
     */
    async generateWithTools(messages, tools, options) {
        logger_1.log.info('[Router] Using Claude for tool-based generation');
        return await this.claudeProvider.generateWithTools(messages, tools, options);
    }
    /**
     * Get current strategy
     */
    getStrategy() {
        return this.strategy;
    }
    /**
     * Set strategy dynamically
     */
    setStrategy(strategy) {
        this.strategy = strategy;
        logger_1.log.info('[Router] Strategy changed', { strategy });
    }
    /**
     * Get status of both providers
     */
    async getStatus() {
        const claudeAvailable = await this.claudeProvider.isAvailable();
        // Refresh local availability
        await this.checkLocalAvailability();
        return {
            claude: {
                available: claudeAvailable,
                model: this.claudeProvider.getModel()
            },
            local: {
                available: this.localAvailable,
                model: this.localAvailable ? this.localProvider.getModelInfo().name : undefined
            },
            strategy: this.strategy
        };
    }
    /**
     * Get the Claude provider for direct access (backward compatibility)
     */
    getClaudeProvider() {
        return this.claudeProvider;
    }
    /**
     * Get the local provider for direct access
     */
    getLocalProvider() {
        return this.localProvider;
    }
}
exports.LLMRouter = LLMRouter;
// Singleton instance
let router = null;
function getRouter() {
    if (!router) {
        router = new LLMRouter();
    }
    return router;
}
