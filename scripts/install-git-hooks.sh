#!/bin/bash
#
# Instalar Git hooks para segurança
#

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "Installing Git hooks for security..."
echo ""

# Pre-commit hook - bloqueia commit de .env
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
#
# Pre-commit hook: Bloqueia commit de secrets
#

RED='\033[0;31m'
NC='\033[0m'

# Arquivos que nunca devem ser commitados
BLOCKED_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    "*-key.json"
    "credentials.json"
    "service-account.json"
)

FOUND_BLOCKED=false

for pattern in "${BLOCKED_FILES[@]}"; do
    if git diff --cached --name-only | grep -q "$pattern"; then
        if [ "$FOUND_BLOCKED" = false ]; then
            echo ""
            echo -e "${RED}❌ ERRO: Tentativa de commit de arquivos sensíveis bloqueada!${NC}"
            echo ""
            FOUND_BLOCKED=true
        fi
        echo -e "${RED}  ✗ $pattern${NC}"
    fi
done

if [ "$FOUND_BLOCKED" = true ]; then
    echo ""
    echo "Estes arquivos contêm secrets e não devem ser commitados."
    echo ""
    echo "Para remover do staging:"
    for pattern in "${BLOCKED_FILES[@]}"; do
        git diff --cached --name-only | grep "$pattern" | while read file; do
            echo "  git reset $file"
        done
    done
    echo ""
    echo "Se você precisa sincronizar secrets, use:"
    echo "  ./scripts/sync-secrets.sh push"
    echo ""
    exit 1
fi

# Verificar se há secrets hardcoded no código
if git diff --cached | grep -E "(sk-ant-|xoxb-|xapp-|bot_token)" > /dev/null; then
    echo ""
    echo -e "${RED}⚠️  WARNING: Possível API key hardcoded detectada!${NC}"
    echo ""
    echo "Revise o código antes de commitar."
    echo "API keys devem estar no .env, não no código."
    echo ""
    read -p "Continuar mesmo assim? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

exit 0
EOF

chmod +x .git/hooks/pre-commit
log_info "Pre-commit hook instalado"

# Pre-push hook - lembrete de sincronizar secrets
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
#
# Pre-push hook: Lembrete de sincronizar secrets
#

YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar se .env foi modificado recentemente (últimas 24h)
if [ -f .env ]; then
    if [ $(find .env -mtime -1 | wc -l) -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}💡 LEMBRETE:${NC}"
        echo "  .env foi modificado recentemente."
        echo "  Você sincronizou as secrets?"
        echo ""
        echo "  ./scripts/sync-secrets.sh push"
        echo ""
        read -p "Continuar com push? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

exit 0
EOF

chmod +x .git/hooks/pre-push
log_info "Pre-push hook instalado"

echo ""
log_info "Git hooks instalados com sucesso! ✅"
echo ""
echo "Proteções ativas:"
echo "  • Pre-commit: Bloqueia commit de .env e secrets"
echo "  • Pre-push: Lembra de sincronizar secrets"
echo ""
echo "Teste:"
echo "  echo 'test' >> .env"
echo "  git add .env"
echo "  git commit -m 'test'"
echo "  # Deve ser bloqueado!"
echo ""
