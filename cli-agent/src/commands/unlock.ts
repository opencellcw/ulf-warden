import chalk from 'chalk';
import { Config } from '../core/config';
import { ProviderManager } from '../core/provider-manager';
import ora from 'ora';
import { createInterface } from 'readline';

export async function unlockCommand(provider: string) {
  const config = new Config();
  const pm = new ProviderManager(config);
  
  console.log('');
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.bright.cyan(`  🔓 Unlock ${provider.toUpperCase()}`));
  console.log(chalk.cyan('═'.repeat(60)));
  console.log('');
  
  // Check if already unlocked
  const isUnlocked = await pm.isUnlocked(provider);
  if (isUnlocked) {
    console.log(chalk.yellow(`⚠️  ${provider} is already unlocked!`));
    console.log('');
    
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>((resolve) => {
      rl.question(chalk.green('Replace API key? (y/N): '), (answer) => {
        rl.close();
        resolve(answer);
      });
    });
    
    if (answer.toLowerCase() !== 'y') {
      console.log(chalk.dim('Keeping existing key.\n'));
      return;
    }
  }
  
  // Show info
  const info = getProviderInfo(provider);
  if (info) {
    console.log(chalk.dim(`  ${info.description}`));
    console.log(chalk.dim(`  Cost: ${info.cost}`));
    console.log(chalk.dim(`  Get key: ${info.url}`));
    console.log('');
  }
  
  // Ask for API key
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const apiKey = await new Promise<string>((resolve) => {
    rl.question(chalk.green('Enter API key: '), (key) => {
      rl.close();
      resolve(key.trim());
    });
  });
  
  if (!apiKey) {
    console.log(chalk.red('\n❌ No API key provided\n'));
    return;
  }
  
  // Validate key
  const spinner = ora('Validating API key...').start();
  
  try {
    // Try to use the provider
    const testProvider = await pm.getProvider(provider);
    await pm.setApiKey(provider, apiKey);
    
    // Quick test
    await testProvider.chat('Hi', { model: undefined });
    
    spinner.succeed(chalk.green('API key validated and saved!'));
    
    console.log('');
    console.log(chalk.green(`✅ ${provider} unlocked successfully!`));
    console.log('');
    console.log(chalk.dim(`Use it with: ocell --provider ${provider} "your question"`));
    console.log('');
    
  } catch (err: any) {
    spinner.fail(chalk.red('Validation failed'));
    console.error(chalk.red(`\n❌ ${err.message}\n`));
    console.log(chalk.yellow('API key not saved. Please check and try again.\n'));
  }
}

function getProviderInfo(provider: string) {
  const info: Record<string, any> = {
    claude: {
      description: 'Anthropic Claude - Best quality, complex reasoning',
      cost: '$15/Mtok (~$60/month for 100 chats/day)',
      url: 'https://console.anthropic.com/'
    },
    moonshot: {
      description: 'Moonshot Kimi - Cheapest option, Chinese AI',
      cost: '$0.50/Mtok (~$3/month for 100 chats/day)',
      url: 'https://platform.moonshot.cn/'
    },
    openai: {
      description: 'OpenAI GPT-4 - High quality, variety',
      cost: '$10/Mtok (~$30/month for 100 chats/day)',
      url: 'https://platform.openai.com/api-keys'
    },
    gemini: {
      description: 'Google Gemini - Fast, Google ecosystem',
      cost: '$1.25/Mtok (~$12/month for 100 chats/day)',
      url: 'https://ai.google.dev/'
    }
  };
  
  return info[provider.toLowerCase()];
}
