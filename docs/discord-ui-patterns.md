# Discord UI Patterns - Quick Reference

## 🎨 Common Patterns

### 1. Status Reports (System Monitoring)

**Use Case:** Show system health, metrics, uptime

```typescript
const embed = createStatusEmbed({
  title: 'System Status',
  status: 'online', // online | warning | error | offline
  metrics: {
    cpu: '45%',
    memory: '2.1GB/8GB',
    disk: '127GB free',
    uptime: '7d 12h'
  },
  footer: 'Updated every 5min'
});

const buttons = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('refresh')
      .setLabel('Refresh')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary)
  );

await message.reply({ embeds: [embed], components: [buttons] });
```

**Colors:**
- 🟢 Green (0x00FF00) = Online/Healthy
- 🟡 Yellow (0xFFCC00) = Warning
- 🔴 Red (0xFF0000) = Error/Critical
- ⚫ Gray (0x99AAB5) = Offline

---

### 2. Success/Error Messages

**Success:**
```typescript
const embed = createSuccessEmbed(
  'Task Completed',
  'The operation finished successfully',
  [
    { name: 'Duration', value: '2.3s', inline: true },
    { name: 'Items Processed', value: '42', inline: true }
  ]
);
```

**Error:**
```typescript
const embed = createErrorEmbed(
  'Operation Failed',
  new Error('Connection timeout'),
  'The server did not respond within 30 seconds'
);
```

---

### 3. Progress Tracking

```typescript
const embed = createLoadingEmbed(
  'Processing Files',
  progress: 67,
  details: 'Processing file 67/100: document.pdf'
);

// Update progress
await interaction.editReply({ embeds: [embed] });
```

**Visual:**
```
⏳ Processing Files
📊 Progress
███████░░░ 67%
Processing file 67/100: document.pdf
```

---

### 4. Lists & Tables

**Simple List:**
```typescript
const embed = createInfoEmbed(
  'Available Commands',
  null,
  [
    { name: '/status', value: 'Show system status', inline: false },
    { name: '/help', value: 'Show help message', inline: false },
    { name: '/about', value: 'About this bot', inline: false }
  ]
);
```

**Data Table:**
```typescript
const table = createTable(
  ['Name', 'Status', 'Uptime'],
  [
    ['Server 1', '✅', '99.9%'],
    ['Server 2', '⚠️', '98.1%'],
    ['Server 3', '❌', '45.2%']
  ],
  ['left', 'center', 'right']
);

const embed = createInfoEmbed('Server Overview', table);
```

---

### 5. Interactive Menus

**Multiple Actions:**
```typescript
const row1 = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('action_start')
      .setLabel('Start')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('action_stop')
      .setLabel('Stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('action_restart')
      .setLabel('Restart')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary)
  );

const row2 = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setLabel('Documentation')
      .setEmoji('📚')
      .setURL('https://docs.example.com')
      .setStyle(ButtonStyle.Link)
  );

await message.reply({
  embeds: [controlEmbed],
  components: [row1, row2]
});
```

---

### 6. Paginated Content

```typescript
let page = 0;
const pages = [embed1, embed2, embed3];

const navigation = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('Previous')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('page_info')
      .setLabel(`Page ${page + 1}/${pages.length}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('Next')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === pages.length - 1)
  );

await message.reply({
  embeds: [pages[page]],
  components: [navigation]
});
```

---

### 7. Confirmation Dialogs

```typescript
const confirmEmbed = new EmbedBuilder()
  .setTitle('⚠️ Confirm Action')
  .setDescription('Are you sure you want to delete all logs?')
  .setColor(DISCORD_COLORS.WARNING);

const confirmation = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_yes')
      .setLabel('Yes, Delete')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('confirm_no')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
  );

await message.reply({
  embeds: [confirmEmbed],
  components: [confirmation],
  ephemeral: true // Only visible to user
});
```

---

### 8. Select Menus

```typescript
const row = new ActionRowBuilder()
  .addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('server_select')
      .setPlaceholder('Choose a server')
      .addOptions([
        {
          label: 'Production',
          description: 'Main production server',
          value: 'prod',
          emoji: '🟢'
        },
        {
          label: 'Staging',
          description: 'Testing environment',
          value: 'staging',
          emoji: '🟡'
        },
        {
          label: 'Development',
          description: 'Development server',
          value: 'dev',
          emoji: '🔵'
        }
      ])
  );

await message.reply({
  content: 'Select a server to manage:',
  components: [row]
});
```

---

### 9. Rich Media (Thumbnails & Images)

```typescript
const embed = new EmbedBuilder()
  .setTitle('Server Metrics')
  .setDescription('Current performance overview')
  .setColor(DISCORD_COLORS.BLURPLE)
  .setThumbnail('https://example.com/icon.png') // Top right corner
  .setImage('https://example.com/chart.png')    // Full width bottom
  .addFields([
    { name: 'CPU', value: '45%', inline: true },
    { name: 'Memory', value: '2.1GB', inline: true }
  ])
  .setFooter({
    text: 'Powered by Ulf',
    iconURL: 'https://example.com/footer-icon.png'
  })
  .setTimestamp();
```

---

### 10. Multi-Embed Messages

```typescript
const summaryEmbed = createInfoEmbed('Summary', 'Overview of results');
const detailsEmbed = createInfoEmbed('Details', 'Detailed breakdown');
const warningsEmbed = createErrorEmbed('Warnings', 'Issues found');

await message.reply({
  embeds: [summaryEmbed, detailsEmbed, warningsEmbed] // Max 10 embeds
});
```

---

## 🎯 Button Styles

```typescript
ButtonStyle.Primary   // 🔵 Blurple (Discord brand color)
ButtonStyle.Secondary // ⚪ Gray
ButtonStyle.Success   // 🟢 Green
ButtonStyle.Danger    // 🔴 Red
ButtonStyle.Link      // 🔗 Gray with URL (no custom_id needed)
```

---

## 📏 Limits & Constraints

| Element | Limit |
|---------|-------|
| Embeds per message | 10 |
| Total embed chars | 6000 |
| Embed title | 256 chars |
| Embed description | 4096 chars |
| Fields per embed | 25 |
| Field name | 256 chars |
| Field value | 1024 chars |
| Footer text | 2048 chars |
| Author name | 256 chars |
| Buttons per message | 25 (5 rows × 5) |
| Select menu options | 25 |

---

## 🔔 Ephemeral Messages

Messages only visible to the user who triggered the interaction:

```typescript
await interaction.reply({
  content: 'This is private!',
  embeds: [embed],
  ephemeral: true
});
```

**Use Cases:**
- Error messages
- Personal data
- Help commands
- Confirmation dialogs
- Temporary responses

---

## 🎨 Markdown Quick Reference

```md
**bold**
*italic*
__underline__
~~strikethrough~~
||spoiler||
`inline code`
```python
code block
```
> quote
- bullet list
1. numbered list
[link](https://url.com)
```

---

## 🚀 Best Practices

1. **Always use embeds** for structured data
2. **Color code** by status (green/yellow/red)
3. **Use inline fields** for metrics (max 3 per row)
4. **Add timestamps** for time-sensitive info
5. **Include footers** for attribution/context
6. **Make buttons descriptive** with emojis
7. **Use ephemeral replies** for errors/help
8. **Disable buttons** after action completes
9. **Split long content** into multiple embeds
10. **Test on mobile** - layouts change!

---

## 📱 Mobile Considerations

- Inline fields stack vertically on mobile
- Buttons remain clickable
- Embeds maintain full formatting
- Images/thumbnails scale appropriately
- Code blocks get horizontal scroll
- Tables in code blocks may be hard to read (keep narrow)

---

## 🔧 Common Patterns by Use Case

### System Administration
- ✅ Status embeds with color coding
- ✅ Refresh buttons
- ✅ Inline metrics (3 per row)
- ✅ Timestamp in footer

### User Notifications
- ✅ Success/error embeds
- ✅ Clear action buttons
- ✅ Ephemeral for personal data

### Bot Commands
- ✅ Info embeds with field lists
- ✅ Link buttons to docs
- ✅ Select menus for options

### Data Display
- ✅ Tables in code blocks
- ✅ Multiple embeds for sections
- ✅ Pagination for long lists

### Interactive Forms
- ✅ Buttons for choices
- ✅ Select menus for dropdowns
- ✅ Confirmation dialogs
- ✅ Update embeds after selection

---

## 📚 Complete Example

See `/src/utils/discord-status-example.ts` for a full implementation of:
- System status report
- Interactive buttons
- Button handlers
- Error handling
- Progress updates
- Data tables
