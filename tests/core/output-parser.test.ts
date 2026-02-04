/**
 * Output Parser Tests
 *
 * Run with: tsx tests/core/output-parser.test.ts
 */

import { OutputParser, AgentResponse, ToolCallSchema } from '../../src/core/output-parser';

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

function assertEqual(actual: any, expected: any, message: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    console.error(`  Expected:`, expected);
    console.error(`  Actual:`, actual);
    failed++;
  }
}

async function runTests() {
  console.log('\n🧪 Testing OutputParser\n');
  console.log('='.repeat(60));

  // Test 1: Parse valid Claude response with tool use
  console.log('\nTest 1: Parse valid Claude response with tool use');
  try {
    const response = {
      content: [
        { type: 'text', text: 'Executing command...' },
        {
          type: 'tool_use',
          id: 'toolu_123',
          name: 'execute_shell',
          input: { command: 'ls -la' }
        }
      ],
      stop_reason: 'tool_use'
    };

    const parsed = OutputParser.parseClaudeResponse(response);

    assertEqual(parsed.text, 'Executing command...', 'Text extracted correctly');
    assertEqual(parsed.toolCalls?.length, 1, 'One tool call extracted');
    assertEqual(parsed.toolCalls?.[0].name, 'execute_shell', 'Tool name correct');
    assertEqual(parsed.stopReason, 'tool_use', 'Stop reason correct');
  } catch (error) {
    console.error(`❌ FAIL: Test 1 threw error: ${error}`);
    failed++;
  }

  // Test 2: Parse response with multiple tool calls
  console.log('\nTest 2: Parse response with multiple tool calls');
  try {
    const response = {
      content: [
        { type: 'text', text: 'Running multiple commands' },
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'read_file',
          input: { path: '/tmp/test.txt' }
        },
        {
          type: 'tool_use',
          id: 'toolu_2',
          name: 'write_file',
          input: { path: '/tmp/output.txt', content: 'test' }
        }
      ],
      stop_reason: 'tool_use'
    };

    const parsed = OutputParser.parseClaudeResponse(response);

    assertEqual(parsed.toolCalls?.length, 2, 'Two tool calls extracted');
    assertEqual(parsed.toolCalls?.[0].name, 'read_file', 'First tool name correct');
    assertEqual(parsed.toolCalls?.[1].name, 'write_file', 'Second tool name correct');
  } catch (error) {
    console.error(`❌ FAIL: Test 2 threw error: ${error}`);
    failed++;
  }

  // Test 3: Parse response with text only (no tools)
  console.log('\nTest 3: Parse response with text only');
  try {
    const response = {
      content: [
        { type: 'text', text: 'Here is my response.' }
      ],
      stop_reason: 'end_turn'
    };

    const parsed = OutputParser.parseClaudeResponse(response);

    assertEqual(parsed.text, 'Here is my response.', 'Text extracted correctly');
    assertEqual(parsed.toolCalls, undefined, 'No tool calls');
    assertEqual(parsed.stopReason, 'end_turn', 'Stop reason correct');
  } catch (error) {
    console.error(`❌ FAIL: Test 3 threw error: ${error}`);
    failed++;
  }

  // Test 4: Parse response with multiple text blocks
  console.log('\nTest 4: Parse response with multiple text blocks');
  try {
    const response = {
      content: [
        { type: 'text', text: 'First block' },
        { type: 'text', text: 'Second block' }
      ],
      stop_reason: 'end_turn'
    };

    const parsed = OutputParser.parseClaudeResponse(response);

    assertEqual(parsed.text, 'First block\nSecond block', 'Multiple text blocks joined');
  } catch (error) {
    console.error(`❌ FAIL: Test 4 threw error: ${error}`);
    failed++;
  }

  // Test 5: Validate tool input with schema
  console.log('\nTest 5: Validate tool input with schema');
  try {
    const schema = ToolCallSchema;

    const validInput = {
      id: 'toolu_123',
      name: 'execute_shell',
      input: { command: 'ls' }
    };

    const isValid = OutputParser.validateToolInput('execute_shell', validInput, schema);
    assert(isValid, 'Valid tool input accepted');

    // Test invalid input (missing required field)
    const invalidInput = {
      id: 'toolu_123',
      // Missing 'name' field
      input: { command: 'ls' }
    };

    const isInvalid = OutputParser.validateToolInput('execute_shell', invalidInput, schema);
    assert(!isInvalid, 'Invalid tool input rejected');
  } catch (error) {
    console.error(`❌ FAIL: Test 5 threw error: ${error}`);
    failed++;
  }

  // Test 6: Parse JSON with schema
  console.log('\nTest 6: Parse JSON with schema');
  try {
    const { z } = require('zod');
    const schema = z.object({
      name: z.string(),
      age: z.number()
    });

    const validJson = '{"name": "John", "age": 30}';
    const parsed = OutputParser.parseJSON(validJson, schema);

    assert(parsed !== null, 'Valid JSON parsed successfully');
    assertEqual(parsed?.name, 'John', 'Name field correct');
    assertEqual(parsed?.age, 30, 'Age field correct');

    const invalidJson = '{"name": "John", "age": "not a number"}';
    const invalidParsed = OutputParser.parseJSON(invalidJson, schema);

    assert(invalidParsed === null, 'Invalid JSON rejected');
  } catch (error) {
    console.error(`❌ FAIL: Test 6 threw error: ${error}`);
    failed++;
  }

  // Test 7: Handle invalid response gracefully
  console.log('\nTest 7: Handle invalid response gracefully');
  try {
    const invalidResponse = {
      content: [
        {
          type: 'tool_use',
          id: 'toolu_123',
          // Missing required 'name' field
          input: { command: 'ls' }
        }
      ],
      stop_reason: 'tool_use'
    };

    try {
      OutputParser.parseClaudeResponse(invalidResponse);
      console.error('❌ FAIL: Should have thrown error for invalid response');
      failed++;
    } catch (error) {
      console.log('✅ PASS: Invalid response threw error as expected');
      passed++;
    }
  } catch (error) {
    console.error(`❌ FAIL: Test 7 threw unexpected error: ${error}`);
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
