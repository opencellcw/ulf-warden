/**
 * Bot Creation Workflow
 *
 * Automated workflow for creating and configuring a new Discord bot:
 * 1. Validate configuration → Check required fields
 * 2. Create bot on Discord → Register with Discord API
 * 3. Configure permissions → Set up roles and channels
 * 4. Deploy bot instance → Start bot server
 * 5. Test bot → Send test message
 * 6. Enable monitoring → Set up health checks
 *
 * Usage:
 *   import { botCreationWorkflow } from './examples/workflows/bot-creation';
 *   await workflowManager.execute(botCreationWorkflow, { userId, userRequest });
 */

import { WorkflowDefinition } from '../../src/core/workflow-manager';

export const botCreationWorkflow: WorkflowDefinition = {
  name: 'create_discord_bot',
  description: 'Automated Discord bot creation and configuration',
  maxDuration: 300000, // 5 minutes

  steps: [
    // Step 1: Validate bot configuration
    {
      id: 'validate_config',
      toolName: 'read_file',
      input: {
        path: './config/new-bot-config.json'
      },
      onError: 'fail'
    },

    // Step 2: Parse and validate JSON
    {
      id: 'check_required_fields',
      toolName: 'execute_shell',
      input: (ctx) => ({
        command: `echo '${JSON.stringify(ctx.results.get('validate_config'))}' | jq -e '.name,.token,.guildId'`,
        workingDir: '.'
      }),
      dependsOn: ['validate_config'],
      onError: 'fail'
    },

    // Step 3: Create bot directory structure
    {
      id: 'create_bot_directory',
      toolName: 'execute_shell',
      input: (ctx) => {
        const config = JSON.parse(ctx.results.get('validate_config'));
        return {
          command: `mkdir -p bots/${config.name}/{config,logs,data}`,
          workingDir: '.'
        };
      },
      dependsOn: ['check_required_fields'],
      onError: 'fail'
    },

    // Step 4: Generate bot configuration file
    {
      id: 'generate_config',
      toolName: 'write_file',
      input: (ctx) => {
        const sourceConfig = JSON.parse(ctx.results.get('validate_config'));
        const botConfig = {
          name: sourceConfig.name,
          token: sourceConfig.token,
          guildId: sourceConfig.guildId,
          prefix: sourceConfig.prefix || '!',
          features: sourceConfig.features || ['commands', 'events'],
          createdAt: new Date().toISOString()
        };

        return {
          path: `./bots/${sourceConfig.name}/config/bot.json`,
          content: JSON.stringify(botConfig, null, 2)
        };
      },
      dependsOn: ['create_bot_directory'],
      onError: 'fail'
    },

    // Step 5: Register bot with Discord API (simulated with web fetch)
    {
      id: 'register_bot',
      toolName: 'web_fetch',
      input: (ctx) => {
        const config = JSON.parse(ctx.results.get('validate_config'));
        return {
          url: `https://discord.com/api/v10/applications/${config.appId}/guilds/${config.guildId}/commands`,
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${config.token}`,
            'Content-Type': 'application/json'
          },
          body: []
        };
      },
      dependsOn: ['generate_config'],
      onError: 'retry',
      retryConfig: {
        maxAttempts: 3,
        delayMs: 2000
      }
    },

    // Step 6: Deploy bot instance (start bot process)
    {
      id: 'deploy_bot',
      toolName: 'execute_shell',
      input: (ctx) => {
        const config = JSON.parse(ctx.results.get('validate_config'));
        return {
          command: `cd bots/${config.name} && npm start &`,
          workingDir: '.'
        };
      },
      dependsOn: ['register_bot'],
      onError: 'fail',
      condition: (ctx) => {
        // Only deploy if in production mode
        return process.env.NODE_ENV === 'production';
      }
    },

    // Step 7: Wait for bot to start
    {
      id: 'wait_for_startup',
      toolName: 'execute_shell',
      input: {
        command: 'sleep 5',
        workingDir: '.'
      },
      dependsOn: ['deploy_bot'],
      onError: 'continue'
    },

    // Step 8: Test bot connection (parallel checks)
    {
      id: 'test_bot_connection',
      toolName: 'web_fetch',
      input: (ctx) => {
        const config = JSON.parse(ctx.results.get('validate_config'));
        return {
          url: `https://discord.com/api/v10/users/@me`,
          method: 'GET',
          headers: {
            'Authorization': `Bot ${config.token}`
          }
        };
      },
      dependsOn: ['wait_for_startup'],
      onError: 'fail',
      parallel: true
    },

    // Step 9: Enable monitoring and health checks
    {
      id: 'setup_monitoring',
      toolName: 'write_file',
      input: (ctx) => {
        const config = JSON.parse(ctx.results.get('validate_config'));
        const monitoringConfig = {
          botName: config.name,
          healthCheckUrl: `http://localhost:3000/health/${config.name}`,
          interval: 60000, // 1 minute
          alertChannelId: config.alertChannelId || null
        };

        return {
          path: `./bots/${config.name}/config/monitoring.json`,
          content: JSON.stringify(monitoringConfig, null, 2)
        };
      },
      dependsOn: ['wait_for_startup'],
      onError: 'continue',
      parallel: true
    },

    // Step 10: Log creation success
    {
      id: 'log_success',
      toolName: 'write_file',
      input: (ctx) => {
        const config = JSON.parse(ctx.results.get('validate_config'));
        const logEntry = {
          timestamp: new Date().toISOString(),
          event: 'bot_created',
          botName: config.name,
          guildId: config.guildId,
          status: 'success'
        };

        return {
          path: `./bots/${config.name}/logs/creation.log`,
          content: JSON.stringify(logEntry, null, 2)
        };
      },
      dependsOn: ['test_bot_connection', 'setup_monitoring'],
      onError: 'continue'
    }
  ]
};

/**
 * Usage Example:
 *
 * import { workflowManager } from './src/core/workflow-manager';
 * import { botCreationWorkflow } from './examples/workflows/bot-creation';
 *
 * // First, create config file
 * const config = {
 *   name: 'my-awesome-bot',
 *   token: 'MTI...xyz',
 *   appId: '123456789',
 *   guildId: '987654321',
 *   prefix: '!',
 *   features: ['commands', 'events', 'moderation'],
 *   alertChannelId: '111222333'
 * };
 *
 * await fs.writeFile('./config/new-bot-config.json', JSON.stringify(config));
 *
 * // Run bot creation workflow
 * const result = await workflowManager.execute(botCreationWorkflow, {
 *   userId: 'admin-user',
 *   userRequest: 'Create new Discord bot: my-awesome-bot'
 * });
 *
 * console.log('Bot created:', result.log_success);
 */

/**
 * Workflow Visualization:
 *
 * [validate] --> [check_fields] --> [create_dir] --> [generate_config] --> [register] --> [deploy] --> [wait]
 *                                                                                                          |
 *                                                                          [test_connection] <-------------+
 *                                                                          [setup_monitoring] <------------+
 *                                                                                   |
 *                                                                          [log_success] <-----------------+
 *
 * Expected Duration: 30-60 seconds
 * Parallel Steps: test_connection and setup_monitoring run in parallel
 */

/**
 * Configuration File Format (new-bot-config.json):
 * {
 *   "name": "bot-name",
 *   "token": "MTI...xyz",
 *   "appId": "1234567890",
 *   "guildId": "0987654321",
 *   "prefix": "!",
 *   "features": ["commands", "events"],
 *   "alertChannelId": "1112223334"
 * }
 */
