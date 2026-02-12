#!/bin/bash

# Setup Temporal Local (Docker)
# 
# Starts Temporal server locally for development.
# 
# Usage:
#   ./scripts/setup-temporal-local.sh
# 
# Access UI: http://localhost:8233

set -e

echo "🚀 Setting up Temporal local server..."
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found"
  echo "   Install: https://docs.docker.com/get-docker/"
  exit 1
fi

echo "✅ Docker found"
echo ""

# Check if already running
if docker ps | grep -q temporal-dev-server; then
  echo "⚠️  Temporal server already running"
  echo ""
  echo "Options:"
  echo "1. Stop: docker stop temporal-dev-server"
  echo "2. Restart: docker restart temporal-dev-server"
  echo "3. Access UI: http://localhost:8233"
  echo ""
  exit 0
fi

# Pull image
echo "📦 Pulling Temporal image..."
docker pull temporalio/auto-setup:latest
echo ""

# Start server
echo "🚀 Starting Temporal server..."
docker run -d \
  --name temporal-dev-server \
  -p 7233:7233 \
  -p 8233:8233 \
  -e DYNAMIC_CONFIG_FILE_PATH=config/dynamicconfig/development-sql.yaml \
  temporalio/auto-setup:latest

echo ""

# Wait for server
echo "⏳ Waiting for server to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:8233 > /dev/null 2>&1; then
    echo "✅ Server ready!"
    echo ""
    break
  fi
  
  if [ $i -eq 30 ]; then
    echo "❌ Timeout waiting for server"
    echo "   Check logs: docker logs temporal-dev-server"
    exit 1
  fi
  
  sleep 1
done

# Success
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TEMPORAL LOCAL SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Web UI:    http://localhost:8233"
echo "🔌 gRPC:      localhost:7233"
echo "📜 Logs:      docker logs -f temporal-dev-server"
echo "🛑 Stop:      docker stop temporal-dev-server"
echo "🔄 Restart:   docker restart temporal-dev-server"
echo ""
echo "Next steps:"
echo "1. Add to .env:"
echo "   TEMPORAL_ENABLED=true"
echo "   TEMPORAL_ADDRESS=localhost:7233"
echo "   TEMPORAL_NAMESPACE=default"
echo ""
echo "2. Start worker:"
echo "   npx tsx src/workflows/worker.ts"
echo ""
echo "3. Test workflow:"
echo "   npx tsx scripts/test-temporal-workflow.ts"
echo ""

# Open browser
if command -v open &> /dev/null; then
  echo "🌐 Opening Web UI..."
  sleep 2
  open http://localhost:8233
elif command -v xdg-open &> /dev/null; then
  echo "🌐 Opening Web UI..."
  sleep 2
  xdg-open http://localhost:8233
fi

echo ""
