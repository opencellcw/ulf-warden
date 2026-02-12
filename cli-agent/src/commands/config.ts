import chalk from 'chalk';
import { Config } from '../core/config';

export function configCommand(action?: string, key?: string, value?: string) {
  const config = new Config();
  
  if (!action || action === 'list') {
    console.log('');
    console.log(chalk.cyan('═'.repeat(50)));
    console.log(chalk.bright('  ⚙️  Configuration'));
    console.log(chalk.cyan('═'.repeat(50)));
    console.log('');
    
    const all = config.getAll();
    Object.entries(all).forEach(([k, v]) => {
      console.log(`${chalk.cyan(k)}: ${chalk.dim(JSON.stringify(v))}`);
    });
    console.log('');
    return;
  }
  
  if (action === 'get' && key) {
    const value = config.get(key);
    console.log(value !== undefined ? value : chalk.dim('(not set)'));
    return;
  }
  
  if (action === 'set' && key && value !== undefined) {
    config.set(key, value);
    console.log(chalk.green(`✅ Set ${key} = ${value}`));
    return;
  }
  
  console.log(chalk.red('Invalid usage. Examples:'));
  console.log(chalk.dim('  ocell config list'));
  console.log(chalk.dim('  ocell config get provider'));
  console.log(chalk.dim('  ocell config set provider ollama'));
}

export { Config };
