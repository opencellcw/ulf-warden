import chalk from 'chalk';
import { Memory } from '../core/memory';

export function forgetCommand() {
  const memory = new Memory();
  memory.clear();
  
  console.log(chalk.green('\n✅ Conversation memory cleared!\n'));
}
