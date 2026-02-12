#!/bin/bash
# Phase 3: Final cleanup

set -e
cd "$(dirname "$0")/.."

echo "📁 Phase 3: Final organization..."

# KEEP IN ROOT
echo "✅ Keeping SECURITY.md in root (important)"

# IMPLEMENTATION
mv -f REDIS-FIX-COMPLETE.md docs/implementation/ 2>/dev/null || true
mv -f SMART-REACTION-COMPLETE.md docs/implementation/ 2>/dev/null || true
mv -f SUPABASE_IMPLEMENTATION.md docs/implementation/ 2>/dev/null || true

# HISTORY
mv -f SELF_IMPROVEMENT_STATUS.md docs/history/ 2>/dev/null || true
mv -f STATUS_VISUAL.md docs/history/ 2>/dev/null || true
mv -f SYSTEM-AUDIT-REPORT.md docs/history/ 2>/dev/null || true

# ARCHIVE - Test files
mv -f TEST_BOT_COMMIT.md docs/archive/ 2>/dev/null || true
mv -f TEST_RESULTS.md docs/archive/ 2>/dev/null || true

# FEATURES - Self-improvement
mv -f SELF_IMPROVEMENT_CHANNEL.md docs/features/ 2>/dev/null || true

echo "✅ Phase 3 complete!"
echo ""

# Final verification
echo "📊 FINAL STATUS:"
echo ""
remaining=$(find . -maxdepth 1 -name "*.md" -type f | wc -l | tr -d ' ')
echo "Root directory: $remaining .md files"
ls -1 *.md 2>/dev/null | head -10
echo ""

# Show organized counts
history_count=$(find docs/history -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
impl_count=$(find docs/implementation -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
deploy_count=$(find docs/deployment -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
features_count=$(find docs/features -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
archive_count=$(find docs/archive -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
docs_main=$(find docs/ -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')

echo "📂 Documentation structure:"
echo "  ROOT (essential only):  $remaining files"
echo "  docs/ (main docs):      $docs_main files"
echo "  docs/history/:          $history_count files"
echo "  docs/implementation/:   $impl_count files"
echo "  docs/deployment/:       $deploy_count files"
echo "  docs/features/:         $features_count files"
echo "  docs/archive/:          $archive_count files"
echo ""
total=$((docs_main + history_count + impl_count + deploy_count + features_count + archive_count))
echo "Total in docs/: $total files"
echo "Grand total: $((remaining + total)) files"
echo ""
echo "🎉 ORGANIZATION COMPLETE!"

