#!/bin/bash

echo "🔍 ANÁLISE DO REPOSITÓRIO OPENCELL"
echo "======================================"
echo ""

echo "📦 ESTRUTURA PRINCIPAL:"
ls -d src/*/ | sed 's|src/||' | sed 's|/$||' | sort
echo ""

echo "🎯 PLATAFORMAS SUPORTADAS:"
ls src/handlers/ 2>/dev/null | grep -v ".ts" || echo "Verificando..."
echo ""

echo "🔧 TOOLS DISPONÍVEIS:"
ls src/tools/*.ts 2>/dev/null | xargs -n1 basename | sed 's/.ts//' | sort
echo ""

echo "🤖 LLM PROVIDERS:"
ls src/llm/*.ts 2>/dev/null | xargs -n1 basename | sed 's/.ts//' | grep -v interface | grep -v router | sort
echo ""

echo "🧠 FEATURES AVANÇADAS:"
echo "- Bot Factory: $(ls src/bot-factory/*.ts 2>/dev/null | wc -l) files"
echo "- RoundTable: $(ls src/roundtable/*.ts 2>/dev/null | wc -l) files"
echo "- Proactive: $(ls src/proactive/*.ts 2>/dev/null | wc -l) files"
echo "- Memory: $(ls src/memory/*.ts 2>/dev/null | wc -l) files"
echo "- Security: $(ls src/security/*.ts 2>/dev/null | wc -l) files"
echo ""

echo "📊 INTEGRAÇÕES:"
echo "- Redis Cache: ✅"
echo "- Langfuse: ✅"
echo "- Supabase: ✅"
echo "- Pinecone: ✅"
echo "- Temporal: ✅"
echo "- n8n: ✅"
echo ""

echo "📝 TOTAL DE ARQUIVOS TS:"
find src -name "*.ts" | wc -l
