# 🔧 Sistema de Self-Improvement com Aprovação Humana

Sistema que permite ao Ulf propor melhorias em si mesmo, com aprovação humana obrigatória via Discord antes de aplicar as mudanças.

## 🎯 Como Funciona

1. **Detecção**: Ulf detecta necessidade de melhoria (bug, nova feature, refactoring)
2. **Proposta**: Gera um embed no Discord com:
   - Título e descrição da melhoria
   - Lista de arquivos que serão modificados  
   - Diff das mudanças (quando aplicável)
   - Botões "✅ Approve" e "❌ Decline"
3. **Autorização**: Somente usuários configurados podem aprovar/rejeitar
4. **Aplicação**: Se aprovado → Build → Docker → Deploy → Restart
5. **Notificação**: Informa resultado no Discord

## 🔐 Seu Discord User ID

Foi configurado: **665994193750982706**

Para confirmar, envie uma mensagem para o bot no Discord e ele vai registrar nos logs.

## 📝 Como Usar

O sistema detecta automaticamente quando você menciona melhorias. Exemplos:

- "propor melhoria para adicionar comando /stats"
- "pode melhorar o handler de erros?"
- "detectei um bug em X, consegue corrigir?"

## 🚀 Próximos Passos

1. Build e deploy do código atualizado
2. Teste enviando: "@ulf propor melhoria para testar o sistema de aprovação"
3. Você receberá um embed com botões
4. Click "Approve" para testar o fluxo completo

Ver mais detalhes técnicos em `src/examples/self-improvement-example.ts`
