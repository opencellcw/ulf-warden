import { BotConfig } from './types';

const REGION = process.env.GCP_REGION || 'us-central1';
const PROJECT_ID = process.env.GCP_PROJECT_ID;

export function generateHelmValues(config: BotConfig): string {
  if (!PROJECT_ID) {
    throw new Error('GCP_PROJECT_ID environment variable is required');
  }

  // Generate Helm values.yaml
  const values = `
# Auto-generated Helm values for bot: ${config.name}
# Generated at: ${new Date().toISOString()}

agent:
  name: "${config.name}"
  role: "specialist"
  model: "${config.model}"
  replicaCount: ${config.replicas}

config:
  soul: |
    # ${config.name} - AI Agent
    ${config.personality.split('\n').map(line => `    ${line}`).join('\n')}

image:
  repository: ${REGION}-docker.pkg.dev/${PROJECT_ID}/ulf-images/ulf-warden
  tag: "latest"
  pullPolicy: Always

secretManager:
  enabled: true
  projectID: "${PROJECT_ID}"
  secrets:
    - name: ANTHROPIC_API_KEY
      key: ANTHROPIC_API_KEY
    - name: DISCORD_BOT_TOKEN
      key: DISCORD_BOT_TOKEN
    - name: SLACK_BOT_TOKEN
      key: SLACK_BOT_TOKEN
    - name: SLACK_APP_TOKEN
      key: SLACK_APP_TOKEN

channel:
  enabled: true
  type: "${config.enableDiscord ? 'discord' : (config.enableSlack ? 'slack' : 'discord')}"
  discord:
    enabled: ${config.enableDiscord || false}
  slack:
    enabled: ${config.enableSlack || false}
  telegram:
    enabled: ${config.enableTelegram || false}

resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"

nodeSelector: {}
tolerations: []
affinity: {}
`;

  return values.trim();
}

export function validateBotName(name: string): { valid: boolean; reason?: string } {
  // Kubernetes naming constraints
  if (!/^[a-z0-9-]{3,15}$/.test(name)) {
    return {
      valid: false,
      reason: 'Bot name must be 3-15 characters, lowercase alphanumeric and hyphens only'
    };
  }

  // Reserved names
  const reserved = ['ulf', 'warden', 'system', 'admin', 'root', 'default', 'kube'];
  if (reserved.includes(name.toLowerCase())) {
    return {
      valid: false,
      reason: `Bot name "${name}" is reserved`
    };
  }

  return { valid: true };
}

export function generateBotId(name: string): string {
  // Generate Kubernetes-compatible resource name
  return `bot-${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
}
