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

# crmApi.js e preAppointmentsRepo.js foram removidos: eram fachadas legadas de uma
# collection PreAppointment que não existe mais (pre_agendado é estado do Appointment).
# A verificação passou a ser o inverso — garantir que o legado não volte.
LEGACY_FILES=""
for f in src/services/crmApi.js src/services/preAppointmentsRepo.js; do
    [ -f "$f" ] && LEGACY_FILES="$LEGACY_FILES $f"
done

if [ -n "$LEGACY_FILES" ]; then
    echo "❌ ERRO: fachada legada reintroduzida:$LEGACY_FILES"
    exit 1
else
    echo "✅ Nenhuma fachada legada (crmApi/preAppointmentsRepo)"
fi

# O backend NÃO tem POST /api/v2/pre-appointments. Só existem operações sobre um
# agendamento já criado (/:id/confirm, /:id/discard, /:id/contact, /:id/assign) e o
# GET de listagem. Criação é sempre POST /api/v2/appointments.
#
# A regra casa o LITERAL DE STRING do path "pelado", não a chamada `post(...)`:
# o path e sua aspa de fechamento ficam na mesma linha mesmo quando a chamada é
# quebrada em várias linhas, então isso não é contornável por formatação.
# Sub-rotas (/:id/confirm etc.) passam, porque essas existem de fato.
LEGACY_ENDPOINT=$(grep -rnE "['\"\`]/api/v2/pre-appointments(\?[^'\"\`]*)?['\"\`]" \
    src/ scripts/ --exclude=verify-build.sh 2>/dev/null || true)

if [ -n "$LEGACY_ENDPOINT" ]; then
    echo "❌ ERRO: uso do path raiz /api/v2/pre-appointments"
    echo "   Criação é POST /api/v2/appointments com operationalStatus: pre_agendado."
    echo "   (Se for GET de listagem, confirme manualmente e libere aqui.)"
    echo "$LEGACY_ENDPOINT"
    exit 1
else
    echo "✅ Nenhum uso do path raiz /api/v2/pre-appointments"
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
