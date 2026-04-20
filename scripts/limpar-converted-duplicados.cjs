/**
 * 🧹 SCRIPT DE LIMPEZA: Remove appointments "converted" duplicados
 *
 * Problema: idempotência quebrada no backend cria múltiplos registros
 * "converted" para o mesmo pré-agendamento (mesmo paciente+data+hora).
 *
 * Este script:
 * 1. Busca todos os appointments com operationalStatus = "converted"
 * 2. Agrupa por (patientId, date, time)
 * 3. Mantém apenas o mais recente de cada grupo
 * 4. Deleta os duplicados
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'https://fono-inova-crm-back.onrender.com';
const TOKEN = process.env.API_TOKEN || 'agenda_export_token_fono_inova_2025_secure_abc123';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
    },
    timeout: 30000
});

async function buscarConverted() {
    console.log("📋 Buscando appointments 'converted'...");
    // Buscar todos os appointments de 2026 (amplo)
    const res = await api.get('/api/v2/appointments', {
        params: { startDate: '2026-01-01', endDate: '2026-12-31', limit: 500 }
    });
    const apps = res.data?.data?.appointments || res.data?.appointments || [];
    const converted = apps.filter(a => a.operationalStatus === 'converted');
    console.log(`   Total appointments: ${apps.length}`);
    console.log(`   Converted: ${converted.length}`);
    return converted;
}

function agruparDuplicados(appointments) {
    const grupos = new Map();

    for (const a of appointments) {
        const patientId = (a.patient && typeof a.patient === 'object') ? a.patient._id?.toString() : (a.patient || a.patientId || 'unknown');
        const date = typeof a.date === 'string' ? a.date.substring(0, 10) : (a.date ? new Date(a.date).toISOString().substring(0, 10) : '');
        const time = a.time || '';
        const key = `${patientId}|${date}|${time}`;

        if (!grupos.has(key)) {
            grupos.set(key, []);
        }
        grupos.get(key).push(a);
    }

    // Retorna apenas grupos com mais de 1 item (duplicados)
    const duplicados = [];
    for (const [key, lista] of grupos) {
        if (lista.length > 1) {
            // Ordena por createdAt descendente (mais recente primeiro)
            lista.sort((a, b) => {
                const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return cb - ca;
            });
            duplicados.push({ key, manter: lista[0], remover: lista.slice(1) });
        }
    }

    return duplicados;
}

async function deletarDuplicados(duplicados) {
    let totalRemovidos = 0;
    let totalFalhas = 0;

    for (const grupo of duplicados) {
        console.log(`\n🔑 Grupo: ${grupo.key}`);
        console.log(`   Manter: ${grupo.manter._id} (criado em ${grupo.manter.createdAt})`);

        for (const item of grupo.remover) {
            console.log(`   🗑️  Removendo: ${item._id} (criado em ${item.createdAt})`);
            try {
                await api.delete(`/api/v2/appointments/${item._id}`);
                console.log(`      ✅ Removido`);
                totalRemovidos++;
            } catch (err) {
                console.error(`      ❌ Erro ${err.response?.status}: ${err.response?.data?.error || err.message}`);
                totalFalhas++;
            }
            // Delay para não sobrecarregar a API
            await new Promise(r => setTimeout(r, 300));
        }
    }

    return { totalRemovidos, totalFalhas };
}

async function main() {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🧹 LIMPEZA DE CONVERTED DUPLICADOS");
    console.log("═══════════════════════════════════════════════════════\n");

    try {
        const converted = await buscarConverted();

        if (converted.length === 0) {
            console.log("\n✅ Nenhum appointment 'converted' encontrado.");
            return;
        }

        const duplicados = agruparDuplicados(converted);
        console.log(`\n📊 Grupos duplicados encontrados: ${duplicados.length}`);

        if (duplicados.length === 0) {
            console.log("✅ Nenhum duplicado encontrado.");
            return;
        }

        // Mostra preview
        let totalParaRemover = 0;
        for (const g of duplicados) {
            console.log(`\n   ${g.key}:`);
            console.log(`      Manter:  ${g.manter._id}`);
            for (const r of g.remover) {
                console.log(`      Remover: ${r._id}`);
                totalParaRemover++;
            }
        }

        console.log(`\n⚠️  Total para remover: ${totalParaRemover}`);
        console.log("⚠️  Pressione Ctrl+C em 5 segundos para cancelar...");
        await new Promise(r => setTimeout(r, 5000));

        const { totalRemovidos, totalFalhas } = await deletarDuplicados(duplicados);

        console.log("\n═══════════════════════════════════════════════════════");
        console.log("📊 RESUMO");
        console.log("═══════════════════════════════════════════════════════");
        console.log(`   Removidos: ${totalRemovidos}`);
        console.log(`   Falhas:    ${totalFalhas}`);
        console.log("═══════════════════════════════════════════════════════");

    } catch (err) {
        console.error("\n❌ Erro fatal:", err.message);
        process.exit(1);
    }
}

main();
