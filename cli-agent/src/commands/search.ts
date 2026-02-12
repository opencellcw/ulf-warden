import chalk from 'chalk';

export function searchCommand(query: string) {
  console.log(chalk.yellow('\n🚧 Web search coming soon!\n'));
  console.log(chalk.dim(`Query: ${query}`));
  console.log(chalk.dim('\nWill integrate Brave Search API'));
  console.log('');
}
