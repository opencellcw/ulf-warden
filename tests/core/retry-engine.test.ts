/**
 * Retry Engine Tests
 *
 * Run with: tsx tests/core/retry-engine.test.ts
 */

import { RetryEngine } from '../../src/core/retry-engine';

// Test counter
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n🧪 Testing RetryEngine\n');
  console.log('='.repeat(60));

  // Test 1: Successful execution on first attempt
  console.log('\nTest 1: Successful execution on first attempt');
  try {
    const engine = new RetryEngine();
    let attempts = 0;

    const result = await engine.executeWithRetry('test_tool', async () => {
      attempts++;
      return 'success';
    });

    assert(result === 'success', 'Returned correct result');
    assert(attempts === 1, 'Only one attempt made');
  } catch (error) {
    console.error(`❌ FAIL: Test 1 threw error: ${error}`);
    failed++;
  }

  // Test 2: Retry on transient error (idempotent)
  console.log('\nTest 2: Retry on transient error (idempotent tool)');
  try {
    const engine = new RetryEngine();
    engine.registerPolicy('retryable_tool', {
      maxAttempts: 3,
      idempotent: true,
      initialDelayMs: 10, // Fast for testing
      retryableErrors: ['ECONNRESET']
    });

    let attempts = 0;

    const result = await engine.executeWithRetry('retryable_tool', async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('ECONNRESET');
      }
      return 'success';
    });

    assert(result === 'success', 'Eventually succeeded');
    assert(attempts === 3, 'Made 3 attempts');
  } catch (error) {
    console.error(`❌ FAIL: Test 2 threw error: ${error}`);
    failed++;
  }

  // Test 3: No retry for non-idempotent tool
  console.log('\nTest 3: No retry for non-idempotent tool');
  try {
    const engine = new RetryEngine();
    engine.registerPolicy('non_idempotent', {
      maxAttempts: 3,
      idempotent: false // Not safe to retry
    });

    let attempts = 0;

    try {
      await engine.executeWithRetry('non_idempotent', async () => {
        attempts++;
        throw new Error('ECONNRESET');
      });
      console.error('❌ FAIL: Should have thrown error');
      failed++;
    } catch (error) {
      assert(attempts === 1, 'Only one attempt (no retry)');
      console.log('✅ PASS: Did not retry non-idempotent operation');
      passed++;
    }
  } catch (error) {
    console.error(`❌ FAIL: Test 3 threw unexpected error: ${error}`);
    failed++;
  }

  // Test 4: No retry for non-retryable error
  console.log('\nTest 4: No retry for non-retryable error');
  try {
    const engine = new RetryEngine();
    engine.registerPolicy('retryable_tool2', {
      maxAttempts: 3,
      idempotent: true,
      retryableErrors: ['ECONNRESET'] // Only retry this error
    });

    let attempts = 0;

    try {
      await engine.executeWithRetry('retryable_tool2', async () => {
        attempts++;
        throw new Error('ENOTFOUND'); // Different error
      });
      console.error('❌ FAIL: Should have thrown error');
      failed++;
    } catch (error) {
      assert(attempts === 1, 'Only one attempt (error not retryable)');
      console.log('✅ PASS: Did not retry non-retryable error');
      passed++;
    }
  } catch (error) {
    console.error(`❌ FAIL: Test 4 threw unexpected error: ${error}`);
    failed++;
  }

  // Test 5: Max attempts reached
  console.log('\nTest 5: Max attempts reached');
  try {
    const engine = new RetryEngine();
    engine.registerPolicy('failing_tool', {
      maxAttempts: 3,
      idempotent: true,
      initialDelayMs: 10,
      retryableErrors: ['ECONNRESET']
    });

    let attempts = 0;

    try {
      await engine.executeWithRetry('failing_tool', async () => {
        attempts++;
        throw new Error('ECONNRESET'); // Always fail
      });
      console.error('❌ FAIL: Should have thrown error');
      failed++;
    } catch (error) {
      assert(attempts === 3, 'Made max attempts (3)');
      console.log('✅ PASS: Stopped after max attempts');
      passed++;
    }
  } catch (error) {
    console.error(`❌ FAIL: Test 5 threw unexpected error: ${error}`);
    failed++;
  }

  // Test 6: Exponential backoff
  console.log('\nTest 6: Exponential backoff');
  try {
    const engine = new RetryEngine();
    engine.registerPolicy('backoff_tool', {
      maxAttempts: 3,
      idempotent: true,
      initialDelayMs: 100,
      backoffMultiplier: 2,
      retryableErrors: ['ECONNRESET']
    });

    let attempts = 0;
    const timestamps: number[] = [];

    try {
      await engine.executeWithRetry('backoff_tool', async () => {
        timestamps.push(Date.now());
        attempts++;
        throw new Error('ECONNRESET');
      });
    } catch (error) {
      // Check delays between attempts
      const delay1 = timestamps[1] - timestamps[0];
      const delay2 = timestamps[2] - timestamps[1];

      assert(delay1 >= 90, 'First delay ~100ms'); // Allow some variance
      assert(delay2 >= 190, 'Second delay ~200ms (exponential)');
      console.log('✅ PASS: Exponential backoff working');
      passed++;
    }
  } catch (error) {
    console.error(`❌ FAIL: Test 6 threw unexpected error: ${error}`);
    failed++;
  }

  // Test 7: Fallback strategies
  console.log('\nTest 7: Fallback strategies');
  try {
    const engine = new RetryEngine();

    const result = await engine.executeWithFallback([
      {
        name: 'primary',
        fn: async () => { throw new Error('Primary failed'); }
      },
      {
        name: 'secondary',
        fn: async () => { throw new Error('Secondary failed'); }
      },
      {
        name: 'tertiary',
        fn: async () => 'success from tertiary'
      }
    ]);

    assert(result === 'success from tertiary', 'Fallback to tertiary worked');
  } catch (error) {
    console.error(`❌ FAIL: Test 7 threw error: ${error}`);
    failed++;
  }

  // Test 8: All fallback strategies fail
  console.log('\nTest 8: All fallback strategies fail');
  try {
    const engine = new RetryEngine();

    try {
      await engine.executeWithFallback([
        {
          name: 'primary',
          fn: async () => { throw new Error('Primary failed'); }
        },
        {
          name: 'secondary',
          fn: async () => { throw new Error('Secondary failed'); }
        }
      ]);
      console.error('❌ FAIL: Should have thrown error');
      failed++;
    } catch (error: any) {
      assert(error.message.includes('All fallback strategies failed'), 'Correct error message');
      console.log('✅ PASS: All fallbacks failed as expected');
      passed++;
    }
  } catch (error) {
    console.error(`❌ FAIL: Test 8 threw unexpected error: ${error}`);
    failed++;
  }

  // Test 9: Default policies for common tools
  console.log('\nTest 9: Default policies for common tools');
  try {
    // Use the singleton instance which has default policies
    const { retryEngine } = require('../../src/core/retry-engine');

    // web_fetch should be idempotent and retryable
    let attempts = 0;
    const result = await retryEngine.executeWithRetry('web_fetch', async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('ETIMEDOUT');
      }
      return 'success';
    });

    assert(result === 'success', 'web_fetch retried successfully');
    assert(attempts === 2, 'Retried once');
  } catch (error) {
    console.error(`❌ FAIL: Test 9 threw error: ${error}`);
    failed++;
  }

  // Test 10: execute_shell should not retry by default
  console.log('\nTest 10: execute_shell should not retry by default');
  try {
    // Use the singleton instance which has default policies
    const { retryEngine } = require('../../src/core/retry-engine');

    let attempts = 0;

    try {
      await retryEngine.executeWithRetry('execute_shell', async () => {
        attempts++;
        throw new Error('ECONNRESET');
      });
      console.error('❌ FAIL: Should have thrown error');
      failed++;
    } catch (error) {
      assert(attempts === 1, 'execute_shell did not retry (not idempotent)');
      console.log('✅ PASS: Non-idempotent tool did not retry');
      passed++;
    }
  } catch (error) {
    console.error(`❌ FAIL: Test 10 threw unexpected error: ${error}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
