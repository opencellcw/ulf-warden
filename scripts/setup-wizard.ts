#!/usr/bin/env node
/**
 * 🧙 OpenCell Setup Wizard - Plug-and-Play Installation
 * 
 * Makes OpenCell as easy to setup as ClawdBot!
 * Interactive CLI that guides you through minimal setup.
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const c = colors;

type DeploymentType = 'local' | 'docker' | 'render' | 'railway' | 'flyio' | 'heroku' | 'digitalocean' | 'aws' | 'azure' | 'gke' | 'skip';

interface SetupConfig {
  platform: 'discord' | 'slack' | 'telegram' | 'all' | 'skip';
  provider: 'claude' | 'moonshot' | 'openai' | 'gemini' | 'hybrid';
  deployment: DeploymentType;
  features: {
    imageGen: boolean;
    search: boolean;
    voice: boolean;
    pi: boolean;
  };
}

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(text: string) {
  console.log('');
  log('═'.repeat(60), colors.cyan);
  log(`  ${text}`, colors.bright + colors.cyan);
  log('═'.repeat(60), colors.cyan);
  console.log('');
}

function success(text: string) {
  log(`✅ ${text}`, colors.green);
}

function error(text: string) {
  log(`❌ ${text}`, colors.red);
}

function warning(text: string) {
  log(`⚠️  ${text}`, colors.yellow);
}

function info(text: string) {
  log(`ℹ️  ${text}`, colors.blue);
}

async function welcome() {
  console.clear();
  log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║              🧙 OpenCell Setup Wizard 🧙                  ║
  ║                                                           ║
  ║         Making OpenCell as easy as ClawdBot!             ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `, colors.cyan);
  
  info('This wizard will help you set up OpenCell in 3 minutes!');
  console.log('');
  info('You can always reconfigure later by running: npm run setup');
  console.log('');
  
  const ready = await ask(`${c.green}Ready to start? (Y/n): ${c.reset}`);
  if (ready.toLowerCase() === 'n') {
    log('Setup cancelled. Run "npm run setup" when ready!', colors.yellow);
    process.exit(0);
  }
}

async function selectPlatform(): Promise<'discord' | 'slack' | 'telegram' | 'all' | 'skip'> {
  header('📱 STEP 1: Choose Platform');
  
  log('Where do you want to deploy your bot?', colors.bright);
  console.log('');
  log('  1. Discord only (recommended for quick start)', colors.cyan);
  log('  2. Slack only', colors.cyan);
  log('  3. Telegram only', colors.cyan);
  log('  4. All platforms (Discord + Slack + Telegram)', colors.cyan);
  log('  5. Skip (configure later)', colors.cyan);
  console.log('');
  
  const choice = await ask(`${c.green}Enter choice (1-5): ${c.reset}`);
  
  const map: Record<string, any> = {
    '1': 'discord',
    '2': 'slack',
    '3': 'telegram',
    '4': 'all',
    '5': 'skip'
  };
  
  return map[choice] || 'discord';
}

async function getPlatformTokens(platform: string): Promise<Record<string, string>> {
  const tokens: Record<string, string> = {};
  
  if (platform === 'discord' || platform === 'all') {
    header('🎮 Discord Setup');
    info('Get your bot token from: https://discord.com/developers/applications');
    console.log('');
    tokens.DISCORD_BOT_TOKEN = await ask(`${c.green}Discord Bot Token: ${c.reset}`);
  }
  
  if (platform === 'slack' || platform === 'all') {
    header('💬 Slack Setup');
    info('Get your bot token from: https://api.slack.com/apps');
    console.log('');
    tokens.SLACK_BOT_TOKEN = await ask(`${c.green}Slack Bot Token (xoxb-...): ${c.reset}`);
  }
  
  if (platform === 'telegram' || platform === 'all') {
    header('✈️ Telegram Setup');
    info('Get your bot token from: @BotFather on Telegram');
    console.log('');
    tokens.TELEGRAM_BOT_TOKEN = await ask(`${c.green}Telegram Bot Token: ${c.reset}`);
  }
  
  return tokens;
}

async function selectProvider(): Promise<'claude' | 'moonshot' | 'openai' | 'gemini' | 'hybrid'> {
  header('🤖 STEP 2: Choose AI Provider');
  
  log('Which LLM provider do you want to use?', colors.bright);
  console.log('');
  log('  1. Claude (best quality, $15/Mtok) - RECOMMENDED', colors.cyan);
  log('  2. Moonshot (cheapest, $0.50/Mtok, Chinese)', colors.cyan);
  log('  3. OpenAI GPT-4 (balanced, $10/Mtok)', colors.cyan);
  log('  4. Gemini (fast, $1.25/Mtok)', colors.cyan);
  log('  5. Hybrid (auto-route to cheapest) - ADVANCED', colors.cyan);
  console.log('');
  
  const choice = await ask(`${c.green}Enter choice (1-5): ${c.reset}`);
  
  const map: Record<string, any> = {
    '1': 'claude',
    '2': 'moonshot',
    '3': 'openai',
    '4': 'gemini',
    '5': 'hybrid'
  };
  
  return map[choice] || 'claude';
}

async function getProviderKeys(provider: string): Promise<Record<string, string>> {
  const keys: Record<string, string> = {};
  
  header(`🔑 ${provider.toUpperCase()} API Key`);
  
  if (provider === 'claude') {
    info('Get your key from: https://console.anthropic.com/');
    console.log('');
    keys.ANTHROPIC_API_KEY = await ask(`${c.green}Anthropic API Key (sk-ant-...): ${c.reset}`);
    keys.DEFAULT_PROVIDER = 'claude';
  } else if (provider === 'moonshot') {
    info('Get your key from: https://platform.moonshot.cn/');
    console.log('');
    keys.MOONSHOT_API_KEY = await ask(`${c.green}Moonshot API Key: ${c.reset}`);
    keys.DEFAULT_PROVIDER = 'moonshot';
  } else if (provider === 'openai') {
    info('Get your key from: https://platform.openai.com/api-keys');
    console.log('');
    keys.OPENAI_API_KEY = await ask(`${c.green}OpenAI API Key (sk-...): ${c.reset}`);
    keys.DEFAULT_PROVIDER = 'openai';
  } else if (provider === 'gemini') {
    info('Get your key from: https://ai.google.dev/');
    console.log('');
    keys.GEMINI_API_KEY = await ask(`${c.green}Gemini API Key (AIza...): ${c.reset}`);
    keys.DEFAULT_PROVIDER = 'gemini';
  } else if (provider === 'hybrid') {
    info('Hybrid mode uses multiple providers. Enter at least 2:');
    console.log('');
    
    const wantClaude = await ask(`${c.green}Add Claude? (y/N): ${c.reset}`);
    if (wantClaude.toLowerCase() === 'y') {
      keys.ANTHROPIC_API_KEY = await ask(`${c.cyan}Claude API Key: ${c.reset}`);
    }
    
    const wantMoonshot = await ask(`${c.green}Add Moonshot (cheapest)? (Y/n): ${c.reset}`);
    if (wantMoonshot.toLowerCase() !== 'n') {
      keys.MOONSHOT_API_KEY = await ask(`${c.cyan}Moonshot API Key: ${c.reset}`);
    }
    
    const wantOpenAI = await ask(`${c.green}Add OpenAI? (y/N): ${c.reset}`);
    if (wantOpenAI.toLowerCase() === 'y') {
      keys.OPENAI_API_KEY = await ask(`${c.cyan}OpenAI API Key: ${c.reset}`);
    }
    
    keys.DEFAULT_PROVIDER = 'hybrid';
  }
  
  return keys;
}

async function selectFeatures(): Promise<SetupConfig['features']> {
  header('🎨 STEP 3: Optional Features');
  
  log('Enable advanced features? (can enable later)', colors.bright);
  console.log('');
  
  const imageGen = await ask(`${c.green}Image Generation (Replicate)? (y/N): ${c.reset}`);
  const search = await ask(`${c.green}Web Search (Brave)? (y/N): ${c.reset}`);
  const voice = await ask(`${c.green}Voice/TTS (ElevenLabs + Groq)? (y/N): ${c.reset}`);
  const pi = await ask(`${c.green}Agent Powers (Pi coding agent)? (y/N): ${c.reset}`);
  
  return {
    imageGen: imageGen.toLowerCase() === 'y',
    search: search.toLowerCase() === 'y',
    voice: voice.toLowerCase() === 'y',
    pi: pi.toLowerCase() === 'y'
  };
}

async function getFeatureKeys(features: SetupConfig['features']): Promise<Record<string, string>> {
  const keys: Record<string, string> = {};
  
  if (features.imageGen) {
    header('🎨 Image Generation Setup');
    info('Get Replicate key from: https://replicate.com/account/api-tokens');
    keys.REPLICATE_API_TOKEN = await ask(`${c.green}Replicate API Token: ${c.reset}`);
  }
  
  if (features.search) {
    header('🔍 Web Search Setup');
    info('Get Brave key from: https://brave.com/search/api/');
    keys.BRAVE_API_KEY = await ask(`${c.green}Brave API Key: ${c.reset}`);
  }
  
  if (features.voice) {
    header('🎙️ Voice Features Setup');
    info('Get ElevenLabs key: https://elevenlabs.io/');
    keys.ELEVENLABS_API_KEY = await ask(`${c.green}ElevenLabs API Key: ${c.reset}`);
    info('Get Groq key: https://console.groq.com/');
    keys.GROQ_API_KEY = await ask(`${c.green}Groq API Key: ${c.reset}`);
  }
  
  if (features.pi) {
    keys.ENABLE_PI = 'true';
    info('Pi coding agent will be enabled!');
  }
  
  return keys;
}

async function selectDeployment(): Promise<DeploymentType> {
  header('🚀 STEP 4: Deployment Method');
  
  log('How do you want to deploy OpenCell?', colors.bright);
  console.log('');
  
  log('💻 LOCAL/DEVELOPMENT:', colors.yellow);
  log('  1. Local (npm start) - Quick testing, free', colors.cyan);
  log('  2. Docker Compose - Isolated, includes Redis', colors.cyan);
  console.log('');
  
  log('☁️  CLOUD PLATFORMS (Easy):', colors.yellow);
  log('  3. Render - $7/mo, auto-deploy from Git ⭐', colors.cyan);
  log('  4. Railway - $5/mo, super simple', colors.cyan);
  log('  5. Fly.io - Free tier, fast globally', colors.cyan);
  log('  6. Heroku - Classic, $7/mo', colors.cyan);
  log('  7. DigitalOcean - $5/mo, full control', colors.cyan);
  console.log('');
  
  log('🏢 CLOUD PLATFORMS (Advanced):', colors.yellow);
  log('  8. AWS (ECS/Fargate) - Enterprise scale', colors.cyan);
  log('  9. Azure Container Apps - Microsoft stack', colors.cyan);
  log('  10. GKE (Google Kubernetes) - Production ready', colors.cyan);
  console.log('');
  
  log('  11. Skip (manual setup later)', colors.cyan);
  console.log('');
  
  const choice = await ask(`${c.green}Enter choice (1-11): ${c.reset}`);
  
  const map: Record<string, DeploymentType> = {
    '1': 'local',
    '2': 'docker',
    '3': 'render',
    '4': 'railway',
    '5': 'flyio',
    '6': 'heroku',
    '7': 'digitalocean',
    '8': 'aws',
    '9': 'azure',
    '10': 'gke',
    '11': 'skip'
  };
  
  return map[choice] || 'local';
}

function generateEnvFile(config: Record<string, string>) {
  const envPath = path.join(process.cwd(), '.env');
  
  // Load existing .env.example as template
  const examplePath = path.join(process.cwd(), '.env.example');
  let template = '';
  
  if (fs.existsSync(examplePath)) {
    template = fs.readFileSync(examplePath, 'utf-8');
  }
  
  // Replace or add values
  let envContent = template;
  
  for (const [key, value] of Object.entries(config)) {
    if (!value) continue;
    
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }
  
  fs.writeFileSync(envPath, envContent);
  success('.env file created!');
}

function createDockerCompose() {
  const dockerCompose = `version: '3.8'

services:
  opencell:
    build: .
    env_file: .env
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
    restart: unless-stopped
    depends_on:
      - redis
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis-data:
`;

  fs.writeFileSync('docker-compose.yml', dockerCompose);
  success('docker-compose.yml created!');
}

function createRailwayConfig() {
  const railwayToml = `[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
`;

  fs.writeFileSync('railway.toml', railwayToml);
  success('railway.toml created!');
}

function createFlyConfig() {
  const flyToml = `app = "opencell-bot"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"

[[services]]
  protocol = "tcp"
  internal_port = 3000

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[mounts]
  source = "opencell_data"
  destination = "/data"
`;

  fs.writeFileSync('fly.toml', flyToml);
  success('fly.toml created!');
}

function createHerokuConfig() {
  const procfile = `web: npm start
`;
  
  const herokuYml = `build:
  docker:
    web: Dockerfile
run:
  web: npm start
`;

  fs.writeFileSync('Procfile', procfile);
  fs.writeFileSync('heroku.yml', herokuYml);
  success('Procfile and heroku.yml created!');
}

function createDigitalOceanConfig() {
  const appSpec = `name: opencell-bot
services:
- name: web
  dockerfile_path: Dockerfile
  source_dir: /
  github:
    branch: main
    deploy_on_push: true
    repo: your-username/opencell
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 3000
  routes:
  - path: /
  envs:
  - key: NODE_ENV
    value: production
  - key: ANTHROPIC_API_KEY
    type: SECRET
`;

  fs.writeFileSync('app.yaml', appSpec);
  success('app.yaml (DigitalOcean) created!');
}

function createAWSConfig() {
  const taskDef = `{
  "family": "opencell-bot",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "opencell",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/opencell:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "ANTHROPIC_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:xxx:secret:opencell/anthropic"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/opencell",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}`;

  fs.writeFileSync('aws-task-definition.json', taskDef);
  success('aws-task-definition.json created!');
}

function createAzureConfig() {
  const containerApp = `apiVersion: 2023-05-01
kind: ContainerApp
properties:
  managedEnvironmentId: /subscriptions/xxx/resourceGroups/xxx/providers/Microsoft.App/managedEnvironments/xxx
  configuration:
    ingress:
      external: true
      targetPort: 3000
    secrets:
    - name: anthropic-api-key
      value: ""
  template:
    containers:
    - name: opencell
      image: your-registry.azurecr.io/opencell:latest
      env:
      - name: NODE_ENV
        value: production
      - name: ANTHROPIC_API_KEY
        secretRef: anthropic-api-key
      resources:
        cpu: 0.5
        memory: 1Gi
`;

  fs.writeFileSync('azure-container-app.yaml', containerApp);
  success('azure-container-app.yaml created!');
}

async function generateDeployFiles(deployment: DeploymentType) {
  header('⚙️  Generating Deployment Files');
  
  switch (deployment) {
    case 'docker':
      createDockerCompose();
      break;
    case 'railway':
      createRailwayConfig();
      break;
    case 'flyio':
      createFlyConfig();
      break;
    case 'heroku':
      createHerokuConfig();
      break;
    case 'digitalocean':
      createDigitalOceanConfig();
      break;
    case 'aws':
      createAWSConfig();
      break;
    case 'azure':
      createAzureConfig();
      break;
    case 'render':
      info('render.yaml already exists!');
      break;
    case 'gke':
      info('GKE config already exists in scripts/gke-deploy.sh');
      break;
  }
}

async function showDeployInstructions(deployment: DeploymentType) {
  header('📖 Deployment Instructions');
  
  switch (deployment) {
    case 'local':
      log('🏠 LOCAL DEPLOYMENT', colors.bright);
      console.log('');
      log('1. Start the bot:', colors.cyan);
      log('   npm start', colors.yellow);
      console.log('');
      log('2. Bot will connect to your platform(s)', colors.cyan);
      log('3. Check logs for any errors', colors.cyan);
      console.log('');
      break;
      
    case 'docker':
      log('🐳 DOCKER COMPOSE DEPLOYMENT', colors.bright);
      console.log('');
      log('1. Build and start:', colors.cyan);
      log('   docker-compose up -d', colors.yellow);
      console.log('');
      log('2. View logs:', colors.cyan);
      log('   docker-compose logs -f opencell', colors.yellow);
      console.log('');
      log('3. Stop:', colors.cyan);
      log('   docker-compose down', colors.yellow);
      console.log('');
      break;
      
    case 'render':
      log('🎨 RENDER DEPLOYMENT', colors.bright);
      console.log('');
      log('1. Push code to GitHub', colors.cyan);
      log('2. Go to https://render.com', colors.cyan);
      log('3. New → Blueprint', colors.cyan);
      log('4. Connect your GitHub repo', colors.cyan);
      log('5. Render will auto-detect render.yaml', colors.cyan);
      log('6. Add environment variables in Render dashboard', colors.cyan);
      log('7. Click "Apply" and wait for deploy', colors.cyan);
      console.log('');
      log('💰 Cost: $7/month (Starter plan)', colors.yellow);
      log('✅ Auto-deploys on git push', colors.green);
      console.log('');
      break;
      
    case 'railway':
      log('🚂 RAILWAY DEPLOYMENT', colors.bright);
      console.log('');
      log('1. Push code to GitHub', colors.cyan);
      log('2. Go to https://railway.app', colors.cyan);
      log('3. New Project → Deploy from GitHub', colors.cyan);
      log('4. Select your repo', colors.cyan);
      log('5. Railway auto-detects Dockerfile', colors.cyan);
      log('6. Add environment variables in Variables tab', colors.cyan);
      log('7. Deploy!', colors.cyan);
      console.log('');
      log('💰 Cost: $5/month', colors.yellow);
      log('✅ Super simple, great DX', colors.green);
      console.log('');
      break;
      
    case 'flyio':
      log('✈️  FLY.IO DEPLOYMENT', colors.bright);
      console.log('');
      log('1. Install flyctl:', colors.cyan);
      log('   curl -L https://fly.io/install.sh | sh', colors.yellow);
      console.log('');
      log('2. Login:', colors.cyan);
      log('   fly auth login', colors.yellow);
      console.log('');
      log('3. Launch app:', colors.cyan);
      log('   fly launch', colors.yellow);
      console.log('');
      log('4. Set secrets:', colors.cyan);
      log('   fly secrets set ANTHROPIC_API_KEY=xxx', colors.yellow);
      console.log('');
      log('5. Deploy:', colors.cyan);
      log('   fly deploy', colors.yellow);
      console.log('');
      log('💰 Cost: FREE tier available', colors.yellow);
      log('✅ Global edge deployment', colors.green);
      console.log('');
      break;
      
    case 'heroku':
      log('💜 HEROKU DEPLOYMENT', colors.bright);
      console.log('');
      log('1. Install Heroku CLI:', colors.cyan);
      log('   curl https://cli-assets.heroku.com/install.sh | sh', colors.yellow);
      console.log('');
      log('2. Login:', colors.cyan);
      log('   heroku login', colors.yellow);
      console.log('');
      log('3. Create app:', colors.cyan);
      log('   heroku create opencell-bot', colors.yellow);
      console.log('');
      log('4. Set stack to container:', colors.cyan);
      log('   heroku stack:set container', colors.yellow);
      console.log('');
      log('5. Set config vars:', colors.cyan);
      log('   heroku config:set ANTHROPIC_API_KEY=xxx', colors.yellow);
      console.log('');
      log('6. Deploy:', colors.cyan);
      log('   git push heroku main', colors.yellow);
      console.log('');
      log('💰 Cost: $7/month (Basic)', colors.yellow);
      log('✅ Classic, reliable', colors.green);
      console.log('');
      break;
      
    case 'digitalocean':
      log('🌊 DIGITALOCEAN APP PLATFORM', colors.bright);
      console.log('');
      log('1. Push code to GitHub', colors.cyan);
      log('2. Go to https://cloud.digitalocean.com/apps', colors.cyan);
      log('3. Create App → GitHub', colors.cyan);
      log('4. Select repo and branch', colors.cyan);
      log('5. DigitalOcean detects Dockerfile', colors.cyan);
      log('6. Add environment variables', colors.cyan);
      log('7. Choose $5/mo plan', colors.cyan);
      log('8. Launch!', colors.cyan);
      console.log('');
      log('💰 Cost: $5/month', colors.yellow);
      log('✅ Simple, full control', colors.green);
      console.log('');
      break;
      
    case 'aws':
      log('☁️  AWS ECS/FARGATE DEPLOYMENT', colors.bright);
      console.log('');
      log('1. Build and push image to ECR:', colors.cyan);
      log('   aws ecr create-repository --repository-name opencell', colors.yellow);
      log('   docker build -t opencell .', colors.yellow);
      log('   docker tag opencell:latest xxx.dkr.ecr.us-east-1.amazonaws.com/opencell:latest', colors.yellow);
      log('   docker push xxx.dkr.ecr.us-east-1.amazonaws.com/opencell:latest', colors.yellow);
      console.log('');
      log('2. Create ECS cluster:', colors.cyan);
      log('   aws ecs create-cluster --cluster-name opencell', colors.yellow);
      console.log('');
      log('3. Register task definition:', colors.cyan);
      log('   aws ecs register-task-definition --cli-input-json file://aws-task-definition.json', colors.yellow);
      console.log('');
      log('4. Create service:', colors.cyan);
      log('   aws ecs create-service --cluster opencell --service-name opencell-bot --task-definition opencell-bot --desired-count 1', colors.yellow);
      console.log('');
      log('💰 Cost: ~$15/month (Fargate)', colors.yellow);
      log('✅ Enterprise scale, AWS ecosystem', colors.green);
      console.log('');
      break;
      
    case 'azure':
      log('☁️  AZURE CONTAINER APPS', colors.bright);
      console.log('');
      log('1. Install Azure CLI:', colors.cyan);
      log('   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash', colors.yellow);
      console.log('');
      log('2. Login:', colors.cyan);
      log('   az login', colors.yellow);
      console.log('');
      log('3. Create resource group:', colors.cyan);
      log('   az group create --name opencell-rg --location eastus', colors.yellow);
      console.log('');
      log('4. Create container registry:', colors.cyan);
      log('   az acr create --resource-group opencell-rg --name opencellregistry --sku Basic', colors.yellow);
      console.log('');
      log('5. Build and push:', colors.cyan);
      log('   az acr build --registry opencellregistry --image opencell:latest .', colors.yellow);
      console.log('');
      log('6. Deploy container app:', colors.cyan);
      log('   az containerapp create --resource-group opencell-rg --name opencell-bot --yaml azure-container-app.yaml', colors.yellow);
      console.log('');
      log('💰 Cost: ~$10/month', colors.yellow);
      log('✅ Microsoft stack, serverless', colors.green);
      console.log('');
      break;
      
    case 'gke':
      log('☸️  GOOGLE KUBERNETES ENGINE', colors.bright);
      console.log('');
      log('1. Setup GKE cluster (if not exists):', colors.cyan);
      log('   See docs/GKE_SETUP.md', colors.yellow);
      console.log('');
      log('2. Build image:', colors.cyan);
      log('   npm run build:image', colors.yellow);
      console.log('');
      log('3. Deploy:', colors.cyan);
      log('   ./scripts/gke-deploy.sh', colors.yellow);
      console.log('');
      log('💰 Cost: ~$25/month (small cluster)', colors.yellow);
      log('✅ Production-ready, auto-scaling', colors.green);
      console.log('');
      break;
  }
}

async function finalSteps(deployment: DeploymentType) {
  await showDeployInstructions(deployment);
  
  header('✅ Setup Complete!');
  
  success('OpenCell is configured and ready to use!');
  console.log('');
  
  log('📚 Documentation:', colors.bright);
  log('  • README.md - Full guide', colors.cyan);
  log('  • docs/ - Detailed docs', colors.cyan);
  log('  • Discord: /help command', colors.cyan);
  console.log('');
  
  log('🔧 Reconfigure anytime:', colors.bright);
  log('  npm run setup', colors.yellow);
  console.log('');
  
  log('🚀 Quick Deploy Commands:', colors.bright);
  switch (deployment) {
    case 'local':
      log('  npm start', colors.yellow);
      break;
    case 'docker':
      log('  docker-compose up -d', colors.yellow);
      break;
    case 'render':
      log('  git push origin main (auto-deploys)', colors.yellow);
      break;
    case 'railway':
      log('  git push origin main (auto-deploys)', colors.yellow);
      break;
    case 'flyio':
      log('  fly deploy', colors.yellow);
      break;
    case 'heroku':
      log('  git push heroku main', colors.yellow);
      break;
    case 'gke':
      log('  ./scripts/gke-deploy.sh', colors.yellow);
      break;
  }
  console.log('');
  
  success('Happy bot building! 🤖🚀');
}

async function main() {
  try {
    await welcome();
    
    const platform = await selectPlatform();
    const platformTokens = platform !== 'skip' ? await getPlatformTokens(platform) : {};
    
    const provider = await selectProvider();
    const providerKeys = await getProviderKeys(provider);
    
    const features = await selectFeatures();
    const featureKeys = await getFeatureKeys(features);
    
    const deployment = await selectDeployment();
    
    // Generate config
    header('⚙️  Generating Configuration');
    
    const allConfig = {
      NODE_ENV: 'production',
      ...platformTokens,
      ...providerKeys,
      ...featureKeys
    };
    
    generateEnvFile(allConfig);
    
    if (deployment !== 'local' && deployment !== 'skip') {
      await generateDeployFiles(deployment);
    }
    
    await finalSteps(deployment);
    
    rl.close();
  } catch (err) {
    error(`Setup failed: ${err}`);
    rl.close();
    process.exit(1);
  }
}

main();
