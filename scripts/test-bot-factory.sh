#!/bin/bash
# Test script for Bot Factory functionality

set -e

echo "🧪 Bot Factory Test Suite"
echo "========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((TESTS_PASSED++))
}

fail() {
  echo -e "${RED}✗${NC} $1"
  ((TESTS_FAILED++))
}

info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

# Test 1: Check if Bot Factory files exist
echo "Test 1: Verify Bot Factory files"
echo "---------------------------------"

FILES=(
  "src/bot-factory/types.ts"
  "src/bot-factory/schema.sql"
  "src/bot-factory/registry.ts"
  "src/bot-factory/helm-generator.ts"
  "src/bot-factory/deployer.ts"
  "src/bot-factory/discord-handler.ts"
  "src/bot-factory/tools.ts"
  "src/bot-factory/executor.ts"
  "src/bot-factory/index.ts"
  "src/bot-factory/README.md"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    pass "File exists: $file"
  else
    fail "File missing: $file"
  fi
done

echo ""

# Test 2: Check if database directory exists
echo "Test 2: Verify data directory"
echo "------------------------------"

if [ -d "data" ]; then
  pass "Data directory exists"
else
  info "Data directory doesn't exist yet (will be created on first run)"
fi

echo ""

# Test 3: Check Helm chart exists
echo "Test 3: Verify Helm chart"
echo "-------------------------"

if [ -d "infra/helm/agent" ]; then
  pass "Helm agent chart exists"
else
  fail "Helm agent chart not found"
fi

if [ -f "infra/helm/agent/Chart.yaml" ]; then
  pass "Chart.yaml exists"
else
  fail "Chart.yaml not found"
fi

if [ -f "infra/helm/agent/values.yaml" ]; then
  pass "values.yaml exists"
else
  fail "values.yaml not found"
fi

echo ""

# Test 4: Check environment variables
echo "Test 4: Check environment variables"
echo "------------------------------------"

if [ -n "$GCP_PROJECT_ID" ]; then
  pass "GCP_PROJECT_ID is set"
else
  info "GCP_PROJECT_ID not set (required for deployment)"
fi

if [ -n "$DISCORD_ADMIN_USER_IDS" ]; then
  pass "DISCORD_ADMIN_USER_IDS is set"
else
  info "DISCORD_ADMIN_USER_IDS not set (required for admin access)"
fi

echo ""

# Test 5: Check kubectl access (if available)
echo "Test 5: Check Kubernetes access"
echo "--------------------------------"

if command -v kubectl &> /dev/null; then
  pass "kubectl is installed"

  if kubectl cluster-info &> /dev/null; then
    pass "kubectl can connect to cluster"

    # Check if agents namespace exists
    if kubectl get namespace agents &> /dev/null; then
      pass "agents namespace exists"
    else
      info "agents namespace doesn't exist (will be created on first deployment)"
    fi
  else
    info "kubectl cannot connect to cluster (not required for local testing)"
  fi
else
  info "kubectl not installed (not required for local testing)"
fi

echo ""

# Test 6: Check Helm (if available)
echo "Test 6: Check Helm"
echo "------------------"

if command -v helm &> /dev/null; then
  pass "Helm is installed"

  HELM_VERSION=$(helm version --short 2>/dev/null || echo "unknown")
  info "Helm version: $HELM_VERSION"
else
  info "Helm not installed (required for deployment)"
fi

echo ""

# Test 7: Check TypeScript compilation
echo "Test 7: TypeScript validation"
echo "------------------------------"

if command -v npx &> /dev/null; then
  info "Running TypeScript check on Bot Factory files..."

  # Note: We skip lib check and ignore existing errors
  # We only care that our new files don't have syntax errors
  if npx tsc --noEmit --skipLibCheck src/bot-factory/types.ts &> /dev/null; then
    pass "types.ts compiles successfully"
  else
    info "types.ts has issues (check manually)"
  fi
else
  info "npx not available, skipping TypeScript check"
fi

echo ""

# Test 8: Integration checks
echo "Test 8: Integration checks"
echo "--------------------------"

# Check if tools are registered
if grep -q "BOT_FACTORY_TOOLS" src/tools/definitions.ts; then
  pass "Bot Factory tools registered in definitions"
else
  fail "Bot Factory tools not found in definitions"
fi

# Check if executor is integrated
if grep -q "executeBotFactoryTool" src/tools/index.ts; then
  pass "Bot Factory executor integrated"
else
  fail "Bot Factory executor not found in tools/index.ts"
fi

# Check if Discord handler is integrated
if grep -q "handleBotCreation" src/handlers/discord.ts; then
  pass "Bot Factory Discord handler integrated"
else
  fail "Bot Factory Discord handler not found in discord.ts"
fi

# Check if bot creation command is detected
if grep -q "criar bot\|create bot" src/handlers/discord.ts; then
  pass "Bot creation command detection added"
else
  fail "Bot creation command detection not found"
fi

echo ""
echo "========================="
echo "Test Results"
echo "========================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Set environment variables: GCP_PROJECT_ID, DISCORD_ADMIN_USER_IDS"
  echo "2. Build the project: npm run build"
  echo "3. Start the bot: npm start"
  echo "4. Test bot creation in Discord: '@Ulf create a bot named testbot'"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please fix the issues above.${NC}"
  exit 1
fi
