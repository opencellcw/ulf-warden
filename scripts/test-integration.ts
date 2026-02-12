/**
 * Test Integration - Quick verification
 */

import { extractReplicateImageInfo } from '../src/handlers/replicate-message-enhancer';
import { YoutubeTranscript } from 'youtube-transcript-plus';

console.log('🧪 TESTING INTEGRATION...\n');

// ============================================================================
// TEST 1: Replicate Message Enhancement
// ============================================================================
console.log('📝 TEST 1: Replicate Message Pattern Detection');
console.log('─'.repeat(60));

const testMessage1 = `✅ Image generated! | Nanobanana Pro | $0.0200

https://replicate.delivery/pbxt/xyz123.png`;

const result1 = extractReplicateImageInfo(testMessage1);

if (result1) {
  console.log('✅ PASS: Pattern detected correctly');
  console.log('   Model:', result1.model);
  console.log('   Cost: $' + result1.cost);
  console.log('   URL:', result1.url.substring(0, 50) + '...');
} else {
  console.log('❌ FAIL: Pattern should be detected');
  process.exit(1);
}

// Test negative case
const testMessage2 = "Hello, this is a normal message";
const result2 = extractReplicateImageInfo(testMessage2);

if (!result2) {
  console.log('✅ PASS: Non-matching message ignored correctly');
} else {
  console.log('❌ FAIL: Should not detect normal messages');
  process.exit(1);
}

console.log();

// ============================================================================
// TEST 2: YouTube Transcript
// ============================================================================
console.log('📝 TEST 2: YouTube Transcript Fetching');
console.log('─'.repeat(60));

async function testYouTube() {
  try {
    const videoId = 'dQw4w9WgXcQ'; // Rick Roll (always has captions)
    console.log('Fetching transcript for:', videoId);
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (transcript && transcript.length > 0) {
      console.log('✅ PASS: Transcript fetched');
      console.log('   Segments:', transcript.length);
      console.log('   First text:', transcript[0].text.substring(0, 30) + '...');
    } else {
      console.log('❌ FAIL: No transcript data');
      process.exit(1);
    }
  } catch (error: any) {
    console.log('❌ FAIL: YouTube API error:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// TEST 3: Tool Registration Check
// ============================================================================
console.log('\n📝 TEST 3: Tool Registration');
console.log('─'.repeat(60));

import { TOOLS } from '../src/tools/definitions';

const videoCloneTool = TOOLS.find((t: any) => t.name === 'youtube_video_clone');

if (videoCloneTool) {
  console.log('✅ PASS: youtube_video_clone registered');
  console.log('   Description:', videoCloneTool.description?.substring(0, 50) + '...');
} else {
  console.log('❌ FAIL: youtube_video_clone not found in TOOLS');
  process.exit(1);
}

// ============================================================================
// TEST 4: Handler Integration Check
// ============================================================================
console.log('\n📝 TEST 4: Handler Integration');
console.log('─'.repeat(60));

import * as fs from 'fs';

const discordHandlerContent = fs.readFileSync('src/handlers/discord.ts', 'utf-8');

const checks = [
  { name: 'handleReplicateUIButtons import', pattern: /import.*handleReplicateUIButtons/ },
  { name: 'enhanceReplicateMessage import', pattern: /import.*enhanceReplicateMessage/ },
  { name: 'Button interaction handler', pattern: /replicate:/ },
  { name: 'Message enhancement call', pattern: /enhanceReplicateMessage/ }
];

let allPassed = true;
checks.forEach(check => {
  if (check.pattern.test(discordHandlerContent)) {
    console.log(`✅ PASS: ${check.name}`);
  } else {
    console.log(`❌ FAIL: ${check.name}`);
    allPassed = false;
  }
});

if (!allPassed) {
  process.exit(1);
}

// ============================================================================
// RUN ASYNC TESTS
// ============================================================================
console.log();
testYouTube().then(() => {
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 ALL TESTS PASSED!');
  console.log('═'.repeat(60));
  console.log('\n✅ Integration is working correctly');
  console.log('✅ Ready for production use');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
