# 🛡️ Ulfberht Security Auditor

Sistema de auditoria de segurança que detecta dados sensíveis em código, logs e processos.

## 🎯 Features

### Detecta:
- ✅ Senhas hardcoded
- ✅ API keys (AWS, GCP, Anthropic, OpenAI, etc.)
- ✅ Tokens JWT
- ✅ Cartões de crédito
- ✅ CPF/CNPJ
- ✅ Chaves PIX
- ✅ Merchant IDs (CloudWalk/InfinitePay)
- ✅ Webhook secrets
- ✅ Logs inseguros (dados sensíveis sendo logados)
- ✅ Processos com dados sensíveis em argumentos

### Reporta em:
- 🔔 **Discord** - Alertas em tempo real com embeds
- ✅ **GitHub Actions** - Bloqueia PRs com violações
- 📊 **Console** - Relatórios detalhados

## 🚀 Uso

### Modo Local

```bash
cd auditor

# Instalar dependências
pip install -r requirements.txt

# Escanear diretório
python src/main.py --path /path/to/scan

# Com Discord webhook
python src/main.py --path /data --webhook https://discord.com/api/webhooks/...

# Modo watch (30 em 30 min)
python src/main.py --path /data --webhook URL --watch --interval 1800
```

### Docker

```bash
# Build
docker build -t ulf-auditor .

# Run (scan once)
docker run -v /data:/data -e DISCORD_SECURITY_WEBHOOK=URL ulf-auditor

# Run (watch mode)
docker run -d -v /data:/data -e DISCORD_SECURITY_WEBHOOK=URL \
  ulf-auditor python src/main.py --watch
```

### Kubernetes (GKE)

```bash
# Criar secret com Discord webhook
kubectl create secret generic auditor-secrets -n agents \
  --from-literal=DISCORD_SECURITY_WEBHOOK="https://discord.com/api/webhooks/..."

# Deploy como CronJob (a cada 30min)
kubectl apply -f k8s/cronjob.yaml
```

### GitHub Actions

O workflow `.github/workflows/security-audit.yml` roda automaticamente em:
- ✅ Todo push para `main` ou `develop`
- ✅ Todo Pull Request
- ⚠️ Bloqueia merge se encontrar violações críticas/high

## 📊 Exit Codes

- `0` - Nenhuma violação ou apenas LOW
- `1` - Violações HIGH encontradas
- `2` - Violações CRITICAL encontradas (mais grave)
- `3` - Erro durante execução

## 🔧 Configuração

### Environment Variables

```bash
# Discord webhook (obrigatório para alertas)
export DISCORD_SECURITY_WEBHOOK="https://discord.com/api/webhooks/..."

# Path para escanear (default: /data)
export AUDIT_PATH="/custom/path"
```

### Discord Webhook Setup

1. No Discord, vá em **Server Settings → Integrations → Webhooks**
2. Click **New Webhook**
3. Nomeie: `Security Alerts`
4. Escolha canal: `#security-alerts` (recomendado criar um dedicado)
5. Copy webhook URL
6. Configure no K8s ou environment

## 📋 Padrões Detectados

### Gerais
- Senhas hardcoded
- API keys (20+ caracteres)
- Chaves privadas (PEM)
- JWT tokens

### Brasil
- Cartões de crédito (16 dígitos)
- CPF (XXX.XXX.XXX-XX)
- CNPJ (XX.XXX.XXX/XXXX-XX)
- Chaves PIX

### CloudWalk/InfinitePay
- Merchant IDs
- Transaction IDs
- Terminal IDs
- Webhook secrets

### Cloud Providers
- AWS Access Keys (AKIA...)
- GCP API Keys (AIza...)
- Anthropic Keys (sk-ant-api03-...)
- OpenAI Keys (sk-...)

### Logs Inseguros
- CPF em logs
- Cartões em logs
- Senhas em logs

## 🎨 Discord Report Format

### Resumo
```
🛡️ Security Audit Report

🚨 CRITICAL: 2 violações
⚠️  HIGH: 5 violações
⚡ MEDIUM: 3 violações

📊 Total: 10
⏰ 2026-02-02 15:30:45
```

### Detalhes (por tipo)
```
🚨 CRITICAL - api_keys

Tipo: API Keys
Encontradas: 2 ocorrências

#1 - src/config.ts:42
`api_***_***xyz`
```
config.ts:42: const API_KEY = "sk-api-..."
```

## 🛠️ Desenvolvimento

### Adicionar Novo Padrão

Edite `src/patterns.py`:

```python
CUSTOM_PATTERNS = {
    'my_pattern': {
        'regex': r'pattern_here',
        'severity': 'high',  # critical|high|medium|low
        'description': 'My custom pattern'
    }
}
```

### Testar Localmente

```bash
# Crie arquivo de teste
echo "password=secret123" > test.txt

# Execute scan
python src/main.py --path . --once

# Deve detectar a senha
```

## 🔒 Segurança

- ⚠️ **Nunca** commite o Discord webhook URL no código
- ✅ Use Kubernetes Secrets ou environment variables
- ✅ Masking automático de dados sensíveis nos reports
- ✅ Falso-positivos filtrados automaticamente

## 📝 Roadmap

- [ ] Integração com Claude para análise contextual
- [ ] Auto-fix de violações simples
- [ ] Dashboard web
- [ ] Machine learning para detecção de padrões
- [ ] Integração com sistema de self-improvement do Ulf
- [ ] Suporte para mais cloud providers
- [ ] Custom rules via YAML config

## 🤝 Contributing

1. Adicione novos padrões em `src/patterns.py`
2. Teste com casos reais
3. Documente no README
4. Submit PR

## 📄 License

MIT - Use freely for security auditing

## Testing Locally

The auditor can be tested with fake secrets. Create a test file locally (not committed):

```bash
# Create test file (gitignored)
cat > auditor/test_local.py << 'TEST'
# Test file with fake secrets
API_KEY = "sk-ant-api03-xxx...EXAMPLE"
AWS_KEY = "AKIA...EXAMPLE"
CPF = "123.456.789-00"
TEST

# Run auditor
python auditor/src/main.py --path auditor --once

# Clean up
rm auditor/test_local.py
```

**Note:** `test_example.py` is gitignored to avoid triggering GitHub's secret scanning alerts.
