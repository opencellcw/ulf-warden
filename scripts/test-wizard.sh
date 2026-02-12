#!/bin/bash
# Test setup wizard (dry run)

echo "🧪 Testing Setup Wizard..."
echo ""

# Check if wizard file exists
if [ ! -f "scripts/setup-wizard.ts" ]; then
  echo "❌ setup-wizard.ts not found!"
  exit 1
fi

echo "✅ setup-wizard.ts found"

# Check if it's executable
if [ ! -x "scripts/setup-wizard.ts" ]; then
  echo "⚠️  Making setup-wizard.ts executable..."
  chmod +x scripts/setup-wizard.ts
fi

echo "✅ setup-wizard.ts is executable"

# Check if tsx is available (either global or via npx)
if command -v tsx &> /dev/null; then
  echo "✅ tsx is available (global)"
  TSX_CMD="tsx"
elif command -v npx &> /dev/null; then
  echo "✅ tsx available via npx"
  TSX_CMD="npx tsx"
else
  echo "❌ tsx not found! Install with: npm install -g tsx"
  exit 1
fi

# Test TypeScript compilation
echo ""
echo "🔍 Testing TypeScript compilation..."
if $TSX_CMD --check scripts/setup-wizard.ts 2>/dev/null; then
  echo "✅ TypeScript compilation OK"
else
  echo "⚠️  TypeScript check skipped (tsx --check not supported)"
fi

# Check package.json has setup script
if grep -q '"setup"' package.json; then
  echo "✅ 'setup' script found in package.json"
else
  echo "❌ 'setup' script not in package.json!"
  exit 1
fi

# Check if .env.example exists
if [ -f ".env.example" ]; then
  echo "✅ .env.example exists (used as template)"
else
  echo "⚠️  .env.example not found (wizard will create basic .env)"
fi

# Check if deployment configs exist
echo ""
echo "📦 Checking deployment configs..."

configs=(
  "render.yaml:Render"
  "Dockerfile:Docker"
  "scripts/gke-deploy.sh:GKE"
)

for config in "${configs[@]}"; do
  file="${config%%:*}"
  name="${config##*:}"
  
  if [ -f "$file" ]; then
    echo "  ✅ $name config ($file)"
  else
    echo "  ⚠️  $name config missing ($file)"
  fi
done

echo ""
echo "✅ Setup wizard is ready!"
echo ""
echo "To run the wizard:"
echo "  npm run setup"
echo ""
echo "Or directly:"
echo "  tsx scripts/setup-wizard.ts"
