import chalk from 'chalk';
import { createInterface } from 'readline';
import ora from 'ora';
import { Config } from '../core/config';
import { ProviderManager } from '../core/provider-manager';
import { Memory } from '../core/memory';

interface ChatOptions {
  provider?: string;
  model?: string;
}

export async function chatCommand(options: ChatOptions) {
  const config = new Config();
  const providerManager = new ProviderManager(config);
  const memory = new Memory();
  
  const providerName = options.provider || config.get('provider', 'ollama');
  const modelName = options.model || config.get('model');
  
  // Header
  console.log('');
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.bright.cyan('  🤖 OpenCell Terminal Agent - Interactive Mode'));
  console.log(chalk.cyan('═'.repeat(60)));
  console.log('');
  console.log(chalk.dim(`  Provider: ${chalk.cyan(providerName)}`));
  if (modelName) {
    console.log(chalk.dim(`  Model:    ${chalk.cyan(modelName)}`));
  }
  console.log(chalk.dim(`  Type "exit" to quit, "help" for commands`));
  console.log('');
  console.log(chalk.cyan('─'.repeat(60)));
  console.log('');
  
  // Get provider
  let provider;
  try {
    provider = await providerManager.getProvider(providerName);
  } catch (err: any) {
    console.error(chalk.red(`\n❌ ${err.message}\n`));
    console.log(chalk.yellow('Available providers:'));
    console.log(chalk.dim('  • ollama (free, local)'));
    console.log(chalk.dim('  • claude (unlock: ocell unlock claude)'));
    console.log(chalk.dim('  • moonshot (unlock: ocell unlock moonshot)'));
    console.log('');
    process.exit(1);
  }
  
  // Load conversation history
  const history = memory.getHistory();
  
  // Create readline interface
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('You: ')
  });
  
  rl.prompt();
  
  rl.on('line', async (input: string) => {
    const message = input.trim();
    
    if (!message) {
      rl.prompt();
      return;
    }
    
    // Commands
    if (message === 'exit' || message === 'quit') {
      console.log(chalk.yellow('\n👋 Goodbye!\n'));
      rl.close();
      process.exit(0);
    }
    
    if (message === 'help') {
      showHelp();
      rl.prompt();
      return;
    }
    
    if (message === 'clear' || message === 'reset') {
      memory.clear();
      console.log(chalk.yellow('\n🗑️  Memory cleared!\n'));
      rl.prompt();
      return;
    }
    
    if (message === 'history') {
      showHistory(memory);
      rl.prompt();
      return;
    }
    
    if (message === 'providers') {
      await showProviders(providerManager);
      rl.prompt();
      return;
    }
    
    if (message.startsWith('use ')) {
      const newProvider = message.substring(4).trim();
      try {
        provider = await providerManager.getProvider(newProvider);
        console.log(chalk.green(`\n✅ Switched to ${newProvider}\n`));
      } catch (err: any) {
        console.log(chalk.red(`\n❌ ${err.message}\n`));
      }
      rl.prompt();
      return;
    }
    
    // Send to AI
    const spinner = ora({
      text: chalk.cyan('Agent is thinking...'),
      color: 'cyan'
    }).start();
    
    try {
      // Add user message to history
      memory.addMessage('user', message);
      
      // Get response
      const response = await provider.chat(message, {
        history: memory.getHistory(),
        model: modelName
      });
      
      spinner.stop();
      
      // Add assistant response to history
      memory.addMessage('assistant', response);
      
      // Display response
      console.log('');
      console.log(chalk.cyan('Agent: ') + response);
      console.log('');
      
    } catch (err: any) {
      spinner.fail(chalk.red('Error'));
      console.error(chalk.red(`\n❌ ${err.message}\n`));
    }
    
    rl.prompt();
  });
  
  rl.on('close', () => {
    console.log(chalk.yellow('\n👋 Goodbye!\n'));
    process.exit(0);
  });
}

function showHelp() {
  console.log('');
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.bright('  📚 Commands'));
  console.log(chalk.cyan('═'.repeat(60)));
  console.log('');
  console.log(chalk.cyan('  exit, quit       ') + chalk.dim('Exit chat'));
  console.log(chalk.cyan('  help             ') + chalk.dim('Show this help'));
  console.log(chalk.cyan('  clear, reset     ') + chalk.dim('Clear conversation history'));
  console.log(chalk.cyan('  history          ') + chalk.dim('Show conversation history'));
  console.log(chalk.cyan('  providers        ') + chalk.dim('List available providers'));
  console.log(chalk.cyan('  use <provider>   ') + chalk.dim('Switch provider (ollama, claude, moonshot)'));
  console.log('');
  console.log(chalk.dim('  Just type your question to chat!'));
  console.log('');
}

function showHistory(memory: Memory) {
  const history = memory.getHistory();
  
  if (history.length === 0) {
    console.log(chalk.yellow('\n📭 No conversation history\n'));
    return;
  }
  
  console.log('');
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.bright('  📜 Conversation History'));
  console.log(chalk.cyan('═'.repeat(60)));
  console.log('');
  
  history.forEach((msg, i) => {
    const role = msg.role === 'user' ? chalk.green('You') : chalk.cyan('Agent');
    const preview = msg.content.length > 60 
      ? msg.content.substring(0, 60) + '...'
      : msg.content;
    console.log(`${i + 1}. ${role}: ${chalk.dim(preview)}`);
  });
  
  console.log('');
  console.log(chalk.dim(`Total messages: ${history.length}`));
  console.log('');
}

async function showProviders(pm: ProviderManager) {
  console.log('');
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.bright('  🔓 Available Providers'));
  console.log(chalk.cyan('═'.repeat(60)));
  console.log('');
  
  const providers = await pm.listProviders();
  
  providers.forEach((p) => {
    const icon = p.unlocked ? '✅' : '🔒';
    const status = p.unlocked ? chalk.green('Unlocked') : chalk.dim('Locked');
    
    console.log(`${icon} ${chalk.cyan(p.name)} - ${status}`);
    console.log(chalk.dim(`   ${p.description}`));
    console.log(chalk.dim(`   Cost: ${p.cost}`));
    
    if (!p.unlocked) {
      console.log(chalk.yellow(`   Unlock: ocell unlock ${p.name}`));
    }
    
    console.log('');
  });
}
