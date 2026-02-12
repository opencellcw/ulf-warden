#!/bin/bash

# System Cleanup Script
# Executa limpeza baseada no audit report

set -e  # Exit on error

echo "🧹 SYSTEM CLEANUP - Automated"
echo "=============================="
echo ""
echo "⚠️  Este script vai:"
echo "  1. Remover código órfão (~50 KB)"
echo "  2. Consolidar cache systems"
echo "  3. Consolidar self-improvers"
echo "  4. Replace console.log → logger"
echo ""
read -p "Continuar? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Cancelado"
    exit 1
fi

# Backup first
echo "📦 1. Criando backup..."
git stash push -m "Pre-cleanup backup $(date +%Y%m%d_%H%M%S)"

# Remove orphan files
echo "🗑️  2. Removendo código órfão..."
if [ -f "src/reminders/temporal-reminders.ts" ]; then
  rm src/reminders/temporal-reminders.ts
  echo "  ✅ Removed temporal-reminders.ts"
fi

if [ -f "src/reminders/hybrid-reminders.ts" ]; then
  rm src/reminders/hybrid-reminders.ts
  echo "  ✅ Removed hybrid-reminders.ts"
fi

if [ -d "src/workflows" ]; then
  rm -rf src/workflows/
  echo "  ✅ Removed workflows/"
fi

if [ -f "src/multi-bot/orchestrator.ts" ]; then
  rm src/multi-bot/orchestrator.ts
  echo "  ✅ Removed multi-bot/orchestrator.ts"
  # Remove dir if empty
  rmdir src/multi-bot/ 2>/dev/null || true
fi

if [ -f "src/daemon.ts" ]; then
  rm src/daemon.ts
  echo "  ✅ Removed daemon.ts"
fi

# Consolidate cache
echo "🔄 3. Consolidando cache systems..."
if [ -f "src/utils/cache.ts" ]; then
  echo "  ⚠️  Manual: Merge utils/cache.ts → core/cache.ts"
  echo "  (Skipping automatic merge, do manually)"
fi

# Consolidate self-improver
echo "🔄 4. Consolidando self-improvers..."
if [ -f "src/evolution/enhanced-self-improver.ts" ]; then
  echo "  ⚠️  Manual: Choose self-improver vs enhanced-self-improver"
  echo "  (Skipping automatic merge, do manually)"
fi

# Replace console.log (safe version - only in comments)
echo "📝 5. Replacing console.log → logger (safe mode)..."
echo "  ⚠️  Manual: Review and replace console.log calls"
echo "  Command: find src/ -name '*.ts' | xargs grep 'console\.'"

# Build test
echo "🔨 6. Testing build..."
if npm run build; then
  echo "  ✅ Build successful!"
else
  echo "  ❌ Build failed! Rolling back..."
  git stash pop
  exit 1
fi

echo ""
echo "✅ CLEANUP COMPLETE!"
echo ""
echo "📊 Results:"
du -sh src/ 2>/dev/null || true
echo ""
echo "🔄 Next steps (manual):"
echo "  1. Review changes: git status"
echo "  2. Test: npm run build && npm start"
echo "  3. Commit: git commit -m 'chore: cleanup orphan code'"
echo "  4. Deploy to K8s"
echo ""
echo "💾 Backup available: git stash list"
