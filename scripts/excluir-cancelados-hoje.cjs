/**
 * 🗑️ EXCLUIR AGENDAMENTOS CANCELADOS A PARTIR DE HOJE
 * Pacientes: Gabriel Alves Leite, Kauana Queiroz Gomes Naves
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

const HOJE = '2026-04-17';
const PACIENTES = [
    { id: '699865f57c92d32c1fd432bc', nome: 'Gabriel Alves Leite' },
    { id: '699869177c92d32c1fd43f86', nome: 'Kauana Queiroz Gomes Naves' }
];

async function main() {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🗑️  EXCLUSÃO DE CANCELADOS A PARTIR DE " + HOJE);
    console.log("═══════════════════════════════════════════════════════\n");

    for (const p of PACIENTES) {
        console.log(`\n--- ${p.nome} ---`);

        // Buscar appointments
        const res = await api.get('/api/v2/appointments', {
            params: { patientId: p.id, startDate: HOJE, limit: 500 }
        });
        const apps = res.data?.data?.appointments || res.data?.appointments || [];

        const cancelados = apps.filter(a => {
            const s = (a.operationalStatus || a.status || '').toLowerCase();
            return s.includes('cancel');
        });

        console.log(`   Cancelados encontrados: ${cancelados.length}`);

        let excluidos = 0;
        let falhas = 0;

        for (const a of cancelados) {
            const id = a._id || a.id;
            const data = (a.date || a.preferredDate || '').split('T')[0];
            const hora = a.time || a.preferredTime || '?';
            const spec = a.specialty || '?';

            try {
                await api.delete(`/api/v2/appointments/${id}`);
                console.log(`   ✅ ${data} ${hora} | ${spec} | ${id}`);
                excluidos++;
            } catch (err) {
                console.error(`   ❌ ${data} ${hora} | ${spec} | ${id} | Erro: ${err.response?.status || err.message}`);
                falhas++;
            }

            // Delay para não sobrecarregar a API
            await new Promise(r => setTimeout(r, 300));
        }

        console.log(`   Resumo: ${excluidos} excluídos, ${falhas} falhas`);
    }

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("✅ PROCESSO CONCLUÍDO");
    console.log("═══════════════════════════════════════════════════════");
}

main().catch(err => {
    console.error("Erro fatal:", err);
    process.exit(1);
});
