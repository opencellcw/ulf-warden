import chalk from 'chalk';
import ora from 'ora';
import { Config } from '../core/config';
import { ProviderManager } from '../core/provider-manager';

interface QuickOptions {
  provider?: string;
  json?: boolean;
  simple?: boolean;
}

export async function quickCommand(question: string, options: QuickOptions) {
  const config = new Config();
  const pm = new ProviderManager(config);
  
  const providerName = options.provider || config.get('provider', 'ollama');
  
  // Get provider
  let provider;
  try {
    provider = await pm.getProvider(providerName);
  } catch (err: any) {
    console.error(chalk.red(`\n❌ ${err.message}\n`));
    process.exit(1);
  }
  
  // Show spinner (unless simple/json mode)
  const spinner = !options.simple && !options.json 
    ? ora({
        text: chalk.cyan('Thinking...'),
        color: 'cyan'
      }).start()
    : null;
  
  try {
    const response = await provider.chat(question);
    
    if (spinner) spinner.stop();
    
    // Output format
    if (options.json) {
      console.log(JSON.stringify({
        question,
        answer: response,
        provider: providerName
      }, null, 2));
    } else if (options.simple) {
      console.log(response);
    } else {
      console.log('');
      console.log(chalk.cyan('Answer:'));
      console.log(response);
      console.log('');
    }
    
  } catch (err: any) {
    if (spinner) spinner.fail(chalk.red('Error'));
    console.error(chalk.red(`\n❌ ${err.message}\n`));
    process.exit(1);
  }
}
