/**
 * 🗑️ EXCLUIR AGENDAMENTOS CANCELADOS A PARTIR DE HOJE
 * Pacientes: Gabriel Alves Leite, Kauana Queiroz Gomes Naves
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';
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
const PACIENTES_ALVO = [
    'Gabriel Alves Leite',
    'Kauana Queiroz Gomes Naves'
];

async function buscarAppointmentsCancelados() {
    console.log(`📋 Buscando appointments cancelados a partir de ${HOJE}...\n`);
    const res = await api.get('/api/v2/appointments', {
        params: { startDate: HOJE, limit: 500 }
    });
    const appointments = res.data?.data?.appointments || res.data?.appointments || [];
    console.log(`   Total de appointments encontrados: ${appointments.length}`);

    const cancelados = appointments.filter(a => {
        const nome = a.patient?.fullName || a.patientName || '';
        const status = a.operationalStatus || a.status || '';
        const matchPaciente = PACIENTES_ALVO.some(p => nome.toLowerCase().includes(p.toLowerCase()));
        const matchCancelado = status.toLowerCase().includes('cancel') || status.toLowerCase().includes('canceled');
        return matchPaciente && matchCancelado;
    });

    console.log(`   Cancelados dos pacientes alvo: ${cancelados.length}\n`);
    return cancelados;
}

async function buscarPacotes(patientId) {
    try {
        const res = await api.get('/api/v2/packages', { params: { patientId, limit: 100 } });
        return res.data?.data?.packages || res.data?.packages || [];
    } catch (e) {
        return [];
    }
}

async function excluirAppointment(appointment) {
    const id = appointment._id || appointment.id;
    const nome = appointment.patient?.fullName || appointment.patientName || '';
    const data = appointment.date || appointment.preferredDate || '?';
    const hora = appointment.time || appointment.preferredTime || '?';
    const especialidade = appointment.specialty || '';

    console.log(`🗑️  Excluindo: ${nome} | ${data} ${hora} | ${especialidade}`);
    console.log(`   ID: ${id}`);

    try {
        await api.delete(`/api/v2/appointments/${id}`);
        console.log(`   ✅ Appointment excluído`);
    } catch (err) {
        console.error(`   ❌ Erro ao excluir appointment: ${err.response?.status || err.message}`);
        return { appointmentDeleted: false };
    }

    // Tentar sincronizar com pacote
    const patientId = appointment.patient?._id || appointment.patientId;
    if (patientId) {
        const pacotes = await buscarPacotes(patientId);
        for (const pkg of pacotes) {
            const session = (pkg.sessions || []).find(s =>
                s.appointmentId === id ||
                (s.date && data && new Date(s.date).toISOString().startsWith(data) && s.time === hora)
            );
            if (session?.sessionId) {
                const pkgId = pkg._id || pkg.packageId;
                try {
                    await api.delete(`/api/v2/packages/${pkgId}/sessions/${session.sessionId}`);
                    console.log(`   ✅ Sessão removida do pacote ${pkgId}`);
                    return { appointmentDeleted: true, sessionDeleted: true };
                } catch (delErr) {
                    try {
                        await api.patch(`/api/v2/packages/${pkgId}/sessions/${session.sessionId}/cancel`, {
                            reason: 'Cancelado - exclusão agenda'
                        });
                        console.log(`   ✅ Sessão cancelada no pacote ${pkgId}`);
                        return { appointmentDeleted: true, sessionCanceled: true };
                    } catch (cancelErr) {
                        console.warn(`   ⚠️  Sessão no pacote NÃO atualizada. Ajustar manualmente.`);
                        console.warn(`      Package: ${pkgId}, Session: ${session.sessionId}`);
                    }
                }
            }
        }
    }

    return { appointmentDeleted: true };
}

async function main() {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🗑️  EXCLUSÃO DE AGENDAMENTOS CANCELADOS");
    console.log("═══════════════════════════════════════════════════════");
    console.log(`Data de corte: ${HOJE}`);
    console.log(`Pacientes: ${PACIENTES_ALVO.join(', ')}\n`);

    const cancelados = await buscarAppointmentsCancelados();

    if (cancelados.length === 0) {
        console.log("ℹ️  Nenhum agendamento cancelado encontrado para os pacientes.");
        return;
    }

    console.log("───────────────────────────────────────────────────────");
    let excluidos = 0;
    let falhas = 0;

    for (const appt of cancelados) {
        const resultado = await excluirAppointment(appt);
        if (resultado.appointmentDeleted) excluidos++;
        else falhas++;
        console.log("");
    }

    console.log("═══════════════════════════════════════════════════════");
    console.log("📊 RESUMO");
    console.log("═══════════════════════════════════════════════════════");
    console.log(`   Excluídos: ${excluidos}`);
    console.log(`   Falhas:    ${falhas}`);
    console.log("═══════════════════════════════════════════════════════");
}

main().catch(err => {
    console.error("Erro fatal:", err);
    process.exit(1);
});
