/**
 * Script para atualizar pré-agendamentos com status 'importado' via API
 * Útil quando não tem acesso direto ao MongoDB
 * 
 * Uso: node scripts/atualizar-status-via-api.js
 */

const API_URL = process.env.API_URL || 'https://sua-api.onrender.com';
const TOKEN = process.env.API_TOKEN || 'agenda_export_token_fono_inova_2025_secure_abc123';

async function fetchPreAgendamentos() {
    try {
        const response = await fetch(`${API_URL}/api/pre-agendamento?limit=1000`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ Erro ao buscar pré-agendamentos: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('❌ Erro:', error.message);
        return [];
    }
}

async function atualizarStatus(id, novoStatus) {
    try {
        const response = await fetch(`${API_URL}/api/pre-agendamento/${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: novoStatus })
        });
        
        return response.ok;
    } catch (error) {
        console.error(`❌ Erro ao atualizar ${id}:`, error.message);
        return false;
    }
}

async function migrarStatusViaAPI() {
    console.log('🔍 Buscando pré-agendamentos...\n');
    
    const preAgendamentos = await fetchPreAgendamentos();
    
    if (preAgendamentos.length === 0) {
        console.log('❌ Nenhum pré-agendamento encontrado');
        return;
    }
    
    // Filtrar os que têm status 'importado' ou similar
    const paraAtualizar = preAgendamentos.filter(p => 
        p.status === 'importado' || 
        p.originalData?.status === 'importado'
    );
    
    console.log(`📋 Total de pré-agendamentos: ${preAgendamentos.length}`);
    console.log(`📋 Com status 'importado': ${paraAtualizar.length}\n`);
    
    if (paraAtualizar.length === 0) {
        console.log('✅ Nada a migrar');
        return;
    }
    
    // Mostrar os que serão atualizados
    paraAtualizar.forEach((p, i) => {
        const nome = p.patientInfo?.fullName || p.patientName || 'Sem nome';
        console.log(`  ${i + 1}. ${nome} (ID: ${p._id || p.id})`);
        console.log(`     Status atual: ${p.status || p.originalData?.status}`);
    });
    
    console.log('\n📝 Iniciando atualização...\n');
    
    let sucessos = 0;
    let falhas = 0;
    
    for (const pre of paraAtualizar) {
        const id = pre._id || pre.id;
        const nome = pre.patientInfo?.fullName || pre.patientName || 'Sem nome';
        
        const sucesso = await atualizarStatus(id, 'agendado');
        
        if (sucesso) {
            console.log(`  ✅ ${nome} - atualizado para 'agendado'`);
            sucessos++;
        } else {
            console.log(`  ❌ ${nome} - falha ao atualizar`);
            falhas++;
        }
        
        // Pequeno delay para não sobrecarregar a API
        await new Promise(r => setTimeout(r, 100));
    }
    
    console.log(`\n✅ Migração concluída!`);
    console.log(`   Sucessos: ${sucessos}`);
    console.log(`   Falhas: ${falhas}`);
}

// Executar
console.log('🚀 Iniciando migração via API...\n');
migrarStatusViaAPI().catch(console.error);
