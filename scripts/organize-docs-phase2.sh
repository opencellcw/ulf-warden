#!/bin/bash
# Phase 2: Organize remaining .md files

set -e
cd "$(dirname "$0")/.."

echo "📁 Phase 2: Organizing remaining files..."

# IMPLEMENTATION - More completion docs
mv -f AUDIO-FILE-COMPLETE.md docs/implementation/ 2>/dev/null || true
mv -f ENV-VARS-COMPLETE.md docs/implementation/ 2>/dev/null || true
mv -f QUICK-WINS-COMPLETE.md docs/implementation/ 2>/dev/null || true
mv -f PHASE1-FIXES-APPLIED.md docs/implementation/ 2>/dev/null || true
mv -f QUICK-ACTIONS-FIX.md docs/implementation/ 2>/dev/null || true

# HISTORY - More reports & audits
mv -f DOCUMENTATION-COMPLETE-REPORT.md docs/history/ 2>/dev/null || true
mv -f FINAL-AUDIT-REPORT.md docs/history/ 2>/dev/null || true
mv -f FINAL_DEPLOYMENT_FEB12.md docs/history/ 2>/dev/null || true
mv -f FINAL_STATUS.md docs/history/ 2>/dev/null || true
mv -f INTEGRATION-OPPORTUNITIES-SCAN.md docs/history/ 2>/dev/null || true

# FEATURES - More guides
mv -f DOCUMENTATION-REVIEW-AGENT.md docs/features/ 2>/dev/null || true
mv -f DOCUMENTATION_REVIEW.md docs/features/ 2>/dev/null || true
mv -f DOCX_SKILL_IMPROVEMENTS.md docs/features/ 2>/dev/null || true
mv -f DOCX_SKILL_REVIEW.md docs/features/ 2>/dev/null || true
mv -f OPTIONAL-ACTIONS.md docs/features/ 2>/dev/null || true
mv -f READER-TESTING-QUESTIONS.md docs/features/ 2>/dev/null || true
mv -f READER-TESTING-REPORT.md docs/features/ 2>/dev/null || true
mv -f README_INTEGRATIONS.md docs/features/ 2>/dev/null || true
mv -f REPLICATE-TESTING-COMPLETE.md docs/features/ 2>/dev/null || true
mv -f TOOLS-ADVANCED.md docs/features/ 2>/dev/null || true
mv -f TOOLS-DOCUMENTATION-COMPLETE.md docs/features/ 2>/dev/null || true
mv -f TOOLS_GUIDE.md docs/features/ 2>/dev/null || true

# Special case - Keep DOCS_INDEX in docs/
mv -f DOCS_INDEX.md docs/ 2>/dev/null || true

echo "✅ Phase 2 complete!"

# Final count
remaining=$(find . -maxdepth 1 -name "*.md" -type f | grep -v "README.md\|CHANGELOG.md\|CONTRIBUTING.md\|QUICKSTART.md" | wc -l | tr -d ' ')
echo "📊 Remaining in root: $remaining files"
echo ""
echo "Should only have: README.md, CHANGELOG.md, CONTRIBUTING.md, QUICKSTART.md"

