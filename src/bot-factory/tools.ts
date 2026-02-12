import Anthropic from '@anthropic-ai/sdk';

export const BOT_FACTORY_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_bot',
    description: `Create and deploy a new AI bot to the Kubernetes cluster (admin only).

The bot will be deployed as a separate pod in the same GKE cluster, with its own Discord presence.

BOT TYPES:
- "conversational": Simple chat bot using Claude API (fast, cheap, safe)
- "agent": Coding agent with tools like bash, read, write, edit (powerful but needs careful permissions)

Examples:
- Conversational bot: name="support", type="conversational", personality="You are a helpful customer support agent"
- DevOps agent: name="devops", type="agent", allowed_tools=["bash", "kubectl", "read"], personality="You are a Kubernetes expert"
- Security agent: name="guardian", type="agent", allowed_tools=["read", "bash"], personality="You monitor security issues"

IMPORTANT: 
- Only admins can create bots
- Agent bots require allowed_tools to be specified
- Bot will deploy in ~30 seconds`,
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Bot name (3-15 chars, lowercase alphanumeric and hyphens only)'
        },
        personality: {
          type: 'string',
          description: 'Bot personality/behavior description (the system prompt for the bot)'
        },
        type: {
          type: 'string',
          enum: ['conversational', 'agent'],
          description: 'Bot type: "conversational" (chat only) or "agent" (with tools). Default: conversational'
        },
        allowed_tools: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['bash', 'read', 'write', 'edit', 'kubectl', 'gcloud', 'git']
          },
          description: 'Tools the agent bot can use. Required if type="agent". Available: bash, read, write, edit, kubectl, gcloud, git'
        },
        model: {
          type: 'string',
          enum: ['sonnet', 'opus', 'haiku'],
          description: 'Claude model to use (default: sonnet)'
        },
        enable_discord: {
          type: 'boolean',
          description: 'Enable Discord integration (default: true)'
        },
        enable_slack: {
          type: 'boolean',
          description: 'Enable Slack integration (default: false)'
        }
      },
      required: ['name', 'personality']
    }
  },
  {
    name: 'list_bots',
    description: `List all deployed bots in the cluster.

Shows bot name, status, creator, and creation date.`,
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'delete_bot',
    description: `Delete a bot from the cluster (admin only).

This will:
- Remove the bot from Kubernetes
- Delete the Helm release
- Remove from the bot registry

IMPORTANT: This action cannot be undone.`,
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Bot name to delete'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'get_bot_status',
    description: `Check if a bot is running and healthy.

Returns deployment status, pod name, and health check information.`,
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Bot name to check'
        }
      },
      required: ['name']
    }
  }
];
