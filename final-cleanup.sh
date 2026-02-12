#!/bin/bash

echo "🧹 Final cleanup - keeping ONLY essentials..."

# Move remaining extras to docs/ or delete
[ -f "FEEDBACK_INTEGRATION_EXAMPLE.md" ] && mv FEEDBACK_INTEGRATION_EXAMPLE.md docs/
[ -f "SELF_IMPROVEMENT_CHANNEL.md" ] && mv SELF_IMPROVEMENT_CHANNEL.md docs/
[ -f "SELF_IMPROVEMENT_COMPLETE_GUIDE.md" ] && mv SELF_IMPROVEMENT_COMPLETE_GUIDE.md docs/
[ -f "TEMPORAL_REMINDERS_GUIDE.md" ] && mv TEMPORAL_REMINDERS_GUIDE.md docs/
[ -f "INTEGRATION-OPPORTUNITIES-SCAN.md" ] && rm -f INTEGRATION-OPPORTUNITIES-SCAN.md
[ -f "FINAL_READY_TO_TEST.md" ] && rm -f FINAL_READY_TO_TEST.md
[ -f "TESTS_PASSED.md" ] && rm -f TESTS_PASSED.md

echo "✅ Final cleanup done!"
echo ""
echo "📊 Root directory now has: $(ls *.md 2>/dev/null | wc -l) files"
ls -1 *.md 2>/dev/null
