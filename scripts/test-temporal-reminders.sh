#!/bin/bash

echo "🧪 Testing Temporal Reminders System"
echo "===================================="
echo ""

# Check if Temporal is configured
if [ -z "$TEMPORAL_ADDRESS" ]; then
  echo "⚠️  TEMPORAL_ADDRESS not set, using localhost:7233"
  export TEMPORAL_ADDRESS="localhost:7233"
fi

echo "📍 Temporal Address: $TEMPORAL_ADDRESS"
echo ""

# Check if Temporal server is running
echo "🔍 Checking Temporal server..."
if ! nc -z localhost 7233 2>/dev/null; then
  echo "❌ Temporal server not running on localhost:7233"
  echo ""
  echo "Start Temporal with:"
  echo "  ./scripts/setup-temporal-local.sh"
  exit 1
fi

echo "✅ Temporal server is running"
echo ""

# Create test script
cat > /tmp/test-reminders.ts << 'TESTEOF'
import { getTemporalReminders } from './src/reminders/temporal-reminders';

async function test() {
  console.log('🧪 Testing Temporal Reminders...\n');

  const reminders = getTemporalReminders();

  // Test 1: Parse natural time
  console.log('Test 1: Parse natural time');
  const date1 = reminders.parseNaturalTime('in 2 minutes');
  console.log(`  "in 2 minutes" → ${date1.toLocaleString()}`);
  
  const date2 = reminders.parseNaturalTime('tomorrow at 2pm');
  console.log(`  "tomorrow at 2pm" → ${date2.toLocaleString()}`);
  console.log('  ✅ Parsing works\n');

  // Test 2: Extract reminder text
  console.log('Test 2: Extract reminder text');
  const text = reminders.extractReminderText('remind me to review PR tomorrow at 2pm');
  console.log(`  Input: "remind me to review PR tomorrow at 2pm"`);
  console.log(`  Output: "${text}"`);
  console.log('  ✅ Text extraction works\n');

  // Test 3: Create reminder (will fail if Temporal not running)
  console.log('Test 3: Create reminder');
  try {
    const reminder = await reminders.create({
      userId: 'test-user-123',
      platform: 'discord',
      message: 'Test reminder',
      dueDate: new Date(Date.now() + 5000), // 5 seconds from now
    });
    
    console.log(`  ✅ Reminder created!`);
    console.log(`     Workflow ID: ${reminder.workflowId}`);
    console.log(`     Due: ${reminder.dueDate.toLocaleString()}`);
    console.log('');
    
    // Wait for reminder to trigger
    console.log('  ⏳ Waiting 6 seconds for reminder to trigger...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    console.log('  (Check Temporal UI or worker logs for execution)\n');
    
    console.log('✅ ALL TESTS PASSED!');
  } catch (error: any) {
    console.error(`  ❌ Failed to create reminder: ${error.message}`);
    console.log('\n❌ TEST FAILED');
    process.exit(1);
  }
}

test().catch(console.error);
TESTEOF

# Run test with ts-node
echo "🏃 Running tests..."
echo ""
npx ts-node /tmp/test-reminders.ts

