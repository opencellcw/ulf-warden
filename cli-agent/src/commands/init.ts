import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { Config } from '../core/config';
import { OllamaProvider } from '../providers/ollama';

export async function initCommand() {
  console.log(chalk.cyan('\n🚀 Initializing OpenCell Agent...\n'));
  
  const spinner = ora('Checking for Ollama...').start();
  
  try {
    // Check if Ollama is installed
    let ollamaInstalled = false;
    try {
      execSync('ollama --version', { stdio: 'pipe' });
      ollamaInstalled = true;
      spinner.succeed(chalk.green('Ollama is installed!'));
    } catch (err) {
      spinner.fail(chalk.yellow('Ollama not found'));
    }
    
    // Install instructions if needed
    if (!ollamaInstalled) {
      console.log(chalk.yellow('\n📦 Ollama is not installed. Install it first:\n'));
      console.log(chalk.cyan('  Mac:     ') + 'brew install ollama');
      console.log(chalk.cyan('  Linux:   ') + 'curl -fsSL https://ollama.com/install.sh | sh');
      console.log(chalk.cyan('  Windows: ') + 'Download from https://ollama.com\n');
      
      console.log(chalk.dim('After installing, run: ') + chalk.cyan('ollama serve\n'));
      
      const answer = await askQuestion('Continue anyway? (y/N): ');
      if (answer.toLowerCase() !== 'y') {
        process.exit(0);
      }
    }
    
    // Initialize config
    spinner.start('Creating config directory...');
    const config = new Config();
    await config.init();
    spinner.succeed('Config directory created');
    
    // Try to connect to Ollama
    if (ollamaInstalled) {
      spinner.start('Connecting to Ollama...');
      
      try {
        const ollama = new OllamaProvider();
        const models = await ollama.listModels();
        
        if (models.length === 0) {
          spinner.info('No models found. Downloading llama3...');
          
          console.log(chalk.dim('\nThis will download ~4GB. Continue? (Y/n): '));
          const downloadAnswer = await askQuestion('');
          
          if (!downloadAnswer || downloadAnswer.toLowerCase() !== 'n') {
            console.log(chalk.cyan('\n📥 Downloading llama3 (this may take a few minutes)...\n'));
            
            try {
              execSync('ollama pull llama3', { stdio: 'inherit' });
              spinner.succeed('Model llama3 downloaded!');
            } catch (err) {
              spinner.fail('Failed to download model');
              console.log(chalk.yellow('\nManually run: ') + chalk.cyan('ollama pull llama3\n'));
            }
          }
        } else {
          spinner.succeed(`Found ${models.length} models: ${models.join(', ')}`);
          
          // Set default model
          config.set('provider', 'ollama');
          config.set('model', models[0]);
        }
      } catch (err) {
        spinner.fail('Could not connect to Ollama');
        console.log(chalk.yellow('\nMake sure Ollama is running: ') + chalk.cyan('ollama serve\n'));
      }
    }
    
    // Success!
    console.log(chalk.green('\n✅ Initialization complete!\n'));
    
    console.log(chalk.cyan('═'.repeat(50)));
    console.log(chalk.bright('  🎉 You\'re all set!\n'));
    console.log(chalk.dim('  Start chatting:    ') + chalk.cyan('ocell chat'));
    console.log(chalk.dim('  Quick question:    ') + chalk.cyan('ocell "how do I..."'));
    console.log(chalk.dim('  View providers:    ') + chalk.cyan('ocell providers'));
    console.log(chalk.dim('  Unlock Claude:     ') + chalk.cyan('ocell unlock claude'));
    console.log(chalk.cyan('═'.repeat(50)));
    console.log('');
    
  } catch (err: any) {
    spinner.fail('Initialization failed');
    console.error(chalk.red(`\n❌ Error: ${err.message}\n`));
    process.exit(1);
  }
}

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}
