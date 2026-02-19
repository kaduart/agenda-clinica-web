/**
 * Script específico para consolidar os pacientes "Davi Felipe"
 * IDs encontrados:
 * - 692da1e37a66901c8975db66 (Davi Felipe Araújo) - MANTER (mais completo)
 * - 699314bf03d5cc171cf018d5 (Davi Felipe) - REMOVER
 * - 699316b803d5cc171cf02036 (Davi Felipe Araujo) - REMOVER
 * - 69931dde03d5cc171cf03c57 (Davi Felipe SAraujo) - REMOVER
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm-clinica';

async function consolidarDaviFelipe() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Conectado ao MongoDB');
        
        const db = client.db();
        const patients = db.collection('patients');
        const appointments = db.collection('appointments');
        
        // IDs identificados
        const ID_PRINCIPAL = '692da1e37a66901c8975db66'; // Davi Felipe Araújo (mais completo)
        const IDs_DUPLICADOS = [
            '699314bf03d5cc171cf018d5', // Davi Felipe
            '699316b803d5cc171cf02036', // Davi Felipe Araujo
            '69931dde03d5cc171cf03c57'  // Davi Felipe SAraujo
        ];
        
        console.log('\n📋 Resumo da consolidação:');
        console.log(`✅ MANTER: ${ID_PRINCIPAL}`);
        console.log(`🗑️  REMOVER: ${IDs_DUPLICADOS.join(', ')}`);
        
        // 1. Verificar paciente principal
        const principal = await patients.findOne({ _id: new ObjectId(ID_PRINCIPAL) });
        if (!principal) {
            console.error('❌ Paciente principal não encontrado!');
            return;
        }
        console.log(`\n🎯 Paciente principal: ${principal.fullName}`);
        console.log(`   Telefone: ${principal.phone || 'N/A'}`);
        console.log(`   CPF: ${principal.cpf || 'N/A'}`);
        
        // 2. Para cada duplicado, migrar agendamentos e deletar
        for (const duplicadoId of IDs_DUPLICADOS) {
            console.log(`\n📌 Processando duplicado: ${duplicadoId}`);
            
            // Verificar se existe
            const duplicado = await patients.findOne({ _id: new ObjectId(duplicadoId) });
            if (!duplicado) {
                console.log('   ⚠️  Paciente não encontrado (já foi deletado?)');
                continue;
            }
            
            console.log(`   Nome: ${duplicado.fullName}`);
            console.log(`   Telefone: ${duplicado.phone || 'N/A'}`);
            
            // Contar agendamentos
            const countAgendamentos = await appointments.countDocuments({
                patientId: new ObjectId(duplicadoId)
            });
            console.log(`   Agendamentos: ${countAgendamentos}`);
            
            if (countAgendamentos > 0) {
                // Migrar agendamentos
                const resultado = await appointments.updateMany(
                    { patientId: new ObjectId(duplicadoId) },
                    { 
                        $set: { 
                            patientId: new ObjectId(ID_PRINCIPAL),
                            patientName: principal.fullName // Atualiza nome também
                        } 
                    }
                );
                console.log(`   ✅ Migrados: ${resultado.modifiedCount} agendamentos`);
            }
            
            // Deletar paciente duplicado
            const deleteResult = await patients.deleteOne({ _id: new ObjectId(duplicadoId) });
            if (deleteResult.deletedCount === 1) {
                console.log('   ✅ Paciente duplicado removido');
            } else {
                console.log('   ❌ Falha ao remover paciente');
            }
        }
        
        // 3. Verificar se há pré-agendamentos também
        const preAppointments = db.collection('preagendamentos');
        for (const duplicadoId of IDs_DUPLICADOS) {
            const countPre = await preAppointments.countDocuments({
                'patientInfo.patientId': new ObjectId(duplicadoId)
            });
            
            if (countPre > 0) {
                console.log(`\n📌 Migrando ${countPre} pré-agendamentos de ${duplicadoId}`);
                const resultado = await preAppointments.updateMany(
                    { 'patientInfo.patientId': new ObjectId(duplicadoId) },
                    { 
                        $set: { 
                            'patientInfo.patientId': new ObjectId(ID_PRINCIPAL),
                            'patientInfo.fullName': principal.fullName
                        } 
                    }
                );
                console.log(`   ✅ Migrados: ${resultado.modifiedCount} pré-agendamentos`);
            }
        }
        
        console.log('\n✅ Consolidação concluída!');
        console.log(`🎯 Paciente principal: ${principal.fullName} (${ID_PRINCIPAL})`);
        
        // Verificar agendamentos finais
        const totalAgendamentos = await appointments.countDocuments({
            patientId: new ObjectId(ID_PRINCIPAL)
        });
        console.log(`📅 Total de agendamentos no paciente principal: ${totalAgendamentos}`);
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await client.close();
        console.log('\n🔌 Conexão fechada');
    }
}

// Executar
console.log('🚀 Iniciando consolidação de Davi Felipe...\n');
consolidarDaviFelipe();
