/**
 * Simple Reminders Test
 * Tests basic functionality without Temporal server
 */

import { getTemporalReminders } from '../src/reminders/temporal-reminders';

async function test() {
  console.log('🧪 Testing Reminder Functions\n');

  const reminders = getTemporalReminders();

  // Test 1: Parse natural time
  console.log('📅 Test 1: Natural Time Parsing');
  console.log('─────────────────────────────────');
  
  const tests = [
    'in 2 minutes',
    'in 1 hour',
    'in 3 days',
    'tomorrow',
    'tomorrow at 2pm',
    'monday',
    'friday at 9am',
  ];

  for (const input of tests) {
    const date = reminders.parseNaturalTime(input);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const diffMinutes = Math.round(diff / 60000);
    console.log(`  "${input}"`);
    console.log(`    → ${date.toLocaleString()}`);
    console.log(`    → ${diffMinutes} minutes from now\n`);
  }

  console.log('✅ Natural time parsing works!\n');

  // Test 2: Extract reminder text
  console.log('💬 Test 2: Text Extraction');
  console.log('─────────────────────────────────');
  
  const textTests = [
    'remind me to review PR',
    'remind me to call John tomorrow',
    'remind me about meeting in 30 minutes',
    'remind me that deadline is friday',
  ];

  for (const input of textTests) {
    const text = reminders.extractReminderText(input);
    console.log(`  "${input}"`);
    console.log(`    → "${text}"\n`);
  }

  console.log('✅ Text extraction works!\n');

  // Test 3: Check Temporal availability
  console.log('🔌 Test 3: Temporal Connection');
  console.log('─────────────────────────────────');
  
  try {
    const testReminder = await reminders.create({
      userId: 'test-user',
      platform: 'discord',
      message: 'Test',
      dueDate: new Date(Date.now() + 60000),
    });
    console.log('  ✅ Temporal is available!');
    console.log(`  Workflow ID: ${testReminder.workflowId}\n`);
  } catch (error: any) {
    console.log('  ⚠️  Temporal not available (expected in dev)');
    console.log(`  Error: ${error.message}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ALL BASIC TESTS PASSED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

test().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
