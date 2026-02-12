#!/bin/bash

# Script para atualizar a PUBLIC_URL do bot após configurar hostname no Cloudflare

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║     🔧 Configurar URL Pública do Cloudflare Tunnel 🔧     ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar se URL foi passada como argumento
if [ -z "$1" ]; then
    echo "❌ Erro: URL não fornecida!"
    echo ""
    echo "Uso:"
    echo "  ./update-bot-url.sh https://sua-url.trycloudflare.com"
    echo ""
    echo "Exemplos:"
    echo "  ./update-bot-url.sh https://ulf-bot-abc123.trycloudflare.com"
    echo "  ./update-bot-url.sh https://bot.seudominio.com"
    echo ""
    exit 1
fi

PUBLIC_URL="$1"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "URL fornecida: $PUBLIC_URL"
echo ""

# Validar formato da URL
if [[ ! "$PUBLIC_URL" =~ ^https?:// ]]; then
    echo "⚠️  Aviso: URL não começa com http:// ou https://"
    echo "   Adicionando https:// automaticamente..."
    PUBLIC_URL="https://$PUBLIC_URL"
fi

echo "URL final: $PUBLIC_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Testando URL..."

# Testar se URL responde
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$PUBLIC_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "000" ]; then
    echo "   ⚠️  URL não responde (pode ser que ainda não esteja configurado no Cloudflare)"
    echo "   Continuando mesmo assim..."
elif [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ]; then
    echo "   ⚠️  URL responde mas bot pode não estar pronto (HTTP $HTTP_CODE)"
    echo "   Continuando..."
else
    echo "   ✅ URL responde! (HTTP $HTTP_CODE)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "2. Verificando deployment do bot..."

kubectl get deployment ulf-warden-agent -n agents >/dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "   ❌ Deployment 'ulf-warden-agent' não encontrado!"
    echo "   Verifique se o bot está deployado no namespace 'agents'"
    exit 1
fi

echo "   ✅ Deployment encontrado!"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "3. Atualizando variável PUBLIC_URL..."

kubectl set env deployment/ulf-warden-agent \
    PUBLIC_URL="$PUBLIC_URL" \
    -n agents

if [ $? -ne 0 ]; then
    echo "   ❌ Erro ao atualizar variável!"
    exit 1
fi

echo "   ✅ Variável atualizada!"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "4. Aguardando rollout do deployment..."

kubectl rollout status deployment/ulf-warden-agent -n agents --timeout=60s

if [ $? -ne 0 ]; then
    echo "   ⚠️  Rollout demorou muito, mas pode estar em progresso"
    echo "   Verifique com: kubectl get pods -n agents -l app=ulf-warden-agent"
else
    echo "   ✅ Deployment atualizado!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "5. Atualizando ConfigMap (para referência)..."

kubectl create configmap tunnel-hostname \
    --from-literal=hostname="$PUBLIC_URL" \
    --from-literal=tunnel-id="9733ce54-43c9-4bd7-a103-a825aca9c24c" \
    -n agents \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null 2>&1

echo "   ✅ ConfigMap atualizado!"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo ""
echo "Seu bot agora está configurado para usar:"
echo "  🌐 $PUBLIC_URL"
echo ""
echo "O bot SEMPRE vai usar essa URL para:"
echo "  ✅ Webhooks (Discord, Slack, Telegram)"
echo "  ✅ Dashboard e APIs"
echo "  ✅ Integrações (n8n, etc)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Para verificar a configuração:"
echo ""
echo "  kubectl get deployment ulf-warden-agent -n agents \\"
echo "    -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name==\"PUBLIC_URL\")].value}'"
echo ""
echo "  echo"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
