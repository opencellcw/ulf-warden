#!/usr/bin/env node
/**
 * 🤖 OpenCell Terminal Agent
 * Your personal AI assistant - cross-platform, starts free!
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { chatCommand } from './commands/chat';
import { unlockCommand } from './commands/unlock';
import { providersCommand } from './commands/providers';
import { configCommand } from './commands/config';
import { searchCommand } from './commands/search';
import { learnCommand } from './commands/learn';
import { quickCommand } from './commands/quick';
import { version } from '../package.json';

const program = new Command();

// Header
console.log(chalk.cyan(`
╔═══════════════════════════════════════╗
║   🤖 OpenCell Terminal Agent          ║
║   Your Personal AI Assistant          ║
╚═══════════════════════════════════════╝
`));

program
  .name('ocell')
  .description('AI assistant in your terminal - starts free with Ollama!')
  .version(version);

// Init command
program
  .command('init')
  .description('Initialize OpenCell agent (sets up Ollama)')
  .action(initCommand);

// Chat command (interactive)
program
  .command('chat')
  .alias('c')
  .description('Start interactive chat session')
  .option('-p, --provider <provider>', 'AI provider (ollama, claude, moonshot)', 'ollama')
  .option('-m, --model <model>', 'Model name')
  .action(chatCommand);

// Quick command (one-shot)
program
  .command('ask <question...>')
  .alias('q')
  .description('Quick one-shot question')
  .option('-p, --provider <provider>', 'AI provider', 'ollama')
  .option('--json', 'Output as JSON')
  .option('--simple', 'Simple text output (no formatting)')
  .action((question, options) => quickCommand(question.join(' '), options));

// Unlock provider
program
  .command('unlock <provider>')
  .description('Unlock a paid AI provider (claude, moonshot, openai, gemini)')
  .action(unlockCommand);

// List providers
program
  .command('providers')
  .alias('p')
  .description('List available and unlocked providers')
  .action(providersCommand);

// Configuration
program
  .command('config')
  .description('Manage configuration')
  .argument('[action]', 'Action: list, set, get')
  .argument('[key]', 'Config key')
  .argument('[value]', 'Config value')
  .action(configCommand);

// Web search
program
  .command('search <query...>')
  .alias('s')
  .description('Search the web')
  .action((query) => searchCommand(query.join(' ')));

// Project learning
program
  .command('learn')
  .description('Learn about current project/directory')
  .action(learnCommand);

// Forget memory
program
  .command('forget')
  .description('Clear conversation memory')
  .action(async () => {
    const { forgetCommand } = await import('./commands/forget');
    forgetCommand();
  });

// Default command (quick question if no command specified)
program
  .arguments('[question...]')
  .action(async (question) => {
    if (question && question.length > 0) {
      await quickCommand(question.join(' '), { provider: 'ollama' });
    } else {
      // No args = interactive chat
      await chatCommand({ provider: 'ollama' });
    }
  });

// Error handling
program.on('command:*', () => {
  console.error(chalk.red(`\n❌ Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.yellow('Run "ocell --help" for available commands\n'));
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
  console.log(chalk.dim('\n💡 Quick start:'));
  console.log(chalk.cyan('  ocell init          ') + chalk.dim('Initialize agent'));
  console.log(chalk.cyan('  ocell chat          ') + chalk.dim('Start chatting'));
  console.log(chalk.cyan('  ocell "question"    ') + chalk.dim('Quick question'));
  console.log('');
}
