#!/bin/bash
#
# Script para migrar status 'importado' para 'agendado' no MongoDB
# 
# Uso no servidor (Render) ou localmente com MongoDB shell:
#
# 1. Via mongosh (MongoDB Shell moderno):
#    mongosh "mongodb+srv://usuario:senha@cluster.mongodb.net/agenda-clinica" --file - << 'EOF'
#    db.preagendamentos.updateMany(
#      { status: "importado" },
#      { $set: { status: "agendado" } }
#    )
#    EOF
#
# 2. Via mongo (shell antigo):
#    mongo "mongodb://localhost:27017/agenda-clinica" --eval '
#      db.preagendamentos.updateMany(
#        { status: "importado" },
#        { $set: { status: "agendado" } }
#      )
#    '
#
# 3. Verificar quantos documentos precisam ser atualizados:
#    db.preagendamentos.countDocuments({ status: "importado" })
#
# 4. Verificar todos os status distintos:
#    db.preagendamentos.distinct("status")

echo "🚀 Migração de status no MongoDB"
echo "================================"
echo ""
echo "Comando para executar no MongoDB:"
echo ""
echo 'db.preagendamentos.updateMany('
echo '  { status: "importado" },'
echo '  { $set: { status: "agendado" } }'
echo ')'
echo ""
echo "Ou para verificar antes de atualizar:"
echo 'db.preagendamentos.find({ status: "importado" }).pretty()'
