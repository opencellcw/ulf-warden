#!/bin/bash
set -e

echo "🧹 Starting documentation cleanup..."

# Create backup
echo "📦 Creating backup..."
mkdir -p .backup-docs
cp -r *.md .backup-docs/ 2>/dev/null || true

# Move important docs to docs/
echo "📁 Moving important docs to docs/..."
[ -f "VOICE-TO-VOICE-COMPLETE.md" ] && mv VOICE-TO-VOICE-COMPLETE.md docs/VOICE-TO-VOICE-SYSTEM.md
[ -f "API_INTEGRATIONS_GUIDE.md" ] && mv API_INTEGRATIONS_GUIDE.md docs/API-INTEGRATIONS.md
[ -f "FEEDBACK_SYSTEM_GUIDE.md" ] && mv FEEDBACK_SYSTEM_GUIDE.md docs/FEEDBACK-SYSTEM.md
[ -f "REPLICATE_ENHANCED_GUIDE.md" ] && mv REPLICATE_ENHANCED_GUIDE.md docs/REPLICATE-GUIDE.md
[ -f "VIDEO_CLONE_GUIDE.md" ] && mv VIDEO_CLONE_GUIDE.md docs/VIDEO-CLONE.md

# Delete temporary/redundant files
echo "🗑️  Deleting temporary files..."

# Pattern-based deletion
rm -f *FINAL*FEB12*.md
rm -f *SUMMARY*FEB12*.md
rm -f *COMPLETE*FEB12*.md
rm -f *STATUS*.md
rm -f *COMMIT_MESSAGE*.md
rm -f *DEPLOY*.md
rm -f *WORK-*.md
rm -f *SESSION-*.md
rm -f *TODAY*.md
rm -f *CHECKUP*.md
rm -f *AUDIT*.md
rm -f *DIAGNOSIS*.md
rm -f *ANALYSIS*.md
rm -f *TEST_*.md
rm -f *GAPS*.md
rm -f *CLEANUP*.md
rm -f *IMPLEMENTATION*.md
rm -f *INTEGRATION*STATUS*.md
rm -f *CRON-*.md
rm -f *ACTION_PLAN*.md
rm -f *EPIC_*.md
rm -f *BRANCHING*.md
rm -f *DOCS_INDEX*.md
rm -f *DOCUMENTATION*.md
rm -f *ENV-VARS*.md
rm -f *FEATURES*.md
rm -f *INTELLIGENT*.md
rm -f *NEXT_LEVEL*.md
rm -f *OPTIONAL*.md
rm -f *PROJECT_STATS*.md
rm -f *READER*.md
rm -f *SELF-*.md
rm -f *SMART-*.md
rm -f *STACK-*.md
rm -f *SUPABASE*.md
rm -f *TUNNEL*.md
rm -f *ULTIMATE*.md
rm -f *WORKSPACE*.md
rm -f *WHATS_NEW*.md
rm -f *WHAT_TO_DO*.md
rm -f AUDIO*.md
rm -f AUTO-*.md
rm -f BITCOIN*.md
rm -f BOT-SELF*.md
rm -f CLAUDE_2*.md
rm -f COPY_MY*.md
rm -f DECISION*.md
rm -f DISCORD_*.md
rm -f EXECUTIVE*.md
rm -f IMAGE_*.md
rm -f INTEGRATIONS_TLDR.md
rm -f QUICK-*.md
rm -f QUICK_START_CACHE.md
rm -f QUICK_START_INTEGRATIONS.md
rm -f QUICK_START_PI_BOTS.md
rm -f README_INTEGRATIONS.md
rm -f REDIS-*.md
rm -f product-improvements.md
rm -f repo-analysis.md

# Delete old CHANGELOGs if v3.0 exists
[ -f "CHANGELOG_v3.0.md" ] && rm -f CHANGELOG.md 2>/dev/null || true

echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  Kept in root: $(ls *.md 2>/dev/null | wc -l) files"
echo "  Backup at: .backup-docs/"
echo ""
echo "To restore: cp .backup-docs/*.md ."
