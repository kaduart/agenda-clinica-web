/**
 * Script para migrar pré-agendamentos com status 'importado' para 'agendado'
 * 
 * O backend estava usando 'importado' mas o schema só aceita 'agendado'
 * Este script atualiza todos os documentos no banco de dados
 * 
 * Uso no backend (Node.js com Mongoose):
 *   node scripts/migrar-status-importado.js
 * 
 * Ou via MongoDB shell:
 *   db.preagendamentos.updateMany(
 *     { status: "importado" },
 *     { $set: { status: "agendado" } }
 *   )
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agenda-clinica';

async function migrarStatus() {
    try {
        // Conectar ao MongoDB
        const mongoose = require('mongoose');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado ao MongoDB');

        // Schema simplificado para a migração
        const preAgendamentoSchema = new mongoose.Schema({
            status: String,
            patientInfo: Object,
            preferredDate: String,
        }, { collection: 'preagendamentos' });

        const PreAgendamento = mongoose.model('PreAgendamento', preAgendamentoSchema);

        // Buscar documentos com status 'importado'
        const importados = await PreAgendamento.find({ status: 'importado' });
        console.log(`📋 Encontrados ${importados.length} pré-agendamento(s) com status 'importado'`);

        if (importados.length === 0) {
            console.log('✅ Nada a migrar');
            await mongoose.disconnect();
            return;
        }

        // Mostrar os documentos que serão atualizados
        importados.forEach((doc, i) => {
            console.log(`  ${i + 1}. ${doc.patientInfo?.fullName || 'Sem nome'} (${doc._id})`);
            console.log(`     Data: ${doc.preferredDate || 'N/A'}`);
        });

        // Atualizar todos de uma vez
        const resultado = await PreAgendamento.updateMany(
            { status: 'importado' },
            { 
                $set: { status: 'agendado' },
                $unset: { importadoAt: 1 } // Remove campo temporário se existir
            }
        );

        console.log(`\n✅ Migração concluída!`);
        console.log(`   Documentos encontrados: ${resultado.matchedCount}`);
        console.log(`   Documentos modificados: ${resultado.modifiedCount}`);

        // Verificar se ainda existem documentos com status inválido
        const restantes = await PreAgendamento.find({ status: 'importado' });
        if (restantes.length > 0) {
            console.log(`\n⚠️  Atenção: ${restantes.length} documento(s) ainda têm status 'importado'`);
        } else {
            console.log(`\n✅ Todos os documentos foram migrados com sucesso!`);
        }

        await mongoose.disconnect();
        console.log('🔌 Desconectado do MongoDB');

    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    console.log('🚀 Iniciando migração de status...\n');
    migrarStatus();
}

module.exports = { migrarStatus };
