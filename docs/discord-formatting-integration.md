# Discord Formatting - Guia de Integração

## 🚀 Quick Start

### 1. Importar o Formatter

```typescript
import {
  createStatusEmbed,
  createInfoEmbed,
  createErrorEmbed,
  createSuccessEmbed,
  DISCORD_COLORS,
  STATUS_EMOJIS,
  markdown
} from './utils/discord-formatter';

import { sendSystemStatusReport } from './utils/discord-status-example';
```

### 2. Usar no Discord Handler

Edite `src/handlers/discord.ts` para detectar o comando de status:

```typescript
// Adicionar no messageCreate handler, antes da linha 298

// Status report command
if (text.match(/status|server status|system status/i)) {
  await sendSystemStatusReport(message);
  return;
}
```

### 3. Configurar Button Handlers

Adicione no final de `startDiscordHandler()`, antes do login:

```typescript
// Handle button interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    switch (interaction.customId) {
      case 'refresh_status':
        await interaction.deferUpdate();
        // Re-create and send updated status
        const info = getSystemInfo(); // Your system info function
        const statusEmbed = createStatusEmbed({
          title: 'System Status (Refreshed)',
          status: 'online',
          metrics: { /* ... */ }
        });
        await interaction.editReply({ embeds: [statusEmbed] });
        break;

      case 'view_logs':
        const logEmbed = createInfoEmbed(
          'Recent Logs',
          '```\n' + getRecentLogs() + '\n```'
        );
        await interaction.reply({ embeds: [logEmbed], ephemeral: true });
        break;

      case 'detailed_metrics':
        // Show detailed metrics
        break;
    }
  } catch (error: any) {
    log.error('[Discord] Button interaction error', { error: error.message });
    await interaction.reply({
      content: '❌ Erro ao processar ação',
      ephemeral: true
    }).catch(() => {});
  }
});
```

## 📋 Exemplos de Uso

### Status Report Simples

```typescript
const embed = createStatusEmbed({
  title: 'Bot Status',
  status: 'online',  // 'online' | 'warning' | 'error' | 'offline'
  metrics: {
    cpu: '45%',
    memory: '2.1GB / 8GB',
    uptime: '7d 12h'
  }
});

await message.reply({ embeds: [embed] });
```

### Error Alert

```typescript
try {
  // ... código
} catch (error) {
  const errorEmbed = createErrorEmbed(
    'Failed to Process Request',
    error,
    'Check logs for details'
  );

  await message.reply({ embeds: [errorEmbed] });
}
```

### Success Confirmation

```typescript
const successEmbed = createSuccessEmbed(
  'Bot Created Successfully',
  'Your new bot is ready to use!',
  [
    { name: 'Bot Name', value: botName, inline: true },
    { name: 'Token', value: '||' + token + '||', inline: true }
  ]
);

await message.reply({ embeds: [successEmbed] });
```

### Progress Indicator

```typescript
const progressEmbed = createLoadingEmbed(
  'Deploying Service',
  65,  // percentage
  'Installing dependencies...'
);

const msg = await message.reply({ embeds: [progressEmbed] });

// Update progress
setTimeout(() => {
  progressEmbed.setFields([
    { name: '📊 Progress', value: '█████████░ 90%' }
  ]);
  msg.edit({ embeds: [progressEmbed] });
}, 2000);
```

### Info com Buttons

```typescript
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const infoEmbed = createInfoEmbed(
  'Configuration Options',
  'Choose an option below:'
);

const buttons = new ActionRowBuilder<ButtonBuilder>()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('option_1')
      .setLabel('Enable Feature')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('option_2')
      .setLabel('Disable Feature')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setLabel('Documentation')
      .setURL('https://docs.example.com')
      .setStyle(ButtonStyle.Link)
  );

await message.reply({
  embeds: [infoEmbed],
  components: [buttons]
});
```

### Table com Markdown

```typescript
import { createTable, markdown } from './utils/discord-formatter';

const table = createTable(
  ['Name', 'Status', 'Uptime'],
  [
    ['Bot 1', '🟢 Online', '7d 12h'],
    ['Bot 2', '🟡 Warning', '2h 30m'],
    ['Bot 3', '🔴 Offline', '0m'],
  ],
  ['left', 'center', 'right']
);

const header = markdown.header('Bot Status Report', 2);
const content = `${header}\n\n${table}`;

await message.reply(content);
```

### Multiple Embeds

```typescript
const mainEmbed = createStatusEmbed({
  title: 'System Overview',
  status: 'online',
  metrics: { cpu: '45%', memory: '2GB/8GB' }
});

const detailsEmbed = createInfoEmbed(
  'Details',
  null,
  [
    { name: 'Component A', value: '✅ OK', inline: true },
    { name: 'Component B', value: '✅ OK', inline: true },
    { name: 'Component C', value: '⚠️ Warning', inline: true }
  ]
);

const notesEmbed = new EmbedBuilder()
  .setTitle('📝 Notes')
  .setDescription('Some additional information here')
  .setColor(DISCORD_COLORS.INFO);

await message.reply({
  embeds: [mainEmbed, detailsEmbed, notesEmbed]
});
```

## 🎨 Customização

### Cores Personalizadas

```typescript
const customEmbed = new EmbedBuilder()
  .setTitle('Custom Report')
  .setColor(0xFF00FF)  // Purple
  .setDescription('...');
```

### Emojis Customizados

```typescript
const embed = createInfoEmbed('Status', null, [
  { name: '🚀 Performance', value: 'Excellent', inline: true },
  { name: '🔒 Security', value: 'Secure', inline: true },
  { name: '📊 Metrics', value: 'Healthy', inline: true }
]);
```

### Timestamps

```typescript
const embed = createStatusEmbed({...})
  .setTimestamp()  // Current time
  .setTimestamp(new Date('2026-02-04'));  // Specific time
```

### Thumbnails e Images

```typescript
const embed = createInfoEmbed('Report', '...')
  .setThumbnail('https://example.com/icon.png')  // Top right
  .setImage('https://example.com/chart.png');    // Full width bottom
```

## 🔧 Troubleshooting

### Embed não aparece
- Verifique se está enviando `{ embeds: [embed] }` (array!)
- Limite: 10 embeds por mensagem
- Limite: 6000 caracteres totais

### Buttons não funcionam
- Verifique se o handler de `interactionCreate` está registrado
- Use `ephemeral: true` para respostas privadas
- Máximo 5 rows × 5 buttons = 25 botões

### Formatação quebrada no mobile
- Use `inline: true` nos fields (max 3 por linha)
- Evite textos muito longos em field values
- Use code blocks para tabelas

### Rate Limit
- Discord limita 5 mensagens por 5 segundos
- Use `interaction.deferReply()` para ações demoradas
- Use `ephemeral: true` quando possível

## 📚 Próximos Passos

1. **Migrar comandos existentes**: Substitua mensagens de texto plano por embeds
2. **Adicionar buttons**: Torne comandos interativos
3. **Criar templates**: Padronize mensagens de erro, sucesso, info
4. **Logs estruturados**: Use embeds para logs de auditoria
5. **Dashboards**: Crie painéis interativos com select menus

## 🎯 Checklist de Migração

- [ ] Status reports usando embeds
- [ ] Error handling com `createErrorEmbed`
- [ ] Success confirmations com `createSuccessEmbed`
- [ ] Interactive buttons para ações comuns
- [ ] Button interaction handlers configurados
- [ ] Tabelas usando `createTable`
- [ ] Color coding por tipo/severidade
- [ ] Timestamps em todos os embeds
- [ ] Footer para contexto/attribution
- [ ] Ephemeral replies onde apropriado

## 🔗 Recursos

- **Guia completo**: `/memory/discord-formatting.md`
- **Utilities**: `src/utils/discord-formatter.ts`
- **Exemplos**: `src/utils/discord-status-example.ts`
- **Comparação**: `docs/discord-formatting-comparison.md`
- **Handler atual**: `src/handlers/discord.ts`
