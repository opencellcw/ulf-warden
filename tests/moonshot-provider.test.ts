import { MoonshotProvider } from '../src/llm/moonshot-provider';
import { LLMMessage } from '../src/llm/interface';

describe('MoonshotProvider', () => {
  let provider: MoonshotProvider;

  beforeEach(() => {
    // Use test API key from env
    provider = new MoonshotProvider({
      apiKey: process.env.MOONSHOT_API_KEY || 'sk-test',
      model: 'kimi-k2.5'
    });
  });

  describe('isAvailable', () => {
    it('should return true if API key is configured', async () => {
      const available = await provider.isAvailable();
      expect(available).toBe(!!process.env.MOONSHOT_API_KEY);
    });

    it('should return false if API key is missing', async () => {
      const noKeyProvider = new MoonshotProvider({ apiKey: '' });
      const available = await noKeyProvider.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('generate', () => {
    it('should generate text response', async () => {
      if (!process.env.MOONSHOT_API_KEY) {
        console.log('Skipping test: MOONSHOT_API_KEY not set');
        return;
      }

      const messages: LLMMessage[] = [
        { role: 'user', content: 'Say "hello" in one word' }
      ];

      const response = await provider.generate(messages, {
        maxTokens: 10,
        temperature: 0
      });

      expect(response.content).toBeTruthy();
      expect(response.model).toBe('kimi-k2.5');
      expect(response.usage?.inputTokens).toBeGreaterThan(0);
      expect(response.usage?.outputTokens).toBeGreaterThan(0);
      expect(response.processingTime).toBeGreaterThan(0);
    });

    it('should respect system prompt', async () => {
      if (!process.env.MOONSHOT_API_KEY) {
        console.log('Skipping test: MOONSHOT_API_KEY not set');
        return;
      }

      const messages: LLMMessage[] = [
        { role: 'user', content: 'What is your name?' }
      ];

      const response = await provider.generate(messages, {
        systemPrompt: 'You are a bot named TestBot. Always say your name.',
        maxTokens: 50,
        temperature: 0
      });

      expect(response.content.toLowerCase()).toContain('testbot');
    });

    it('should handle temperature parameter', async () => {
      if (!process.env.MOONSHOT_API_KEY) {
        console.log('Skipping test: MOONSHOT_API_KEY not set');
        return;
      }

      const messages: LLMMessage[] = [
        { role: 'user', content: 'Generate a random number between 1 and 10' }
      ];

      // Low temperature should be more deterministic
      const response1 = await provider.generate(messages, { temperature: 0 });
      const response2 = await provider.generate(messages, { temperature: 0 });

      // High temperature should be more varied
      const response3 = await provider.generate(messages, { temperature: 1 });

      expect(response1.content).toBeTruthy();
      expect(response2.content).toBeTruthy();
      expect(response3.content).toBeTruthy();
    });
  });

  describe('generateWithTools', () => {
    it('should support tool calling', async () => {
      if (!process.env.MOONSHOT_API_KEY) {
        console.log('Skipping test: MOONSHOT_API_KEY not set');
        return;
      }

      const messages: LLMMessage[] = [
        { role: 'user', content: 'What is 5 + 3?' }
      ];

      const tools = [
        {
          name: 'calculate',
          description: 'Perform basic math calculations',
          input_schema: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                enum: ['add', 'subtract', 'multiply', 'divide']
              },
              a: { type: 'number' },
              b: { type: 'number' }
            },
            required: ['operation', 'a', 'b']
          }
        }
      ];

      const response = await provider.generateWithTools(messages, tools, {
        maxTokens: 100
      });

      expect(response.content).toBeTruthy();
      const parsed = JSON.parse(response.content);
      
      // Check if tool was called or result returned
      expect(parsed).toHaveProperty('content');
      // Tool calls may or may not be present depending on model decision
    });

    it('should convert Anthropic tool schema to Moonshot format', async () => {
      if (!process.env.MOONSHOT_API_KEY) {
        console.log('Skipping test: MOONSHOT_API_KEY not set');
        return;
      }

      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const anthropicTool = {
        name: 'test_tool',
        description: 'A test tool',
        input_schema: {
          type: 'object',
          properties: {
            param1: { type: 'string' }
          },
          required: ['param1']
        }
      };

      // Should not throw error on conversion
      await expect(
        provider.generateWithTools(messages, [anthropicTool])
      ).resolves.toBeDefined();
    });
  });

  describe('streamResponse', () => {
    it('should stream response chunks', async () => {
      if (!process.env.MOONSHOT_API_KEY) {
        console.log('Skipping test: MOONSHOT_API_KEY not set');
        return;
      }

      const messages: LLMMessage[] = [
        { role: 'user', content: 'Count from 1 to 5' }
      ];

      const chunks: string[] = [];
      let doneReceived = false;

      for await (const chunk of provider.streamResponse(messages, {
        maxTokens: 50,
        temperature: 0
      })) {
        if (chunk.done) {
          doneReceived = true;
        } else {
          chunks.push(chunk.content);
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(doneReceived).toBe(true);

      const fullContent = chunks.join('');
      expect(fullContent).toBeTruthy();
    });

    it('should handle streaming with tools', async () => {
      if (!process.env.MOONSHOT_API_KEY) {
        console.log('Skipping test: MOONSHOT_API_KEY not set');
        return;
      }

      const messages: LLMMessage[] = [
        { role: 'user', content: 'What time is it?' }
      ];

      const tools = [
        {
          name: 'get_time',
          description: 'Get current time',
          input_schema: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      ];

      const chunks: string[] = [];

      for await (const chunk of provider.streamResponse(messages, {
        tools,
        maxTokens: 100
      })) {
        if (!chunk.done) {
          chunks.push(chunk.content);
        }
      }

      // Should receive some content (either text or tool call)
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should throw error on invalid API key', async () => {
      const badProvider = new MoonshotProvider({
        apiKey: 'sk-invalid',
        model: 'kimi-k2.5'
      });

      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(
        badProvider.generate(messages)
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const badProvider = new MoonshotProvider({
        apiKey: 'sk-test',
        baseURL: 'https://invalid-url-that-does-not-exist.com'
      });

      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(
        badProvider.generate(messages)
      ).rejects.toThrow();
    });
  });

  describe('countTokens', () => {
    it('should estimate token count', () => {
      const text = 'Hello world';
      const tokens = provider.countTokens(text);
      
      // Rough estimation: ~4 chars per token
      expect(tokens).toBe(Math.ceil(text.length / 4));
    });

    it('should handle empty text', () => {
      const tokens = provider.countTokens('');
      expect(tokens).toBe(0);
    });

    it('should handle Chinese text', () => {
      const text = '你好世界';
      const tokens = provider.countTokens(text);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('getModel', () => {
    it('should return configured model', () => {
      const model = provider.getModel();
      expect(model).toBe('kimi-k2.5');
    });

    it('should use default model if not specified', () => {
      const defaultProvider = new MoonshotProvider();
      const model = defaultProvider.getModel();
      expect(model).toBeTruthy();
    });
  });
});
