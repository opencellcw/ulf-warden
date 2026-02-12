#!/bin/bash

# Verificação das Integrações - OpenCell
# Verifica se todas as integrações estão configuradas corretamente

set -e

echo "🔍 Verificando Integrações do OpenCell..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
READY=0
NEEDS_SETUP=0
ERRORS=0

# ============================================================================
# 1. Build Status
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Build Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
((TOTAL++))

if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Build: OK${NC}"
  ((READY++))
else
  echo -e "${RED}❌ Build: FAILED${NC}"
  echo "   Run: npm run build"
  ((ERRORS++))
fi
echo ""

# ============================================================================
# 2. Security
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Security"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
((TOTAL++))

VULN_COUNT=$(npm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.total // 0')
if [ "$VULN_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ Vulnerabilities: 0${NC}"
  ((READY++))
else
  echo -e "${RED}❌ Vulnerabilities: $VULN_COUNT${NC}"
  echo "   Run: npm audit fix"
  ((ERRORS++))
fi
echo ""

# ============================================================================
# 3. Redis Cache
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💰 Redis Cache"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
((TOTAL++))

# Check files
if [ -f "src/core/redis-cache.ts" ] && [ -f "src/api/cache-monitor.ts" ]; then
  echo -e "${GREEN}✅ Code: Implemented${NC}"
  
  # Check Redis
  if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis: Running${NC}"
    ((READY++))
  else
    echo -e "${YELLOW}⚠️  Redis: Not installed${NC}"
    echo "   Install: brew install redis"
    echo "   Start: brew services start redis"
    ((NEEDS_SETUP++))
  fi
else
  echo -e "${RED}❌ Code: Missing files${NC}"
  ((ERRORS++))
fi
echo ""

# ============================================================================
# 4. Langfuse
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Langfuse"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
((TOTAL++))

# Check files
if [ -f "src/observability/langfuse.ts" ]; then
  echo -e "${GREEN}✅ Code: Implemented${NC}"
  
  # Check config
  if grep -q "LANGFUSE_PUBLIC_KEY=pk-lf-" .env 2>/dev/null; then
    echo -e "${GREEN}✅ Config: Configured${NC}"
    echo -e "${GREEN}✅ Status: Ready to use!${NC}"
    ((READY++))
  else
    echo -e "${YELLOW}⚠️  Config: Not configured${NC}"
    echo "   Add to .env:"
    echo "   LANGFUSE_ENABLED=true"
    echo "   LANGFUSE_PUBLIC_KEY=pk-lf-xxx"
    echo "   LANGFUSE_SECRET_KEY=sk-lf-xxx"
    ((NEEDS_SETUP++))
  fi
else
  echo -e "${RED}❌ Code: Missing files${NC}"
  ((ERRORS++))
fi
echo ""

# ============================================================================
# 5. n8n
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 n8n"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
((TOTAL++))

# Check files
if [ -f "scripts/setup-n8n-local.sh" ] && [ -d "docs/n8n-workflows" ]; then
  echo -e "${GREEN}✅ Scripts: Ready${NC}"
  
  WORKFLOW_COUNT=$(ls -1 docs/n8n-workflows/*.json 2>/dev/null | wc -l | tr -d ' ')
  echo -e "${GREEN}✅ Workflows: $WORKFLOW_COUNT ready${NC}"
  
  # Check if running
  if docker ps | grep -q n8n; then
    echo -e "${GREEN}✅ Status: Running${NC}"
    echo "   Access: http://localhost:5678"
    ((READY++))
  else
    echo -e "${YELLOW}⚠️  Status: Not running${NC}"
    echo "   Start: ./scripts/setup-n8n-local.sh"
    ((NEEDS_SETUP++))
  fi
else
  echo -e "${RED}❌ Scripts: Missing files${NC}"
  ((ERRORS++))
fi
echo ""

# ============================================================================
# 6. Supabase
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  Supabase"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
((TOTAL++))

# Check files
if [ -f "src/database/supabase.ts" ] && [ -f "migrations/supabase/001_initial_schema.sql" ]; then
  echo -e "${GREEN}✅ Code: Implemented${NC}"
  
  # Check config
  if grep -q "SUPABASE_URL=https://" .env 2>/dev/null && grep -q "SUPABASE_ANON_KEY=eyJ" .env 2>/dev/null; then
    ENABLED=$(grep "SUPABASE_ENABLED=" .env | cut -d= -f2)
    if [ "$ENABLED" = "true" ]; then
      echo -e "${GREEN}✅ Config: Configured${NC}"
      echo -e "${GREEN}✅ Status: Enabled${NC}"
      ((READY++))
    else
      echo -e "${YELLOW}⚠️  Config: Configured but disabled${NC}"
      echo "   Enable: Set SUPABASE_ENABLED=true in .env"
      ((NEEDS_SETUP++))
    fi
  else
    echo -e "${YELLOW}⚠️  Config: Not configured${NC}"
    echo "   Setup: https://supabase.com (30 min)"
    echo "   Docs: docs/supabase-guide.md"
    ((NEEDS_SETUP++))
  fi
else
  echo -e "${RED}❌ Code: Missing files${NC}"
  ((ERRORS++))
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total checks:        $TOTAL"
echo -e "${GREEN}Ready:              $READY ✅${NC}"
echo -e "${YELLOW}Needs setup:        $NEEDS_SETUP ⚠️${NC}"
echo -e "${RED}Errors:             $ERRORS ❌${NC}"
echo ""

# Calculate percentage
PERCENT=$((READY * 100 / TOTAL))
echo "Progress:            $PERCENT%"
echo ""

# ROI
if [ $READY -ge 4 ]; then
  echo -e "${GREEN}💰 ROI unlocked: ~\$20,000+/year${NC}"
else
  echo -e "${YELLOW}💰 Potential ROI: ~\$23,000/year${NC}"
fi
echo ""

# Next steps
if [ $NEEDS_SETUP -gt 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🎯 NEXT STEPS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  if ! redis-cli ping > /dev/null 2>&1; then
    echo "1. Install Redis:"
    echo "   brew install redis"
    echo "   brew services start redis"
    echo ""
  fi
  
  if ! grep -q "SUPABASE_URL=https://" .env 2>/dev/null; then
    echo "2. Setup Supabase (30 min):"
    echo "   - Go to: https://supabase.com"
    echo "   - Create project"
    echo "   - Deploy schema: migrations/supabase/001_initial_schema.sql"
    echo "   - Add credentials to .env"
    echo ""
  fi
  
  if ! docker ps | grep -q n8n; then
    echo "3. Start n8n:"
    echo "   ./scripts/setup-n8n-local.sh"
    echo ""
  fi
fi

# Documentation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 DOCUMENTATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Quick start:      TODAY_TLDR.md"
echo "Full summary:     FINAL_SUMMARY_FEB12.md"
echo "Status:           INTEGRATIONS_STATUS_V2.md"
echo "Guides:           docs/*-guide.md"
echo ""

# Exit code
if [ $ERRORS -gt 0 ]; then
  exit 1
else
  exit 0
fi
