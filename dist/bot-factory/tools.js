"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_FACTORY_TOOLS = void 0;
exports.BOT_FACTORY_TOOLS = [
    {
        name: 'create_bot',
        description: `Create and deploy a new AI bot to the Kubernetes cluster (admin only).

The bot will be deployed as a separate pod in the same GKE cluster, with its own Discord presence.

Examples:
- Create security bot: name="guardian", personality="You are a strict security monitor..."
- Create data analyst: name="oracle", personality="You help analyze data and provide insights..."

IMPORTANT: Only admins can create bots. The bot will deploy in ~30 seconds.`,
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
