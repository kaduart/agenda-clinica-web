/**
 * 🔄 RESTAURAR SESSÃO DE PACOTE EXCLUÍDA ACIDENTALMENTE
 *
 * Dados do appointment excluído:
 * - appointmentId antigo: 69cd36f9e706da54fdf0e370
 * - patientId: 68f2454f5811d9c02f263fb3
 * - paciente: Ravi Francisco Moreira Andrade
 * - profissional: Lorrany Siqueira Marques (doctorId: 684072213830f473da1b0b0b)
 * - especialidade: fonoaudiologia
 * - data: 2026-04-17
 * - hora: 10:00
 * - valor: 150
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

async function restaurar() {
    console.log("🚀 Iniciando restauração da sessão do pacote...\n");

    const patientId = "68f2454f5811d9c02f263fb3";
    const doctorId = "684072213830f473da1b0b0b";
    const date = "2026-04-17";
    const time = "10:00";
    const specialty = "fonoaudiologia";
    const sessionValue = 150;
    const patientName = "Ravi Francisco Moreira Andrade";
    const professionalName = "Lorrany Siqueira Marques";

    try {
        // ─── PASSO 1: Criar pré-agendamento ───
        console.log("📋 Passo 1/2: Criando pré-agendamento...");
        const prePayload = {
            patientId: patientId,
            patientInfo: {
                fullName: patientName,
                phone: "",
                birthDate: null,
                email: null
            },
            preferredDate: date,
            preferredTime: time,
            specialty: specialty,
            notes: "Restaurado após exclusão acidental da sessão do pacote",
            professionalName: professionalName,
            doctorId: doctorId
        };

        const preRes = await api.post("/api/v2/pre-appointments", prePayload);
        const preData = preRes.data;
        const preId = preData?.data?.preAgendamentoId || preData?.preAgendamentoId || preData?.appointmentId || preData?.data?.appointmentId;

        if (!preId) {
            console.error("❌ Pré-agendamento criado mas ID não retornado:", preData);
            process.exit(1);
        }

        console.log(`   ✅ Pré-agendamento criado: ${preId}\n`);

        // ─── PASSO 2: Confirmar pré-agendamento ───
        console.log("📋 Passo 2/2: Confirmando pré-agendamento (criando appointment)...");
        const confirmPayload = {
            doctorId: doctorId,
            date: date,
            time: time,
            sessionValue: sessionValue,
            paymentMethod: "pix",
            serviceType: "session",
            notes: "Restaurado após exclusão acidental da sessão do pacote",
            patientId: patientId,
            isNewPatient: false,
            patientName: patientName,
            birthDate: null,
            phone: null,
            email: null,
            responsible: null,
            crm: {
                serviceType: "session",
                sessionType: "fonoaudiologia",
                paymentMethod: "pix",
                paymentAmount: sessionValue,
                usePackage: true
            }
        };

        const confirmRes = await api.post(`/api/v2/pre-appointments/${preId}/confirm`, confirmPayload);
        const confirmData = confirmRes.data;
        const newAppointmentId = confirmData?.data?.appointmentId || confirmData?.appointmentId;

        console.log(`   ✅ Appointment confirmado!\n`);
        console.log("═══════════════════════════════════════════════════");
        console.log("🎉 RESTAURAÇÃO CONCLUÍDA COM SUCESSO!");
        console.log("═══════════════════════════════════════════════════");
        console.log(`   Pré-agendamento ID : ${preId}`);
        console.log(`   Appointment ID     : ${newAppointmentId || 'ver resposta completa'}`);
        console.log(`   Data/Hora          : ${date} às ${time}`);
        console.log(`   Paciente           : ${patientName}`);
        console.log(`   Profissional       : ${professionalName}`);
        console.log("═══════════════════════════════════════════════════");
        console.log("\n📌 Agora você precisa atualizar o pacote");
        console.log(`   para vincular o novo appointmentId (${newAppointmentId})`);
        console.log(`   à sessão do dia ${date} no pacote.`);
        console.log("   Endpoint: PATCH /api/v2/packages/{packageId}/sessions/{sessionId}");

    } catch (err) {
        console.error("\n❌ ERRO NA RESTAURAÇÃO:");
        if (err.response) {
            console.error(`   Status: ${err.response.status}`);
            console.error(`   Dados:`, JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(`   ${err.message}`);
        }
        process.exit(1);
    }
}

restaurar();
