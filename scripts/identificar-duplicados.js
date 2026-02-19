/**
 * Script para identificar pacientes duplicados
 * Lista todos os pacientes com nome similar para análise
 * 
 * Uso: node scripts/identificar-duplicados.js
 */

const API_URL = process.env.API_URL || 'http://localhost:5000';
const TOKEN = process.env.API_TOKEN || 'agenda_export_token_fono_inova_2025_secure_abc123';

async function fetchTodosPacientes() {
    try {
        console.log('🔍 Buscando todos os pacientes...');
        
        const response = await fetch(`${API_URL}/api/patients?limit=1000`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ Erro ${response.status}: ${response.statusText}`);
            const errorText = await response.text();
            console.error('Resposta:', errorText);
            return [];
        }
        
        const data = await response.json();
        return data || [];
    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
        return [];
    }
}

function normalizarNome(nome) {
    return nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/\s+/g, ' ') // Remove espaços múltiplos
        .trim();
}

function encontrarDuplicados(pacientes) {
    const grupos = {};
    
    pacientes.forEach(paciente => {
        const nomeNormalizado = normalizarNome(paciente.fullName);
        
        // Agrupa por nome completo
        if (!grupos[nomeNormalizado]) {
            grupos[nomeNormalizado] = [];
        }
        grupos[nomeNormalizado].push(paciente);
    });
    
    // Retorna apenas grupos com mais de 1 paciente (duplicados)
    return Object.entries(grupos)
        .filter(([_, lista]) => lista.length > 1)
        .map(([nome, lista]) => ({ nome, pacientes: lista }));
}

async function main() {
    console.log('🚀 Analisando pacientes duplicados...\n');
    
    const pacientes = await fetchTodosPacientes();
    
    if (pacientes.length === 0) {
        console.log('❌ Não foi possível carregar pacientes');
        console.log('💡 Verifique se:');
        console.log('   1. O backend está rodando');
        console.log('   2. O token está correto');
        console.log('   3. A rota /api/patients está acessível');
        return;
    }
    
    console.log(`📊 Total de pacientes carregados: ${pacientes.length}\n`);
    
    const duplicados = encontrarDuplicados(pacientes);
    
    if (duplicados.length === 0) {
        console.log('✅ Nenhum paciente duplicado encontrado!');
        return;
    }
    
    console.log(`🚨 Encontrados ${duplicados.length} nome(s) com duplicatas:\n`);
    
    duplicados.forEach((grupo, index) => {
        console.log(`${index + 1}. "${grupo.nome.toUpperCase()}" - ${grupo.pacientes.length} paciente(s)`);
        console.log('   IDs:');
        
        // Ordenar por data de criação (mais antigo primeiro)
        const ordenados = grupo.pacientes.sort((a, b) => {
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        });
        
        ordenados.forEach((p, i) => {
            const marker = i === 0 ? '✅ MANTER (mais antigo)' : '❌ REMOVER';
            const data = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A';
            console.log(`      ${marker} ${p._id}`);
            console.log(`         Criado: ${data} | Tel: ${p.phone || 'N/A'}`);
        });
        console.log('');
    });
    
    console.log('💡 PRÓXIMOS PASSOS:');
    console.log('   1. Anote o ID do paciente mais antigo (✅ MANTER)');
    console.log('   2. Anote os IDs dos duplicados (❌ REMOVER)');
    console.log('   3. No MongoDB, migre os agendamentos dos duplicados para o principal');
    console.log('   4. Delete os pacientes duplicados');
    console.log('');
    console.log('⚠️  Ou execute no MongoDB Compass:');
    console.log('   db.appointments.updateMany(');
    console.log('     { patientId: "ID_DUPLICADO" },');
    console.log('     { $set: { patientId: "ID_PRINCIPAL" } }');
    console.log('   )');
}

main().catch(console.error);
