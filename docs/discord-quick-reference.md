# Discord Formatting - Quick Reference Card 🚀

## 🎨 Embed Colors (Status-Aware)

```typescript
import { DISCORD_COLORS, createStatusEmbed } from './utils/discord-formatter';

// Automatic color based on status
status: 'online'  → 🟢 Green (0x00FF00)
status: 'warning' → 🟡 Yellow (0xFFCC00)
status: 'error'   → 🔴 Red (0xFF0000)
status: 'offline' → ⚫ Gray/Red

// Manual colors
DISCORD_COLORS.SUCCESS   → 0x00FF00
DISCORD_COLORS.ERROR     → 0xFF0000
DISCORD_COLORS.WARNING   → 0xFFCC00
DISCORD_COLORS.INFO      → 0x0099FF
DISCORD_COLORS.CRITICAL  → 0xFF0000
DISCORD_COLORS.HIGH      → 0xFF6600
DISCORD_COLORS.MEDIUM    → 0xFFCC00
DISCORD_COLORS.LOW       → 0x0099FF
```

## 📝 Quick Embeds

### Status Report
```typescript
const embed = createStatusEmbed({
  title: 'System Status',
  status: 'online',
  metrics: {
    cpu: '45%',
    memory: '2.1GB / 8GB',
    uptime: '7d 12h'
  }
});
```

### Error Message
```typescript
const embed = createErrorEmbed(
  'Operation Failed',
  error,
  'Optional details here'
);
```

### Success Message
```typescript
const embed = createSuccessEmbed(
  'Task Completed',
  'Your operation was successful'
);
```

### Info Message
```typescript
const embed = createInfoEmbed(
  'Information',
  'Description here',
  [
    { name: 'Field 1', value: 'Value 1', inline: true },
    { name: 'Field 2', value: 'Value 2', inline: true }
  ]
);
```

## 🎮 Interactive Buttons

### Basic Button Row
```typescript
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const row = new ActionRowBuilder<ButtonBuilder>()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('action_id')
      .setLabel('Click Me')
      .setEmoji('✨')
      .setStyle(ButtonStyle.Primary),  // Blue

    new ButtonBuilder()
      .setCustomId('another_action')
      .setLabel('Secondary')
      .setStyle(ButtonStyle.Secondary), // Gray

    new ButtonBuilder()
      .setLabel('Link')
      .setURL('https://example.com')
      .setStyle(ButtonStyle.Link)  // Gray with link
  );

await message.reply({
  content: 'Choose an option:',
  components: [row]
});
```

### Button Styles
```typescript
ButtonStyle.Primary   // Blue (blurple)
ButtonStyle.Secondary // Gray
ButtonStyle.Success   // Green
ButtonStyle.Danger    // Red
ButtonStyle.Link      // Gray with external link
```

### Handle Button Click
```typescript
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'action_id') {
    // Option 1: Reply (creates new message, visible to everyone)
    await interaction.reply({
      content: 'Button clicked!',
      ephemeral: true  // Only visible to clicker
    });

    // Option 2: Update (modifies original message)
    await interaction.deferUpdate();
    await interaction.editReply({
      content: 'Updated!',
      components: []  // Remove buttons
    });

    // Option 3: Follow-up (after deferReply)
    await interaction.deferReply({ ephemeral: true });
    // ... do work ...
    await interaction.followUp({ content: 'Done!' });
  }
});
```

## 📊 Tables

```typescript
import { createTable } from './utils/discord-formatter';

const table = createTable(
  ['Name', 'Status', 'Value'],  // Headers
  [
    ['Item 1', '✅', '100'],
    ['Item 2', '⚠️', '85'],
    ['Item 3', '❌', '0']
  ],
  ['left', 'center', 'right']  // Alignment
);

await message.reply('## Report\n\n' + table);
```

Output:
```
Name   | Status | Value
-------|--------|------
Item 1 |   ✅   |   100
Item 2 |   ⚠️   |    85
Item 3 |   ❌   |     0
```

## ✍️ Markdown

```typescript
import { markdown } from './utils/discord-formatter';

markdown.bold('Bold text')              // **Bold text**
markdown.italic('Italic')               // *Italic*
markdown.code('code')                   // `code`
markdown.codeBlock('code', 'js')        // ```js\ncode\n```
markdown.link('Text', 'https://...')    // [Text](https://...)
markdown.header('Title', 1)             // # Title
markdown.quote('Quote')                 // > Quote
markdown.spoiler('Hidden')              // ||Hidden||

// Or use raw markdown:
`**bold** *italic* \`code\` ||spoiler||`
```

## 🎯 Complete Example

```typescript
import {
  createStatusEmbed,
  createInfoEmbed,
  DISCORD_COLORS
} from './utils/discord-formatter';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

// Main embed
const statusEmbed = createStatusEmbed({
  title: 'Deployment Status',
  status: 'online',
  metrics: {
    services: '5 active',
    uptime: '99.9%',
    latency: '45ms'
  },
  footer: 'Last updated: ' + new Date().toLocaleTimeString()
});

// Details embed
const detailsEmbed = createInfoEmbed(
  'Service Details',
  null,
  [
    { name: 'API', value: '✅ Running', inline: true },
    { name: 'Database', value: '✅ Connected', inline: true },
    { name: 'Cache', value: '✅ Ready', inline: true },
    { name: 'Queue', value: '⚠️ Degraded', inline: true }
  ]
);

// Interactive buttons
const buttons = new ActionRowBuilder<ButtonBuilder>()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('refresh')
      .setLabel('Refresh')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('details')
      .setLabel('Details')
      .setEmoji('📊')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setLabel('Dashboard')
      .setURL('https://dashboard.example.com')
      .setStyle(ButtonStyle.Link)
  );

// Send everything
await message.reply({
  embeds: [statusEmbed, detailsEmbed],
  components: [buttons]
});
```

## ⚡ Pro Tips

### Multiple Embeds
```typescript
// Max 10 embeds per message
// Max 6000 total characters across all embeds
await message.reply({
  embeds: [embed1, embed2, embed3]
});
```

### Embed Limits
```
Title:       256 characters
Description: 4096 characters
Fields:      25 max per embed
Field name:  256 characters
Field value: 1024 characters
Footer:      2048 characters
```

### Button Limits
```
Max 5 action rows per message
Max 5 components per action row
Total: 25 buttons max per message
```

### Inline Fields
```typescript
// Max 3 fields per row with inline: true
fields: [
  { name: '1', value: 'a', inline: true },  // ┐
  { name: '2', value: 'b', inline: true },  // ├─ Same row
  { name: '3', value: 'c', inline: true },  // ┘
  { name: '4', value: 'd', inline: true },  // ┐ New row
  { name: '5', value: 'e', inline: true }   // ┘
]
```

### Ephemeral Replies
```typescript
// Only visible to user who clicked button
await interaction.reply({
  content: 'Secret message',
  ephemeral: true
});
```

### Update Original Message
```typescript
// Defer first (shows "thinking" state)
await interaction.deferUpdate();

// Then edit
await interaction.editReply({
  content: 'Updated!',
  embeds: [newEmbed]
});
```

### Progress Bar
```typescript
import { createLoadingEmbed } from './utils/discord-formatter';

const progress = createLoadingEmbed(
  'Processing...',
  65,  // 0-100
  'Analyzing data...'
);

// Built-in progress bar function
function createProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

// Result: ██████░░░░ 60%
```

## 🔗 Full Documentation

- **Complete Guide**: `/memory/discord-formatting.md`
- **Utilities**: `src/utils/discord-formatter.ts`
- **Examples**: `src/utils/discord-status-example.ts`
- **Integration**: `docs/discord-formatting-integration.md`
- **Summary**: `docs/DISCORD-FORMATTING-SUMMARY.md`

## 📱 Testing Checklist

- [ ] Test on desktop
- [ ] Test on mobile
- [ ] Test button interactions
- [ ] Test ephemeral replies
- [ ] Test with multiple embeds
- [ ] Test long messages (2000+ chars)
- [ ] Test embed character limits
- [ ] Test button limits (25 max)

---

**Quick Command**: `status` no Discord para ver tudo funcionando! 🚀
