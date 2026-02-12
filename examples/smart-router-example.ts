/**
 * Smart Router Example
 * 
 * Demonstrates AI-powered intelligent LLM routing for cost optimization.
 * Smart Router analyzes tasks and routes to optimal provider automatically.
 */

import { getRouter, selectorAgent } from '../src/llm';

async function main() {
  console.log('🧠 Smart Router Example\n');

  const router = getRouter();

  // Example 1: Simple chat (will route to Gemini Flash)
  console.log('1️⃣  Simple chat:');
  const simple = await router.generate([
    { role: 'user', content: 'What is 2+2?' }
  ]);
  console.log(`Response: ${simple.content.slice(0, 50)}...`);
  console.log(`Model: ${simple.model}\n`);

  // Example 2: Complex reasoning (will route to Claude 3.7)
  console.log('2️⃣  Complex reasoning:');
  const complex = await router.generate([
    { role: 'user', content: 'Explain the CAP theorem and its implications for distributed systems architecture' }
  ]);
  console.log(`Response: ${complex.content.slice(0, 100)}...`);
  console.log(`Model: ${complex.model}\n`);

  // Example 3: Critical task (will route to Claude 3.7)
  console.log('3️⃣  Critical task:');
  const critical = await router.generate([
    { role: 'user', content: 'Deploy to production: kubectl apply -f production.yaml' }
  ]);
  console.log(`Response: ${critical.content.slice(0, 100)}...`);
  console.log(`Model: ${critical.model}\n`);

  // Example 4: With quality requirement
  console.log('4️⃣  With quality requirement:');
  const quality = await router.generate(
    [{ role: 'user', content: 'Write a function to sort an array' }],
    { minQuality: 'excellent' }  // Force high quality
  );
  console.log(`Response: ${quality.content.slice(0, 100)}...`);
  console.log(`Model: ${quality.model}\n`);

  // Example 5: With cost constraint
  console.log('5️⃣  With cost constraint:');
  const budget = await router.generate(
    [{ role: 'user', content: 'Hello, how are you?' }],
    { maxCost: 0.001 }  // Max $0.001
  );
  console.log(`Response: ${budget.content.slice(0, 50)}...`);
  console.log(`Model: ${budget.model}\n`);

  // Example 6: User override
  console.log('6️⃣  User override (force Claude):');
  const override = await router.generate(
    [{ role: 'user', content: 'Simple question' }],
    { preferredProvider: 'claude' }  // Force Claude
  );
  console.log(`Response: ${override.content.slice(0, 50)}...`);
  console.log(`Model: ${override.model}\n`);

  // Show analytics
  console.log('\n📊 Smart Router Analytics:');
  const analytics = selectorAgent.getAnalytics();
  console.log(`Total selections: ${analytics.totalSelections}`);
  console.log(`Provider breakdown:`);
  for (const [provider, count] of Object.entries(analytics.providerBreakdown)) {
    const percentage = ((count / analytics.totalSelections) * 100).toFixed(1);
    console.log(`  - ${provider}: ${count} (${percentage}%)`);
  }
  console.log(`Average cost savings: ${analytics.averageCostSavings}`);
  console.log(`\nTop routing reasons:`);
  analytics.topReasons.slice(0, 3).forEach((reason, i) => {
    console.log(`  ${i + 1}. ${reason.reason} (${reason.count} times)`);
  });

  // Show recent selections
  console.log('\n📋 Recent Selections:');
  const recent = selectorAgent.getRecentSelections(5);
  recent.forEach((selection, i) => {
    console.log(`\n${i + 1}. ${selection.task.slice(0, 60)}...`);
    console.log(`   → ${selection.selectedProvider}/${selection.selectedModel}`);
    console.log(`   Reason: ${selection.reasoning}`);
  });

  console.log('\n✅ Smart Router Example Complete!');
  console.log('\n💡 Benefits:');
  console.log('  - 90-99% cost savings vs always using premium models');
  console.log('  - Automatic routing (no manual decisions)');
  console.log('  - Quality preserved for complex tasks');
  console.log('  - Production safety for critical operations');
  console.log('  - Large context support (Gemini 1M tokens)');
}

// Direct selector agent usage (without router)
async function directSelectorExample() {
  console.log('\n\n🔧 Direct Selector Agent Usage:\n');

  // Example: Get recommendation without executing
  const recommendation = await selectorAgent.selectProvider(
    [{ role: 'user', content: 'Analyze this complex architecture...' }],
    []
  );

  console.log('Recommendation for complex task:');
  console.log(`  Provider: ${recommendation.provider}`);
  console.log(`  Model: ${recommendation.model}`);
  console.log(`  Confidence: ${recommendation.confidence}`);
  console.log(`  Reasoning: ${recommendation.reasoning}`);
  console.log(`  Estimated Cost: $${recommendation.estimatedCost.toFixed(4)}`);
  if (recommendation.fallback) {
    console.log(`  Fallback: ${recommendation.fallback.provider}/${recommendation.fallback.model}`);
  }

  // Example: Get recommendation for simple task
  const simpleRec = await selectorAgent.selectProvider(
    [{ role: 'user', content: 'What is 2+2?' }],
    []
  );

  console.log('\nRecommendation for simple task:');
  console.log(`  Provider: ${simpleRec.provider}`);
  console.log(`  Model: ${simpleRec.model}`);
  console.log(`  Confidence: ${simpleRec.confidence}`);
  console.log(`  Reasoning: ${simpleRec.reasoning}`);
  console.log(`  Estimated Cost: $${simpleRec.estimatedCost.toFixed(6)}`);
}

// Run examples
if (require.main === module) {
  main()
    .then(() => directSelectorExample())
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { main, directSelectorExample };
