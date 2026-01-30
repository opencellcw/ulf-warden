#!/bin/bash

# Setup script for local LLM
# Downloads and configures a lightweight model for CPU inference

set -e

echo "================================================"
echo "Ulfberht-Warden - Local LLM Setup"
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

echo -e "${YELLOW}Step 1: Checking dependencies...${NC}"
if ! node -v > /dev/null 2>&1; then
    echo -e "${RED}Error: Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found${NC}"
echo ""

echo -e "${YELLOW}Step 2: Installing transformers.js...${NC}"
if npm list @xenova/transformers > /dev/null 2>&1; then
    echo -e "${GREEN}✓ @xenova/transformers already installed${NC}"
else
    npm install @xenova/transformers
    echo -e "${GREEN}✓ @xenova/transformers installed${NC}"
fi
echo ""

echo -e "${YELLOW}Step 3: Creating model cache directory...${NC}"
CACHE_DIR="${MODEL_CACHE_DIR:-./.cache/models}"
mkdir -p "$CACHE_DIR"
echo -e "${GREEN}✓ Cache directory created: $CACHE_DIR${NC}"
echo ""

echo -e "${YELLOW}Step 4: Configuring environment...${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found. Please create one first.${NC}"
    exit 1
fi

# Add local LLM configuration if not present
if ! grep -q "LOCAL_LLM_ENABLED" .env; then
    echo "" >> .env
    echo "# Local LLM Configuration" >> .env
    echo "LOCAL_LLM_ENABLED=true" >> .env
    echo "LLM_STRATEGY=hybrid" >> .env
    echo "LOCAL_MODEL_NAME=Xenova/LaMini-Flan-T5-783M" >> .env
    echo "MODEL_CACHE_DIR=$CACHE_DIR" >> .env
    echo -e "${GREEN}✓ Added local LLM configuration to .env${NC}"
else
    echo -e "${GREEN}✓ Local LLM configuration already exists${NC}"
fi
echo ""

echo -e "${YELLOW}Step 5: Testing model download...${NC}"
echo "This will download the model on first run (~1.5GB for default model)"
echo "The model will be cached for future use."
echo ""

cat > test-local-llm.js << 'EOF'
const { getLocalProvider } = require('./dist/llm');

(async () => {
  try {
    console.log('Initializing local LLM provider...');
    const provider = getLocalProvider();

    const available = await provider.isAvailable();
    if (!available) {
      console.error('❌ Local LLM not available. Check environment variables.');
      process.exit(1);
    }

    console.log('✓ Local LLM provider initialized');
    console.log('\nModel info:', provider.getModelInfo());

    console.log('\nTesting generation...');
    const response = await provider.generate([
      { role: 'user', content: 'Say hello in one sentence.' }
    ], { maxTokens: 50 });

    console.log('✓ Generation successful!');
    console.log('Response:', response.content);
    console.log('Processing time:', response.processingTime + 'ms');

    await provider.unload();
    console.log('\n✓ Model unloaded');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})();
EOF

# Build first if needed
if [ ! -d "dist" ]; then
    echo "Building TypeScript..."
    npm run build
fi

# Run test
node test-local-llm.js

# Cleanup
rm test-local-llm.js

echo ""
echo "================================================"
echo -e "${GREEN}Local LLM Setup Complete!${NC}"
echo "================================================"
echo ""
echo "Configuration:"
echo "- Strategy: hybrid (simple tasks use local, complex use Claude)"
echo "- Model: LaMini-Flan-T5-783M (~1.5GB)"
echo "- Cache: $CACHE_DIR"
echo ""
echo "To change settings, edit .env:"
echo "  LLM_STRATEGY=claude_only     # Always use Claude"
echo "  LLM_STRATEGY=local_only      # Always use local"
echo "  LLM_STRATEGY=hybrid          # Smart routing (recommended)"
echo "  LLM_STRATEGY=local_fallback  # Try local first"
echo ""
echo "Available models (change LOCAL_MODEL_NAME):"
echo "  Xenova/LaMini-Flan-T5-783M          # Smallest, fastest (~1.5GB)"
echo "  Xenova/TinyLlama-1.1B-Chat-v1.0     # Better quality (~2GB)"
echo "  Xenova/Phi-2                        # Best quality (~5GB)"
echo ""
echo -e "${GREEN}Ready to use! Start the bot with: npm start${NC}"
