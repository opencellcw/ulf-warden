import chalk from 'chalk';
import { Config } from '../core/config';
import { ProviderManager } from '../core/provider-manager';

export async function providersCommand() {
  const config = new Config();
  const pm = new ProviderManager(config);
  
  console.log('');
  console.log(chalk.cyan('═'.repeat(70)));
  console.log(chalk.bright.cyan('  🔓 Available Providers'));
  console.log(chalk.cyan('═'.repeat(70)));
  console.log('');
  
  const providers = await pm.listProviders();
  
  providers.forEach((p, i) => {
    const icon = p.unlocked ? '✅' : '🔒';
    const status = p.unlocked ? chalk.green('Unlocked') : chalk.dim('Locked');
    const border = i < providers.length - 1 ? chalk.dim('─'.repeat(70)) : '';
    
    console.log(`${icon} ${chalk.bright.cyan(p.name.toUpperCase())} - ${status}`);
    console.log(chalk.dim(`   ${p.description}`));
    console.log(chalk.dim(`   Cost: ${p.cost}`));
    
    if (!p.unlocked && p.requiresKey) {
      console.log(chalk.yellow(`   Unlock: ${chalk.cyan(`ocell unlock ${p.name}`)}`));
    } else if (p.unlocked) {
      console.log(chalk.green(`   Use: ${chalk.cyan(`ocell --provider ${p.name} "question"`)}`));
    }
    
    if (border) {
      console.log('');
      console.log(border);
    }
    console.log('');
  });
  
  console.log(chalk.dim('💡 Tip: Start with Ollama (free!), add others as needed'));
  console.log('');
}
