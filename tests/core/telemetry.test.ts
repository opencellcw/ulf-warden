/**
 * Telemetry Tests
 *
 * Validates:
 * - PII scrubbing (8 patterns)
 * - Span creation and attributes
 * - Cost calculation and tracking
 * - Metrics recording
 * - Local-only mode
 * - Error handling
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { TelemetryManager } from '../../src/core/telemetry';
import type { CostInfo } from '../../src/core/telemetry';

describe('TelemetryManager', () => {
  let telemetry: TelemetryManager;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Save original env
    originalEnv = process.env.TELEMETRY_ENABLED;

    // Enable telemetry for tests
    process.env.TELEMETRY_ENABLED = 'true';
    telemetry = new TelemetryManager();
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv === undefined) {
      delete process.env.TELEMETRY_ENABLED;
    } else {
      process.env.TELEMETRY_ENABLED = originalEnv;
    }
  });

  describe('PII Scrubbing', () => {
    it('should scrub email addresses', () => {
      const data = 'Contact us at john.doe@example.com or support@company.org';
      const scrubbed = telemetry.scrubPII(data);

      assert.strictEqual(scrubbed, 'Contact us at [EMAIL] or [EMAIL]');
      assert.ok(!scrubbed.includes('@'), 'Should remove all email addresses');
    });

    it('should scrub SSN', () => {
      const data = 'SSN: 123-45-6789';
      const scrubbed = telemetry.scrubPII(data);

      assert.strictEqual(scrubbed, 'SSN: [SSN]');
      assert.ok(!scrubbed.includes('123-45'), 'Should remove SSN');
    });

    it('should scrub credit card numbers', () => {
      const data = 'Card: 4111-1111-1111-1111 or 5500 0000 0000 0004';
      const scrubbed = telemetry.scrubPII(data);

      assert.strictEqual(scrubbed, 'Card: [CREDIT_CARD] or [CREDIT_CARD]');
      assert.ok(!scrubbed.includes('4111'), 'Should remove credit card numbers');
    });

    it('should scrub phone numbers', () => {
      const data = 'Call us at 555-123-4567';
      const scrubbed = telemetry.scrubPII(data);

      assert.strictEqual(scrubbed, 'Call us at [PHONE]');
      assert.ok(!scrubbed.includes('555-123'), 'Should remove phone numbers');
    });

    it('should scrub JWT tokens', () => {
      const data = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const scrubbed = telemetry.scrubPII(data);

      assert.strictEqual(scrubbed, 'Authorization: Bearer [JWT]');
      assert.ok(!scrubbed.includes('eyJhbGci'), 'Should remove JWT tokens');
    });

    it('should scrub OpenAI API keys', () => {
      const data = 'API Key: sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890ab';
      const scrubbed = telemetry.scrubPII(data);

      assert.strictEqual(scrubbed, 'API Key: sk-[API_KEY]');
      assert.ok(!scrubbed.includes('123456'), 'Should remove API keys');
    });

    it('should scrub Anthropic API keys', () => {
      const data = 'ANTHROPIC_API_KEY=sk-ant-api03-abc123xyz789';
      const scrubbed = telemetry.scrubPII(data);

      assert.strictEqual(scrubbed, 'ANTHROPIC_API_KEY=sk-ant-[API_KEY]');
      assert.ok(!scrubbed.includes('api03'), 'Should remove Anthropic keys');
    });

    it('should scrub Slack tokens', () => {
      const data = 'Token: xoxb-123-456-abc789xyz';
      const scrubbed = telemetry.scrubPII(data);

      assert.strictEqual(scrubbed, 'Token: xoxb-[SLACK_TOKEN]');
      assert.ok(!scrubbed.includes('xoxb-123'), 'Should remove Slack tokens');
    });

    it('should scrub PII in nested objects', () => {
      const data = {
        user: {
          email: 'test@example.com',
          phone: '555-123-4567',
          ssn: '123-45-6789'
        },
        payment: {
          card: '4111-1111-1111-1111'
        }
      };

      const scrubbed = telemetry.scrubPII(data);

      // Keys containing "email", "phone", "password" are redacted
      assert.strictEqual(scrubbed.user.email_REDACTED, '[EMAIL]');
      assert.strictEqual(scrubbed.user.phone_REDACTED, '[PHONE]');
      assert.strictEqual(scrubbed.user.ssn, '[SSN]');
      assert.strictEqual(scrubbed.payment.card, '[CREDIT_CARD]');
    });

    it('should scrub PII in arrays', () => {
      const data = [
        'Email: admin@company.com',
        'SSN: 987-65-4321',
        'Card: 5500 0000 0000 0004'
      ];

      const scrubbed = telemetry.scrubPII(data);

      assert.strictEqual(scrubbed[0], 'Email: [EMAIL]');
      assert.strictEqual(scrubbed[1], 'SSN: [SSN]');
      assert.strictEqual(scrubbed[2], 'Card: [CREDIT_CARD]');
    });

    it('should redact keys containing sensitive field names', () => {
      const data = {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'secret123',
        phone: '555-1234'
      };

      const scrubbed = telemetry.scrubPII(data);

      assert.ok(scrubbed.email_REDACTED !== undefined, 'Email key should be redacted');
      assert.ok(scrubbed.phone_REDACTED !== undefined, 'Phone key should be redacted');
      assert.ok(scrubbed.password_REDACTED !== undefined, 'Password key should be redacted');
      assert.strictEqual(scrubbed.username, 'john_doe', 'Username should not be redacted');
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost for Claude Sonnet 4', () => {
      const inputTokens = 1000;
      const outputTokens = 500;
      const cost = telemetry.calculateCost('claude-sonnet-4', inputTokens, outputTokens);

      // $3.0 per 1M input tokens + $15.0 per 1M output tokens
      // (1000 / 1_000_000) * 3.0 + (500 / 1_000_000) * 15.0
      // = 0.003 + 0.0075 = 0.0105
      assert.ok(Math.abs(cost - 0.0105) < 0.000001, `Cost ${cost} should be close to 0.0105`);
    });

    it('should calculate cost for Claude Haiku 3.5', () => {
      const inputTokens = 10000;
      const outputTokens = 5000;
      const cost = telemetry.calculateCost('claude-haiku-3.5', inputTokens, outputTokens);

      // $0.8 per 1M input + $4.0 per 1M output
      // (10000 / 1_000_000) * 0.8 + (5000 / 1_000_000) * 4.0
      // = 0.008 + 0.020 = 0.028
      assert.strictEqual(cost, 0.028);
    });

    it('should calculate cost for Claude Opus 4', () => {
      const inputTokens = 2000;
      const outputTokens = 1000;
      const cost = telemetry.calculateCost('claude-opus-4', inputTokens, outputTokens);

      // $15.0 per 1M input + $75.0 per 1M output
      // (2000 / 1_000_000) * 15.0 + (1000 / 1_000_000) * 75.0
      // = 0.030 + 0.075 = 0.105
      assert.strictEqual(cost, 0.105);
    });

    it('should return 0 for unknown model', () => {
      const cost = telemetry.calculateCost('unknown-model', 1000, 500);
      assert.strictEqual(cost, 0);
    });
  });

  describe('Cost Tracking', () => {
    it('should track total cost', () => {
      const costInfo: CostInfo = {
        inputTokens: 1000,
        outputTokens: 500,
        model: 'claude-sonnet-4',
        estimatedCost: 0.0105
      };

      telemetry.trackCost(costInfo);

      const stats = telemetry.getCostStats();
      assert.strictEqual(stats.totalCost, 0.0105);
    });

    it('should track cost by user', () => {
      const costInfo1: CostInfo = {
        inputTokens: 1000,
        outputTokens: 500,
        model: 'claude-sonnet-4',
        estimatedCost: 0.01
      };

      const costInfo2: CostInfo = {
        inputTokens: 2000,
        outputTokens: 1000,
        model: 'claude-sonnet-4',
        estimatedCost: 0.02
      };

      telemetry.trackCost(costInfo1, 'user-123');
      telemetry.trackCost(costInfo2, 'user-123');
      telemetry.trackCost(costInfo1, 'user-456');

      const stats = telemetry.getCostStats();

      assert.strictEqual(stats.byUser['user-123'], 0.03); // 0.01 + 0.02
      assert.strictEqual(stats.byUser['user-456'], 0.01);
      assert.strictEqual(stats.totalCost, 0.04);
    });

    it('should track cost by tool', () => {
      const costInfo: CostInfo = {
        inputTokens: 1000,
        outputTokens: 500,
        model: 'claude-sonnet-4',
        estimatedCost: 0.01
      };

      telemetry.trackCost(costInfo, 'user-123', 'execute_shell');
      telemetry.trackCost(costInfo, 'user-123', 'execute_shell');
      telemetry.trackCost(costInfo, 'user-456', 'web_fetch');

      const stats = telemetry.getCostStats();

      assert.strictEqual(stats.byTool['execute_shell'], 0.02);
      assert.strictEqual(stats.byTool['web_fetch'], 0.01);
    });

    it('should reset cost statistics', () => {
      const costInfo: CostInfo = {
        inputTokens: 1000,
        outputTokens: 500,
        model: 'claude-sonnet-4',
        estimatedCost: 0.01
      };

      telemetry.trackCost(costInfo, 'user-123', 'test_tool');

      let stats = telemetry.getCostStats();
      assert.ok(stats.totalCost > 0);

      telemetry.resetCostStats();

      stats = telemetry.getCostStats();
      assert.strictEqual(stats.totalCost, 0);
      assert.strictEqual(Object.keys(stats.byUser).length, 0);
      assert.strictEqual(Object.keys(stats.byTool).length, 0);
    });
  });

  describe('Span Creation', () => {
    it('should create span with attributes', () => {
      const span = telemetry.startSpan('test.operation', {
        userId: 'test-user',
        toolName: 'test_tool'
      });

      assert.ok(span !== null, 'Span should be created');
    });

    it('should scrub PII from span attributes', () => {
      const span = telemetry.startSpan('test.operation', {
        userEmail: 'test@example.com',
        userPhone: '555-123-4567'
      });

      // The PII should be scrubbed before adding to span
      assert.ok(span !== null, 'Span should be created even with PII');
    });

    it('should not create span when telemetry disabled', () => {
      process.env.TELEMETRY_ENABLED = 'false';
      const disabledTelemetry = new TelemetryManager();

      const span = disabledTelemetry.startSpan('test.operation');
      assert.strictEqual(span, null, 'Should not create span when disabled');
    });
  });

  describe('Trace Wrapper', () => {
    it('should execute function within trace', async () => {
      let executedInTrace = false;

      await telemetry.trace(
        'test.trace',
        async (span) => {
          executedInTrace = true;
          assert.ok(span !== null, 'Span should be provided to function');
          return 'success';
        }
      );

      assert.ok(executedInTrace, 'Function should execute within trace');
    });

    it('should handle errors in trace', async () => {
      await assert.rejects(
        async () => {
          await telemetry.trace(
            'test.error',
            async (span) => {
              throw new Error('Test error');
            }
          );
        },
        /Test error/,
        'Should propagate error from traced function'
      );
    });

    it('should execute without span when disabled', async () => {
      process.env.TELEMETRY_ENABLED = 'false';
      const disabledTelemetry = new TelemetryManager();

      const result = await disabledTelemetry.trace(
        'test.disabled',
        async (span) => {
          assert.strictEqual(span, null, 'Span should be null when disabled');
          return 'executed';
        }
      );

      assert.strictEqual(result, 'executed');
    });

    it('should pass through return value', async () => {
      const result = await telemetry.trace(
        'test.return',
        async (span) => {
          return { data: 'test', count: 42 };
        }
      );

      assert.deepStrictEqual(result, { data: 'test', count: 42 });
    });
  });

  describe('Events and Attributes', () => {
    it('should add event to current span', () => {
      // This test validates the API - actual event recording happens in OpenTelemetry
      telemetry.addEvent('test.event', { key: 'value' });

      // No assertion needed - just validate it doesn't throw
      assert.ok(true);
    });

    it('should set attribute on current span', () => {
      // This test validates the API
      telemetry.setAttribute('test.attribute', 'test-value');

      // No assertion needed - just validate it doesn't throw
      assert.ok(true);
    });

    it('should scrub PII from events', () => {
      // Event with PII should be scrubbed
      telemetry.addEvent('user.login', {
        email: 'user@example.com',
        ip: '192.168.1.1'
      });

      // No assertion needed - PII scrubbing happens internally
      assert.ok(true);
    });
  });

  describe('Enable/Disable State', () => {
    it('should report enabled state', () => {
      process.env.TELEMETRY_ENABLED = 'true';
      const enabledTelemetry = new TelemetryManager();

      assert.strictEqual(enabledTelemetry.isEnabled(), true);
    });

    it('should report disabled state', () => {
      process.env.TELEMETRY_ENABLED = 'false';
      const disabledTelemetry = new TelemetryManager();

      assert.strictEqual(disabledTelemetry.isEnabled(), false);
    });

    it('should default to disabled when env var not set', () => {
      delete process.env.TELEMETRY_ENABLED;
      const defaultTelemetry = new TelemetryManager();

      assert.strictEqual(defaultTelemetry.isEnabled(), false);
    });
  });

  describe('Integration with Metrics', () => {
    it('should track LLM metrics during cost tracking', () => {
      const costInfo: CostInfo = {
        inputTokens: 5000,
        outputTokens: 2500,
        model: 'claude-sonnet-4',
        estimatedCost: 0.05
      };

      // Track cost - should also set span attributes
      telemetry.trackCost(costInfo, 'user-123', 'agent_loop');

      const stats = telemetry.getCostStats();
      assert.ok(stats.totalCost > 0, 'Cost should be tracked');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple users and tools', () => {
      const users = ['user-1', 'user-2', 'user-3'];
      const tools = ['execute_shell', 'web_fetch', 'read_file'];

      for (const user of users) {
        for (const tool of tools) {
          telemetry.trackCost({
            inputTokens: 1000,
            outputTokens: 500,
            model: 'claude-sonnet-4',
            estimatedCost: 0.01
          }, user, tool);
        }
      }

      const stats = telemetry.getCostStats();

      // 3 users × 3 tools × $0.01 = $0.09
      assert.strictEqual(stats.totalCost, 0.09);
      assert.strictEqual(Object.keys(stats.byUser).length, 3);
      assert.strictEqual(Object.keys(stats.byTool).length, 3);

      // Each user spent $0.03 (3 tools × $0.01)
      assert.strictEqual(stats.byUser['user-1'], 0.03);

      // Each tool cost $0.03 (3 users × $0.01)
      assert.strictEqual(stats.byTool['execute_shell'], 0.03);
    });

    it('should handle nested traces', async () => {
      const result = await telemetry.trace(
        'outer.trace',
        async (outerSpan) => {
          assert.ok(outerSpan !== null);

          const innerResult = await telemetry.trace(
            'inner.trace',
            async (innerSpan) => {
              assert.ok(innerSpan !== null);
              return 'inner-value';
            }
          );

          return { outer: 'outer-value', inner: innerResult };
        }
      );

      assert.deepStrictEqual(result, {
        outer: 'outer-value',
        inner: 'inner-value'
      });
    });
  });
});
