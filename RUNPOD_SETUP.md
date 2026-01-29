# 🚀 Setup Ulfberht-Warden no Runpod.io

## 1. Conectar no Runpod

Via SSH ou Web Terminal do Runpod.

## 2. Instalar Node.js (se não tiver)

```bash
# Verificar se já tem Node
node --version

# Se não tiver, instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

## 3. Clonar o Repositório

```bash
cd ~
git clone https://github.com/lucaspressi/ulfberht-warden.git
cd ulfberht-warden
```

## 4. Instalar Dependências

```bash
npm install
```

## 5. Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env
cp .env.example .env

# Editar com suas chaves
nano .env
```

Adicione suas keys:
```env
ANTHROPIC_API_KEY=sk-ant-api03-xxx
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_APP_TOKEN=xapp-xxx
SLACK_SIGNING_SECRET=xxx
```

Salvar: `Ctrl+O`, Enter, `Ctrl+X`

## 6. Rodar o Warden

### Teste (foreground):
```bash
npm start
```

### Produção (background com PM2):
```bash
# Instalar PM2
sudo npm install -g pm2

# Iniciar
pm2 start npm --name "ulfberht-warden" -- start

# Ver logs
pm2 logs ulfberht-warden

# Ver status
pm2 status

# Parar
pm2 stop ulfberht-warden

# Reiniciar
pm2 restart ulfberht-warden

# Auto-start no boot (opcional)
pm2 startup
pm2 save
```

## 7. Verificar

O Warden deve aparecer online no Slack. Teste:
- Mande DM pro bot
- Mencione: `@Ulfberht-Warden olá`

## Troubleshooting

### Port já em uso
```bash
# Ver o que está usando a porta
sudo lsof -i :3000

# Matar processo
sudo kill -9 <PID>
```

### Logs
```bash
# Com PM2
pm2 logs ulfberht-warden

# Direto
npm start
```

### Reinstalar
```bash
rm -rf node_modules package-lock.json
npm install
```

## Manter Rodando

O PM2 mantém o processo rodando mesmo se crashar. No Runpod, você pode:

1. **Usar PM2** (recomendado)
2. **Screen/Tmux** para sessão persistente
3. **Docker** (se preferir containerizar)

## Notas Runpod

- Runpod cobra por hora de uso
- Configure auto-shutdown se não precisar 24/7
- Volume persistente recomendado para não perder dados
