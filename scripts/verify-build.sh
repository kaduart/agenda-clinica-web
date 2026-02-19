#!/bin/bash

# 🔍 Script de Verificação Pré-Build
# Executar antes do deploy para garantir que não há referências ao Firebase

echo "🔍 Verificando referências ao Firebase..."

# Verificar imports do Firebase
FIREBASE_IMPORTS=$(grep -r "from.*firebase\|import.*firebase" src/ --include="*.js" --include="*.jsx" | grep -v "node_modules\|//\|removido\|\.backup" || true)

if [ -n "$FIREBASE_IMPORTS" ]; then
    echo "❌ ERRO: Ainda existem referências ao Firebase:"
    echo "$FIREBASE_IMPORTS"
    exit 1
else
    echo "✅ Nenhuma referência ao Firebase encontrada"
fi

# Verificar se crmApi.js existe
if [ ! -f "src/services/crmApi.js" ]; then
    echo "❌ ERRO: src/services/crmApi.js não encontrado"
    exit 1
else
    echo "✅ crmApi.js encontrado"
fi

# Verificar se api.js existe
if [ ! -f "src/services/api.js" ]; then
    echo "❌ ERRO: src/services/api.js não encontrado"
    exit 1
else
    echo "✅ api.js encontrado"
fi

echo ""
echo "✅ Verificação concluída! Pronto para build."
