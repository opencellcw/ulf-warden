#!/bin/bash

# Deploy Image Gen Agent to Cloud Run

PROJECT_ID="opencellcw-k8s"
REGION="us-central1"
SERVICE_NAME="image-gen-agent"

echo "🚀 Deploying ${SERVICE_NAME} to Cloud Run..."

gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 120s \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "REPLICATE_API_TOKEN=replicate-api-token:latest"

echo ""
echo "✅ Deploy complete!"
echo ""
echo "Get service URL:"
echo "gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)'"
