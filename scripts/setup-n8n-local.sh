#!/bin/bash

###############################################################################
# n8n Local Setup Script
# 
# Sets up n8n in Docker for local development
# Usage: ./scripts/setup-n8n-local.sh
###############################################################################

set -e

echo "🚀 Setting up n8n locally..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

# Stop existing n8n container if running
if docker ps -a | grep -q n8n-opencell; then
  echo "⏹️  Stopping existing n8n container..."
  docker stop n8n-opencell || true
  docker rm n8n-opencell || true
fi

# Create data directory
N8N_DATA_DIR="${HOME}/.n8n-opencell"
mkdir -p "$N8N_DATA_DIR"

echo "📂 Data directory: $N8N_DATA_DIR"

# Get OpenCell API URL
OPENCELL_API_URL="${OPENCELL_API_URL:-http://host.docker.internal:3000}"

echo "🔗 OpenCell API: $OPENCELL_API_URL"

# Start n8n container
echo "🐳 Starting n8n container..."
docker run -d \
  --name n8n-opencell \
  -p 5678:5678 \
  -e N8N_HOST="localhost" \
  -e N8N_PORT=5678 \
  -e N8N_PROTOCOL="http" \
  -e WEBHOOK_URL="http://localhost:5678/" \
  -e GENERIC_TIMEZONE="America/Sao_Paulo" \
  -e N8N_EDITOR_BASE_URL="http://localhost:5678/" \
  -e N8N_BASIC_AUTH_ACTIVE="false" \
  -v "$N8N_DATA_DIR:/home/node/.n8n" \
  --add-host=host.docker.internal:host-gateway \
  n8nio/n8n:latest

# Wait for n8n to start
echo "⏳ Waiting for n8n to start..."
sleep 5

# Check if n8n is running
if docker ps | grep -q n8n-opencell; then
  echo ""
  echo "✅ n8n is running!"
  echo ""
  echo "📊 Access n8n at: http://localhost:5678"
  echo ""
  echo "🔧 Next steps:"
  echo "  1. Open http://localhost:5678 in your browser"
  echo "  2. Create your first workflow"
  echo "  3. Import example workflows from: docs/n8n-workflows/"
  echo ""
  echo "📝 Useful commands:"
  echo "  View logs:    docker logs -f n8n-opencell"
  echo "  Stop:         docker stop n8n-opencell"
  echo "  Start:        docker start n8n-opencell"
  echo "  Remove:       docker rm -f n8n-opencell"
  echo ""
else
  echo "❌ Failed to start n8n. Check logs with: docker logs n8n-opencell"
  exit 1
fi
