#!/bin/bash

# Migration script for Ulfberht-Warden v2.0
# This script helps migrate from v1.x to v2.0

set -e

echo "================================================"
echo "Ulfberht-Warden v2.0 Migration Script"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Run this script from the project root.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing new dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 2: Building TypeScript...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed. Check errors above.${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 3: Creating data directories...${NC}"
mkdir -p ./data/logs
mkdir -p ./data/fallback
mkdir -p ./workspace/memory
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

echo -e "${YELLOW}Step 4: Checking environment variables...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ No .env file found. Creating template...${NC}"
    cat > .env << 'EOF'
# Required
ANTHROPIC_API_KEY=your_api_key_here

# At least one platform
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...

# Optional platforms
DISCORD_BOT_TOKEN=
TELEGRAM_BOT_TOKEN=

# Data directories (optional, these are defaults)
DATA_DIR=./data
LOGS_DIR=./data/logs

# Logging level (optional)
LOG_LEVEL=info
EOF
    echo -e "${GREEN}✓ Created .env template${NC}"
    echo -e "${YELLOW}⚠ Please edit .env and add your API keys!${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"

    # Check if new variables are present
    if ! grep -q "DATA_DIR" .env; then
        echo ""
        echo -e "${YELLOW}Adding new environment variables to .env...${NC}"
        cat >> .env << 'EOF'

# V2.0 additions
DATA_DIR=./data
LOGS_DIR=./data/logs
LOG_LEVEL=info
EOF
        echo -e "${GREEN}✓ New variables added${NC}"
    fi
fi
echo ""

echo -e "${YELLOW}Step 5: Testing database initialization...${NC}"
# Try to initialize database
node -e "
const { database } = require('./dist/persistence/database');
(async () => {
  try {
    await database.init();
    console.log('✓ Database initialized successfully');
    await database.close();
  } catch (err) {
    console.error('✗ Database initialization failed:', err.message);
    process.exit(1);
  }
})();
" 2>&1
echo ""

echo "================================================"
echo -e "${GREEN}Migration Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your API keys (if not done yet)"
echo "2. Test locally: npm run dev"
echo "3. Verify features:"
echo "   - Send a message and restart to test persistence"
echo "   - Check workspace/memory/ for daily logs"
echo "   - Check data/logs/ for structured logs"
echo "4. Deploy to Render:"
echo "   - Ensure you're on Starter plan or higher"
echo "   - Push to GitHub"
echo "   - Set environment variables in Render dashboard"
echo "   - Deploy will auto-configure from render.yaml"
echo ""
echo "Documentation:"
echo "- SETUP.md - Complete setup guide"
echo "- CHANGELOG.md - What's new in v2.0"
echo "- IMPLEMENTATION_SUMMARY.md - Technical details"
echo ""
echo -e "${GREEN}Happy coding! 🗡️${NC}"
