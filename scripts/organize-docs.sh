#!/bin/bash
# Organize all .md files in the repository

set -e

cd "$(dirname "$0")/.."

echo "📁 Organizing documentation files..."
echo ""

# Create directory structure
mkdir -p docs/history
mkdir -p docs/implementation  
mkdir -p docs/deployment
mkdir -p docs/features
mkdir -p docs/archive

# Count files
total=$(find . -maxdepth 1 -name "*.md" -type f | grep -v "README.md\|CHANGELOG.md\|CONTRIBUTING.md\|QUICKSTART.md\|LICENSE.md" | wc -l | tr -d ' ')
echo "Found $total .md files to organize"
echo ""

# HISTORY - Work summaries, reports, status updates
echo "📊 Moving history files..."
mv -f TODAYS_WORK_SUMMARY.md docs/history/ 2>/dev/null || true
mv -f TODAY_TLDR.md docs/history/ 2>/dev/null || true
mv -f WORK-SUMMARY-*.md docs/history/ 2>/dev/null || true
mv -f FINAL_SUMMARY*.md docs/history/ 2>/dev/null || true
mv -f EPIC_FINAL_SUMMARY.md docs/history/ 2>/dev/null || true
mv -f ULTIMATE_SUMMARY*.md docs/history/ 2>/dev/null || true
mv -f EXECUTIVE_SUMMARY*.md docs/history/ 2>/dev/null || true
mv -f FINAL_SESSION_REVIEW*.md docs/history/ 2>/dev/null || true
mv -f CHECKUP_REPORT.md docs/history/ 2>/dev/null || true
mv -f ANALISE_FINAL_PRE_DEPLOY.md docs/history/ 2>/dev/null || true
mv -f BRUTAL-SCAN*.md docs/history/ 2>/dev/null || true
mv -f PROJECT_STATS.md docs/history/ 2>/dev/null || true
mv -f WORKSPACE-FILES-UPDATED.md docs/history/ 2>/dev/null || true

# IMPLEMENTATION - Feature completion docs
echo "✅ Moving implementation files..."
mv -f *_COMPLETE*.md docs/implementation/ 2>/dev/null || true
mv -f *_DONE.md docs/implementation/ 2>/dev/null || true
mv -f COMPLETE_IMPLEMENTATION*.md docs/implementation/ 2>/dev/null || true
mv -f IMPLEMENTATION_SUMMARY.md docs/implementation/ 2>/dev/null || true
mv -f FEATURES_INTEGRATED.md docs/implementation/ 2>/dev/null || true
mv -f INTEGRATIONS_*.md docs/implementation/ 2>/dev/null || true
mv -f INTEGRATION_COMPLETE.md docs/implementation/ 2>/dev/null || true
mv -f CRON_ANALYSIS.md docs/implementation/ 2>/dev/null || true
mv -f MEMORY-CURATOR-FIX-COMPLETE.md docs/implementation/ 2>/dev/null || true

# DEPLOYMENT - Deploy guides, status, summaries
echo "🚀 Moving deployment files..."
mv -f DEPLOY*.md docs/deployment/ 2>/dev/null || true
mv -f DEPLOYMENT*.md docs/deployment/ 2>/dev/null || true
mv -f QUICK_START*.md docs/deployment/ 2>/dev/null || true
mv -f BRANCHING_STRATEGY.md docs/deployment/ 2>/dev/null || true
mv -f repo-analysis.md docs/deployment/ 2>/dev/null || true
mv -f product-improvements.md docs/deployment/ 2>/dev/null || true

# FEATURES - Feature guides, usage docs
echo "🎨 Moving feature files..."
mv -f *_GUIDE.md docs/features/ 2>/dev/null || true
mv -f DISCORD_*.md docs/features/ 2>/dev/null || true
mv -f VIDEO_*.md docs/features/ 2>/dev/null || true
mv -f FEEDBACK_*.md docs/features/ 2>/dev/null || true
mv -f TEMPORAL_*.md docs/features/ 2>/dev/null || true
mv -f TOP3_FEATURES*.md docs/features/ 2>/dev/null || true
mv -f NEXT_LEVEL_FEATURES.md docs/features/ 2>/dev/null || true
mv -f WHATS_NEW.md docs/features/ 2>/dev/null || true
mv -f WHAT_TO_DO_NOW.md docs/features/ 2>/dev/null || true

# ARCHIVE - Old/deprecated docs
echo "📦 Moving archive files..."
mv -f README_OLD.md docs/archive/ 2>/dev/null || true
mv -f CHANGELOG_v*.md docs/archive/ 2>/dev/null || true
mv -f CLAUDE_2_ONBOARDING.md docs/archive/ 2>/dev/null || true
mv -f TUNNEL-CONSCIOUSNESS.md docs/archive/ 2>/dev/null || true
mv -f DECISION-INTELLIGENCE-SYSTEM.md docs/archive/ 2>/dev/null || true
mv -f CLEANUP-*.md docs/archive/ 2>/dev/null || true
mv -f COMMIT_MESSAGE*.md docs/archive/ 2>/dev/null || true
mv -f ACTION_PLAN.md docs/archive/ 2>/dev/null || true
mv -f GAPS_CRITICOS.md docs/archive/ 2>/dev/null || true
mv -f AUDIO_FIX.md docs/archive/ 2>/dev/null || true
mv -f API_KEYS_SECURE.md docs/archive/ 2>/dev/null || true
mv -f FINAL_TEST_SUMMARY.md docs/archive/ 2>/dev/null || true
mv -f TESTS_PASSED.md docs/archive/ 2>/dev/null || true
mv -f IMAGE_GENERATION_FIX.md docs/archive/ 2>/dev/null || true
mv -f FINAL_READY_TO_TEST.md docs/archive/ 2>/dev/null || true
mv -f VOICE-TO-VOICE-COMPLETE.md docs/archive/ 2>/dev/null || true

echo ""
echo "✅ Organization complete!"
echo ""
echo "📁 New structure:"
echo "  docs/history/         - Work summaries & reports"
echo "  docs/implementation/  - Feature completion docs"
echo "  docs/deployment/      - Deployment guides & status"
echo "  docs/features/        - Feature guides & usage"
echo "  docs/archive/         - Old/deprecated docs"
echo "  docs/                 - Main documentation (kept)"
echo ""
echo "Root directory now contains only:"
echo "  README.md"
echo "  CHANGELOG.md"
echo "  CONTRIBUTING.md"
echo "  QUICKSTART.md"
echo ""

# Count organized files
history_count=$(find docs/history -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
impl_count=$(find docs/implementation -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
deploy_count=$(find docs/deployment -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
features_count=$(find docs/features -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
archive_count=$(find docs/archive -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')

echo "📊 Files organized:"
echo "  History:        $history_count files"
echo "  Implementation: $impl_count files"
echo "  Deployment:     $deploy_count files"
echo "  Features:       $features_count files"
echo "  Archive:        $archive_count files"
echo ""
echo "Total organized: $((history_count + impl_count + deploy_count + features_count + archive_count)) files"
echo ""
echo "🎉 Done! Repository is now clean and organized!"
