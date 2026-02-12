#!/bin/bash

# System Audit Script
# Verifica pontas soltas, código não usado, features mal integradas

echo "🔍 AUDITORIA COMPLETA DO SISTEMA"
echo "================================"
echo ""

# 1. Find unused imports
echo "📦 1. VERIFICANDO IMPORTS NÃO USADOS..."
npx ts-prune 2>/dev/null | head -50 || echo "ts-prune não instalado, pulando..."
echo ""

# 2. Find TODO/FIXME comments
echo "⚠️  2. VERIFICANDO TODOs E FIXMEs..."
grep -r "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" | wc -l
echo "Total encontrados:"
grep -r "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" | head -20
echo ""

# 3. Find files not imported anywhere
echo "📄 3. VERIFICANDO ARQUIVOS ÓRFÃOS..."
find src/ -name "*.ts" | while read file; do
  filename=$(basename "$file" .ts)
  if ! grep -r "from.*$filename\|import.*$filename" src/ --include="*.ts" | grep -v "$file" >/dev/null 2>&1; then
    if ! grep -r "export.*from.*$filename" src/ --include="*.ts" >/dev/null 2>&1; then
      echo "  ⚠️  Possível órfão: $file"
    fi
  fi
done
echo ""

# 4. Check for duplicate implementations
echo "🔄 4. VERIFICANDO DUPLICAÇÕES..."
echo "Múltiplos TTSGenerators:"
find src/ -name "*tts*.ts" -o -name "*text-to-speech*.ts"
echo ""
echo "Múltiplos Cache systems:"
find src/ -name "*cache*.ts"
echo ""
echo "Múltiplos Redis clients:"
grep -r "new Redis\|createClient" src/ --include="*.ts" | wc -l
echo ""

# 5. Check tool registrations
echo "🛠️  5. VERIFICANDO TOOLS..."
echo "Tools definidos:"
grep -r "name:.*'[a-z_]*'" src/tools/ --include="*.ts" | grep -E "name: '|name:'" | wc -l
echo ""
echo "Tools em definitions.ts:"
grep "TOOLS\|_TOOL" src/tools/definitions.ts | wc -l
echo ""
echo "Tools no index.ts cases:"
grep "case '" src/tools/index.ts | wc -l
echo ""

# 6. Check database files
echo "💾 6. VERIFICANDO DATABASES..."
ls -lh data/*.db 2>/dev/null || echo "Nenhum database encontrado em data/"
echo ""

# 7. Check environment variables
echo "🔐 7. VERIFICANDO ENV VARS..."
echo "Definidas em .env.example:"
grep -c "^[A-Z_]*=" .env.example 2>/dev/null || echo "0"
echo ""
echo "Usadas no código:"
grep -r "process.env\." src/ --include="*.ts" | sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' | sort -u | wc -l
echo ""

# 8. Check for console.log (should use logger)
echo "📝 8. VERIFICANDO console.log (deveria usar logger)..."
grep -r "console\." src/ --include="*.ts" | grep -v "console.log('\[" | grep -v "// " | wc -l
echo "Total console.* calls"
echo ""

# 9. Check test coverage
echo "🧪 9. VERIFICANDO TESTES..."
find . -name "*.test.ts" -o -name "*.spec.ts" | wc -l
echo "Arquivos de teste encontrados"
echo ""

# 10. Check package.json scripts
echo "📜 10. SCRIPTS DISPONÍVEIS..."
grep '".*":' package.json | grep -v "//" | head -20
echo ""

echo "✅ AUDITORIA COMPLETA!"
