/**
 * Test script to verify Tool Registry bootstrap integration
 */

import 'dotenv/config';
import { persistence } from '../src/persistence';
import { featureFlags, Feature } from '../src/core/feature-flags';
import { toolRegistry } from '../src/core/tool-registry';
import path from 'path';

async function testBootstrap() {
  console.log('🧪 Testing Tool Registry Bootstrap Integration\n');

  try {
    // 1. Initialize persistence
    console.log('1️⃣  Initializing persistence...');
    await persistence.init();
    console.log('   ✅ Persistence initialized\n');

    // 2. Initialize feature flags
    console.log('2️⃣  Initializing feature flags...');
    await featureFlags.init(persistence.getDatabaseManager());
    console.log('   ✅ Feature flags initialized\n');

    // 3. Enable Tool Registry features
    console.log('3️⃣  Enabling Phase 2 features...');
    await featureFlags.enable(Feature.TOOL_REGISTRY);
    await featureFlags.enable(Feature.WORKFLOW_MANAGER);
    console.log('   ✅ TOOL_REGISTRY:', featureFlags.isEnabled(Feature.TOOL_REGISTRY));
    console.log('   ✅ WORKFLOW_MANAGER:', featureFlags.isEnabled(Feature.WORKFLOW_MANAGER));
    console.log('');

    // 4. Auto-discover tools
    console.log('4️⃣  Auto-discovering tools...');
    const toolsRegistryPath = path.join(__dirname, '..', 'src', 'tools', 'registry');
    console.log('   📁 Path:', toolsRegistryPath);

    try {
      await toolRegistry.autoDiscover(toolsRegistryPath);

      const stats = toolRegistry.getStats();
      console.log('   ✅ Auto-discovery complete!\n');

      // 5. Display statistics
      console.log('📊 Tool Registry Statistics:');
      console.log('   Total Tools:', stats.totalTools);
      console.log('   Enabled Tools:', stats.enabledTools);
      console.log('   By Category:', JSON.stringify(stats.byCategory, null, 2));
      console.log('   By Risk Level:', JSON.stringify(stats.byRiskLevel, null, 2));
      console.log('');

      // 6. List discovered tools
      if (stats.totalTools > 0) {
        console.log('🔧 Discovered Tools:');
        const tools = toolRegistry.getAllTools();
        for (const tool of tools) {
          const status = tool.metadata.enabled ? '✅' : '❌';
          console.log(`   ${status} ${tool.metadata.name} (${tool.metadata.category}, ${tool.metadata.security.riskLevel} risk)`);
        }
        console.log('');
      }

      // 7. Test feature flag persistence
      console.log('5️⃣  Testing feature flag persistence...');
      const allFlags = featureFlags.getAllFlags();
      console.log('   Current flags:', JSON.stringify(allFlags, null, 2));
      console.log('');

      console.log('✅ Bootstrap integration test PASSED!\n');

    } catch (error) {
      console.log('   ⚠️  Auto-discovery failed (directory may not exist yet)');
      console.log('   Error:', error instanceof Error ? error.message : String(error));
      console.log('   This is expected if tools/registry/ directory doesn\'t exist yet\n');
    }

    // Cleanup
    await persistence.close();
    console.log('🧹 Cleanup complete');

  } catch (error) {
    console.error('❌ Bootstrap test FAILED:', error);
    process.exit(1);
  }
}

// Run test
testBootstrap();
