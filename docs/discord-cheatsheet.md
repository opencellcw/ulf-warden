# Discord Formatting Cheat Sheet

## 🎨 Embed Structure Visual

```
┌─────────────────────────────────────────┐
│ 🔵 AUTHOR ICON  Author Name       [URL] │ ← author (optional)
├─────────────────────────────────────────┤
│                            [THUMBNAIL]   │ ← thumbnail (top right)
│ 📌 EMBED TITLE (clickable)              │ ← title (256 chars)
│                                         │
│ This is the main description text.      │ ← description (4096 chars)
│ It supports **markdown** formatting.    │
│                                         │
├─────────────────────────────────────────┤
│ Field 1 Name    | Field 2 Name         │ ← fields (inline: true)
│ Value 1         | Value 2              │   max 3 per row
│                                         │
│ Field 3 Name (full width)              │ ← field (inline: false)
│ This field takes the entire width      │
├─────────────────────────────────────────┤
│ [LARGE IMAGE - Full Width]             │ ← image (optional)
├─────────────────────────────────────────┤
│ 🕐 2026-02-04 17:20:58                  │ ← timestamp
│ Footer Icon  Footer Text (2048 chars)  │ ← footer
└─────────────────────────────────────────┘
   Status Color Bar (left side) ←
```

---

## 🎯 Quick Code Templates

### Minimal Embed
```typescript
const embed = new EmbedBuilder()
  .setTitle('Title')
  .setDescription('Description')
  .setColor(0x5865F2);
```

### Complete Embed
```typescript
const embed = new EmbedBuilder()
  .setAuthor({ name: 'Author', iconURL: 'url', url: 'link' })
  .setTitle('Title')
  .setURL('https://title-link.com')
  .setDescription('Description text')
  .setThumbnail('https://thumbnail.png')
  .setColor(0x5865F2)
  .addFields(
    { name: 'Field 1', value: 'Value 1', inline: true },
    { name: 'Field 2', value: 'Value 2', inline: true },
    { name: 'Field 3', value: 'Value 3', inline: false }
  )
  .setImage('https://large-image.png')
  .setFooter({ text: 'Footer text', iconURL: 'footer-icon.png' })
  .setTimestamp();
```

---

## 🔘 Button Layouts

### Single Row (max 5 buttons)
```typescript
const row = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder().setCustomId('1').setLabel('Button 1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('2').setLabel('Button 2').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('3').setLabel('Button 3').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('4').setLabel('Button 4').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setLabel('Link').setURL('https://url.com').setStyle(ButtonStyle.Link)
  );
```

**Visual:**
```
[🔵 Button 1]  [⚪ Button 2]  [🟢 Button 3]  [🔴 Button 4]  [🔗 Link]
```

### Multiple Rows (max 5 rows × 5 buttons = 25 total)
```typescript
const row1 = new ActionRowBuilder().addComponents(/* buttons */);
const row2 = new ActionRowBuilder().addComponents(/* buttons */);
const row3 = new ActionRowBuilder().addComponents(/* buttons */);

await message.reply({
  embeds: [embed],
  components: [row1, row2, row3]
});
```

**Visual:**
```
[Button 1] [Button 2] [Button 3]
[Button 4] [Button 5] [Button 6]
[Button 7] [Button 8] [Button 9]
```

---

## 🎨 Color Hex Values

```typescript
// Brand Colors
0x5865F2  // Blurple (Discord blue)
0x57F287  // Green
0xFEE75C  // Yellow
0xEB459E  // Fuchsia
0xED4245  // Red

// Status Colors
0x00FF00  // Success (bright green)
0xFFCC00  // Warning (orange/yellow)
0xFF0000  // Error (bright red)
0x0099FF  // Info (blue)
0x99AAB5  // Offline (gray)

// Severity Colors (Security)
0xFF0000  // Critical (red)
0xFF6600  // High (orange)
0xFFCC00  // Medium (yellow)
0x0099FF  // Low (blue)
```

---

## 📊 Field Layout Examples

### 3 Inline Fields (Side by Side)
```typescript
.addFields(
  { name: 'CPU', value: '45%', inline: true },
  { name: 'Memory', value: '2.1GB', inline: true },
  { name: 'Disk', value: '127GB', inline: true }
)
```
**Visual:**
```
┌─────────────────────────────────┐
│ CPU    | Memory   | Disk        │
│ 45%    | 2.1GB    | 127GB       │
└─────────────────────────────────┘
```

### Mixed Layout
```typescript
.addFields(
  { name: 'Status', value: '✅ Online', inline: true },
  { name: 'Uptime', value: '7d 12h', inline: true },
  { name: 'Details', value: 'Full width description here', inline: false },
  { name: 'Metric 1', value: '100', inline: true },
  { name: 'Metric 2', value: '200', inline: true }
)
```
**Visual:**
```
┌─────────────────────────────────┐
│ Status       | Uptime           │
│ ✅ Online    | 7d 12h           │
│                                 │
│ Details                         │
│ Full width description here     │
│                                 │
│ Metric 1     | Metric 2         │
│ 100          | 200              │
└─────────────────────────────────┘
```

---

## 📝 Markdown Formatting

```
**bold text**              → bold text
*italic text*              → italic text
__underline text__         → underline text
~~strikethrough~~          → strikethrough
||spoiler text||           → spoiler text (hidden until clicked)
`inline code`              → inline code
```language
code block
```                        → code block with syntax highlighting
> quote text               → quote text
>>> multi-line quote       → multi-line quote (rest of message)
[link text](https://url)   → clickable link
<https://url>              → auto-embed suppressed
# Header 1                 → Large header
## Header 2                → Medium header
### Header 3               → Small header
-# Subtext                 → Tiny subtext
- Item 1                   → Bullet list
* Item 2                   → Bullet list
1. Item 1                  → Numbered list
2. Item 2                  → Auto-increments
```

---

## 🎭 Emoji Usage

### Built-in Emojis
```typescript
.setLabel('Refresh')
.setEmoji('🔄')
```

### Custom Emojis (Server)
```typescript
.setEmoji({ name: 'custom_emoji_name', id: '1234567890' })
```

### Animated Emojis
```typescript
.setEmoji({ name: 'animated_emoji', id: '1234567890', animated: true })
```

### Common Status Emojis
```
✅ Success / Online / Completed
⚠️ Warning / Caution
❌ Error / Failed / Offline
ℹ️ Information
🔄 Refresh / Loading
⏳ In Progress
🟢 Green Status
🟡 Yellow Status
🔴 Red Status
⚫ Gray Status
🔵 Blue Status
```

---

## 🎮 Button Handler Template

```typescript
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    // Acknowledge immediately (prevents timeout)
    if (needsUpdate) {
      await interaction.deferUpdate(); // Update same message
    } else {
      await interaction.deferReply({ ephemeral: true }); // New message
    }

    // Handle button
    switch (interaction.customId) {
      case 'button_id':
        // Do work

        // Update message
        await interaction.editReply({
          embeds: [newEmbed],
          components: [newButtons]
        });
        break;
    }
  } catch (error) {
    console.error('Button error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Error',
        ephemeral: true
      });
    }
  }
});
```

---

## 🔍 Select Menu Template

```typescript
const menu = new StringSelectMenuBuilder()
  .setCustomId('menu_id')
  .setPlaceholder('Select an option')
  .setMinValues(1)
  .setMaxValues(1)
  .addOptions([
    {
      label: 'Option 1',
      description: 'Description of option 1',
      value: 'value_1',
      emoji: '1️⃣',
      default: false
    },
    {
      label: 'Option 2',
      description: 'Description of option 2',
      value: 'value_2',
      emoji: '2️⃣',
      default: true
    }
  ]);

const row = new ActionRowBuilder().addComponents(menu);
```

**Handler:**
```typescript
if (interaction.isStringSelectMenu()) {
  const selected = interaction.values[0]; // First selected value

  await interaction.reply({
    content: `You selected: ${selected}`,
    ephemeral: true
  });
}
```

---

## ⏱️ Timestamps

```typescript
// Current time
.setTimestamp()

// Specific time
.setTimestamp(new Date('2026-02-04T17:20:00'))

// Unix timestamp
.setTimestamp(1738689600000)
```

---

## 🎯 Message Send Options

```typescript
// Send message
await message.reply({
  content: 'Text content (2000 chars max)',
  embeds: [embed1, embed2],          // Max 10
  components: [row1, row2],          // Max 5 rows
  files: [attachment],               // File attachments
  ephemeral: true,                   // Only for interactions
  allowedMentions: { parse: [] }     // Disable @mentions
});

// Edit message
await message.edit({
  embeds: [newEmbed],
  components: [newButtons]
});

// Delete message
await message.delete();
```

---

## 📏 Character Limits Summary

```
Message content:        2,000 chars
Embed total:            6,000 chars
Embed title:              256 chars
Embed description:      4,096 chars
Embed fields:              25 fields
Field name:               256 chars
Field value:            1,024 chars
Footer text:            2,048 chars
Author name:              256 chars
Button label:              80 chars
Select option label:      100 chars
Select option desc:       100 chars
Embeds per message:        10 embeds
Buttons per message:       25 buttons
Select options:            25 options
```

---

## 🚀 Performance Tips

1. **Defer interactions immediately** - prevents 3s timeout
2. **Use ephemeral for personal data** - reduces clutter
3. **Batch embed updates** - don't update multiple times
4. **Disable processed buttons** - prevents double-clicks
5. **Cache static embeds** - reuse templates
6. **Limit file attachments** - they're rate-limited
7. **Use code blocks for data** - faster than embeds
8. **Paginate long lists** - don't send 10 embeds at once

---

## ✅ Testing Checklist

- [ ] Test on Discord mobile app
- [ ] Test with screen readers
- [ ] Check all button interactions
- [ ] Verify embed limits (6000 chars total)
- [ ] Test ephemeral message privacy
- [ ] Verify timestamps display correctly
- [ ] Check link button URLs
- [ ] Test error handling
- [ ] Verify rate limit handling
- [ ] Check markdown rendering

---

## 📚 Resources

- **Full Guide**: `/memory/discord-formatting.md`
- **Formatter Utils**: `src/utils/discord-formatter.ts`
- **Complete Example**: `src/utils/discord-status-example.ts`
- **UI Patterns**: `docs/discord-ui-patterns.md`
- **Before/After**: `docs/discord-formatting-comparison.md`

---

## 🆘 Quick Fixes

**Problem:** Buttons not working
- ✅ Added interaction listener? (`client.on('interactionCreate')`)
- ✅ Using correct custom_id?
- ✅ Deferring interaction in handler?

**Problem:** Embed not showing
- ✅ Color in decimal format? (0x5865F2, not "#5865F2")
- ✅ Under 6000 total characters?
- ✅ Valid image URLs (HTTPS)?

**Problem:** Mention spam
- ✅ Use `allowedMentions: { parse: [] }`
- ✅ Escape user input with markdown.code()

**Problem:** Timeout errors
- ✅ Call `deferReply()` or `deferUpdate()` immediately
- ✅ Respond within 15 minutes

**Problem:** Layout broken on mobile
- ✅ Max 3 inline fields per row
- ✅ Keep field values short
- ✅ Test on actual mobile device
