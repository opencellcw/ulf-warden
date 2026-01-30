// Load .env first
require('dotenv/config');

// Quick debug script
console.log('Environment variables check:');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✓ Set (length: ' + process.env.ANTHROPIC_API_KEY.length + ')' : '✗ Missing');
console.log('SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? '✓ Set (starts: ' + process.env.SLACK_BOT_TOKEN?.substring(0, 10) + ')' : '✗ Missing');
console.log('SLACK_APP_TOKEN:', process.env.SLACK_APP_TOKEN ? '✓ Set (starts: ' + process.env.SLACK_APP_TOKEN?.substring(0, 10) + ')' : '✗ Missing');
console.log('SLACK_SIGNING_SECRET:', process.env.SLACK_SIGNING_SECRET ? '✓ Set (length: ' + process.env.SLACK_SIGNING_SECRET.length + ')' : '✗ Missing');
console.log('DISCORD_BOT_TOKEN:', process.env.DISCORD_BOT_TOKEN ? '✓ Set' : '✗ Missing');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✓ Set' : '✗ Missing');
