/**
 * Script para consolidar pacientes duplicados
 * Mantém o paciente mais antigo e migra os agendamentos dos duplicados
 * 
 * Uso: node scripts/consolidar-pacientes.js "Davi Felipe"
 */

const API_URL = process.env.API_URL || 'http://localhost:5000';
const TOKEN = process.env.API_TOKEN;
if (!TOKEN) {
    console.error('❌ Defina API_TOKEN no ambiente antes de rodar este script.');
    process.exit(1);
}

async function fetchPacientesPorNome(nome) {
    try {
        const response = await fetch(`${API_URL}/api/patients?search=${encodeURIComponent(nome)}&limit=100`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ Erro ao buscar pacientes: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        return data || [];
    } catch (error) {
        console.error('❌ Erro:', error.message);
        return [];
    }
}

async function fetchAgendamentosPorPaciente(patientId) {
    try {
        // Busca agendamentos de hoje até 1 ano atrás
        const hoje = new Date().toISOString().split('T')[0];
        const umAnoAtras = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const response = await fetch(
            `${API_URL}/api/appointments?patientId=${patientId}&startDate=${umAnoAtras}&endDate=${hoje}`,
            {
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) return [];
        
        const data = await response.json();
        return data || [];
    } catch (error) {
        console.error(`❌ Erro ao buscar agendamentos: ${error.message}`);
        return [];
    }
}

async function migrarAgendamento(agendamentoId, novoPatientId) {
    try {
        const response = await fetch(`${API_URL}/api/appointments/${agendamentoId}/migrate`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ patientId: novoPatientId })
        });
        
        return response.ok;
    } catch (error) {
        console.error(`❌ Erro ao migrar agendamento ${agendamentoId}: ${error.message}`);
        return false;
    }
}

async function deletarPaciente(patientId) {
    try {
        const response = await fetch(`${API_URL}/api/patients/${patientId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error(`❌ Erro ao deletar paciente ${patientId}: ${error.message}`);
        return false;
    }
}

async function consolidarPacientes(nomeBusca) {
    console.log(`🔍 Buscando pacientes com nome: "${nomeBusca}"`);
    
    const pacientes = await fetchPacientesPorNome(nomeBusca);
    
    if (pacientes.length === 0) {
        console.log('❌ Nenhum paciente encontrado');
        return;
    }
    
    console.log(`📋 Encontrados ${pacientes.length} paciente(s):`);
    pacientes.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.fullName} (ID: ${p._id})`);
        console.log(`     Criado em: ${p.createdAt || 'N/A'}`);
        console.log(`     Telefone: ${p.phone || 'N/A'}`);
    });
    
    if (pacientes.length === 1) {
        console.log('✅ Apenas um paciente encontrado, nada a fazer');
        return;
    }
    
    // Ordenar por data de criação (mais antigo primeiro)
    const pacientesOrdenados = pacientes.sort((a, b) => {
        const dataA = new Date(a.createdAt || 0);
        const dataB = new Date(b.createdAt || 0);
        return dataA - dataB;
    });
    
    const pacientePrincipal = pacientesOrdenados[0];
    const pacientesDuplicados = pacientesOrdenados.slice(1);
    
    console.log(`\n🎯 Paciente principal (mais antigo): ${pacientePrincipal.fullName} (${pacientePrincipal._id})`);
    console.log(`📅 Criado em: ${pacientePrincipal.createdAt}`);
    console.log(`\n🗑️  Pacientes duplicados a remover: ${pacientesDuplicados.length}`);
    
    // Para cada paciente duplicado
    for (const duplicado of pacientesDuplicados) {
        console.log(`\n📌 Processando duplicado: ${duplicado.fullName} (${duplicado._id})`);
        
        // Buscar agendamentos deste paciente
        const agendamentos = await fetchAgendamentosPorPaciente(duplicado._id);
        console.log(`   📅 Encontrados ${agendamentos.length} agendamento(s)`);
        
        // Migrar agendamentos
        let migrados = 0;
        for (const agendamento of agendamentos) {
            const sucesso = await migrarAgendamento(agendamento.id || agendamento._id, pacientePrincipal._id);
            if (sucesso) {
                console.log(`   ✅ Agendamento ${agendamento.id || agendamento._id} migrado`);
                migrados++;
            } else {
                console.log(`   ❌ Falha ao migrar agendamento ${agendamento.id || agendamento._id}`);
            }
        }
        
        // Se não tem agendamentos ou todos foram migrados, deletar o paciente duplicado
        if (agendamentos.length === 0 || migrados === agendamentos.length) {
            console.log(`   🗑️  Deletando paciente duplicado...`);
            const deletado = await deletarPaciente(duplicado._id);
            if (deletado) {
                console.log(`   ✅ Paciente duplicado removido`);
            } else {
                console.log(`   ❌ Falha ao remover paciente (pode ter agendamentos não migrados)`);
            }
        } else {
            console.log(`   ⚠️  Paciente não removido pois ${agendamentos.length - migrados} agendamento(s) não puderam ser migrados`);
        }
    }
    
    console.log('\n✅ Consolidação concluída!');
    console.log(`🎯 Paciente principal: ${pacientePrincipal.fullName} (${pacientePrincipal._id})`);
}

// Executar se chamado diretamente
const nomeBusca = process.argv[2] || 'Davi';
console.log('🚀 Iniciando consolidação de pacientes...\n');
consolidarPacientes(nomeBusca).catch(console.error);
