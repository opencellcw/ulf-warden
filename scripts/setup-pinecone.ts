#!/usr/bin/env tsx

/**
 * Setup Pinecone Index
 * 
 * Creates the Pinecone index for OpenCell vector memory.
 * 
 * Usage:
 *   npx tsx scripts/setup-pinecone.ts
 * 
 * Prerequisites:
 *   1. Pinecone account created
 *   2. API key in .env:
 *      PINECONE_API_KEY=xxx
 *      PINECONE_ENABLED=true
 */

import { getPinecone } from '../src/vector/pinecone';
import { getEmbeddings } from '../src/vector/embeddings';

async function setup() {
  console.log('🚀 Setting up Pinecone for OpenCell...\n');

  // Check Pinecone
  const pinecone = getPinecone();
  if (!pinecone.isEnabled()) {
    console.error('❌ Pinecone not configured. Please set:');
    console.log('   PINECONE_ENABLED=true');
    console.log('   PINECONE_API_KEY=xxx');
    process.exit(1);
  }

  // Check OpenAI (for embeddings)
  const embeddings = getEmbeddings();
  if (!embeddings.isEnabled()) {
    console.error('❌ OpenAI not configured. Please set:');
    console.log('   OPENAI_API_KEY=xxx');
    process.exit(1);
  }

  console.log('✅ Configuration validated\n');

  try {
    // Get index name
    const indexName = process.env.PINECONE_INDEX || 'opencell-memory';
    console.log(`📦 Creating index: ${indexName}`);

    // Create index
    // Dimension: 1536 (OpenAI text-embedding-3-small)
    // Metric: cosine (best for semantic similarity)
    await pinecone.createIndex(indexName, 1536, 'cosine');

    console.log('✅ Index created (or already exists)\n');

    // Wait for index to be ready
    console.log('⏳ Waiting for index to be ready...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Test with sample data
    console.log('🧪 Testing with sample data...\n');

    const testBotId = 'test-bot';
    const testUserId = 'test-user';

    // Generate embedding
    console.log('   Generating embedding...');
    const testText = 'This is a test memory for OpenCell vector database';
    const embedding = await embeddings.embed(testText);
    console.log(`   ✅ Embedding generated (${embedding.length} dimensions)\n`);

    // Store in Pinecone
    console.log('   Storing in Pinecone...');
    await pinecone.storeMemory(
      testBotId,
      testUserId,
      testText,
      embedding,
      { type: 'test' }
    );
    console.log('   ✅ Stored successfully\n');

    // Query
    console.log('   Querying...');
    const queryText = 'test memory vector database';
    const queryEmbedding = await embeddings.embed(queryText);
    const results = await pinecone.searchMemories(
      testBotId,
      queryEmbedding,
      testUserId,
      1
    );
    console.log(`   ✅ Found ${results.length} result(s)\n`);

    if (results.length > 0) {
      console.log('   Result:');
      console.log(`   - ID: ${results[0].id}`);
      console.log(`   - Score: ${(results[0].score * 100).toFixed(2)}%`);
      console.log(`   - Content: ${results[0].metadata?.content}\n`);
    }

    // Clean up test data
    console.log('   Cleaning up test data...');
    await pinecone.deleteUserMemories(testBotId, testUserId);
    console.log('   ✅ Cleaned up\n');

    // Get stats
    console.log('📊 Index stats:');
    const stats = await pinecone.getStats();
    console.log(`   Total namespaces: ${Object.keys(stats.namespaces || {}).length}`);
    console.log(`   Total vectors: ${stats.totalRecordCount || 0}`);
    console.log(`   Dimension: ${stats.dimension || 1536}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Next steps:');
    console.log('1. Your bots can now use vector memory! 🎉');
    console.log('2. Check usage in Pinecone dashboard');
    console.log('3. See docs/pinecone-guide.md for usage examples\n');

    console.log('Usage example:');
    console.log('```typescript');
    console.log('import { memory } from "./src/memory/vector-memory";');
    console.log('');
    console.log('// Store memory');
    console.log('await memory.store(botId, userId, "User likes pizza");');
    console.log('');
    console.log('// Get context');
    console.log('const context = await memory.getContext(');
    console.log('  botId, userId, "What food does user like?"');
    console.log(');');
    console.log('```\n');

  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check API key is valid');
    console.error('2. Check Pinecone dashboard for errors');
    console.error('3. Try deleting and recreating the index\n');
    process.exit(1);
  }
}

// Run setup
setup().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
