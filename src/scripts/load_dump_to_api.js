
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const API_URL = 'http://localhost:5000';
const API_TOKEN = 'agenda_export_token_fono_inova_2025_secure_abc123';

// Mapa de Correção de Nomes aprimorado
const DOCTOR_MAP = {
    "Suzane de Moraes": "Suzane",
    "Micaelly": "Micaelly",
    "Dra. Suzane": "Suzane",
    "Fonoaudióloga": "Fonoaudióloga",
    "Lorrane": "Lorrane", // Deixa dar 400 rápido
    "Lorraine": "Lorrane",
    "Lorrany Siqueira": "Lorrane", // WORKAROUND: Mapear para nome que dá 400 rápido em vez de travar
    "Fonoaudiólogas": "Fonoaudióloga"
};

async function load() {
    const dumpPath = path.resolve(__dirname, 'appointments_dump.json');
    if (!fs.existsSync(dumpPath)) {
        console.error('❌ Arquivo dump não encontrado!');
        process.exit(1);
    }

    const rawData = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));

    // REMOVIDO FILTRO DEBUG
    // rawData = rawData.filter(d => d.firebaseId === '-OXOR6bMhHM9tCjlx4l3');

    console.log(`📦 Carregado ${rawData.length} registros do JSON.`);

    let successCount = 0;
    let errorCount = 0;

    for (const [index, raw] of rawData.entries()) {
        const firebaseId = raw.firebaseId;

        // --- Mapeamento ---
        let profName = raw.professional;
        if (DOCTOR_MAP[profName]) {
            profName = DOCTOR_MAP[profName];
        } else {
            // Tentar limpar
            profName = profName.replace(/^(Dra?\.?)\s+/i, '').trim();
        }

        let phone = raw.phone;
        if (!phone || phone.length < 8) phone = "00000000000";
        phone = phone.replace(/\D/g, "");

        const payload = {
            externalId: firebaseId,
            firebaseAppointmentId: firebaseId,
            patientInfo: {
                fullName: raw.patient || 'Paciente Desconhecido',
                phone: phone,
                birthDate: raw.birthDate,
                email: raw.email,
                cpf: raw.cpf
            },
            responsible: raw.responsible,
            professionalName: profName,
            specialty: raw.specialty,
            date: raw.date,
            time: raw.time,
            status: mapStatus(raw.status),
            observations: raw.observations,
            crm: {
                serviceType: raw.crm?.serviceType || 'evaluation',
                sessionType: raw.crm?.sessionType || 'avaliacao',
                paymentMethod: mapPaymentMethod(raw.crm?.paymentMethod),
                paymentAmount: Number(raw.crm?.paymentAmount || 0),
                usePackage: Boolean(raw.crm?.usePackage),
            }
        };

        // --- Envio ---
        try {
            process.stdout.write(`\rProcessando ${index + 1}/${rawData.length}: ${firebaseId}... `);
            // DEBUG EXTREMO
            // console.log('\n--- PAYLOAD START ---');
            // console.log(JSON.stringify(payload));
            // console.log('--- PAYLOAD END ---');

            const response = await axios.post(`${API_URL}/api/import-from-agenda/criar-e-confirmar`, payload, {
                headers: { 'Authorization': `Bearer ${API_TOKEN}` },
                timeout: 5000 // 5s timeout (FAIL FAST)
            });

            if (response.data.success || response.data.appointmentId || response.data.preAgendamentoId) {
                process.stdout.write('✅ OK');
                successCount++;
            } else {
                process.stdout.write('⚠️ WARN');
                errorCount++;
            }
            // Delay pequeno
            await new Promise(r => setTimeout(r, 20));

        } catch (err) {
            process.stdout.write('❌ ERR');
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            // console.error(`\n❌ [ERRO] ${firebaseId}: ${msg}`);
            // Logar apenas se não for Doctor Not Found (para reduzir ruído se muitos falharem)
            if (!msg.includes('não encontrado no CRM')) {
                console.error(` -> ${msg}`);
            } else {
                console.error(` -> Médico "${profName}" n/a`);
            }
            errorCount++;
        }
    }

    console.log('\n\n🏁 Carga Finalizada!');
    console.log(`✅ Sucesso: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
}

function mapStatus(firebaseStatus) {
    if (!firebaseStatus) return 'pending';
    const s = firebaseStatus.toLowerCase();
    if (s === 'confirmado') return 'confirmed';
    if (s === 'pendente') return 'pending';
    if (s === 'cancelado') return 'canceled';
    if (s === 'vaga') return 'pending';
    return 'pending';
}

function mapPaymentMethod(method) {
    if (!method) return 'pix';
    const map = {
        'pix': 'pix',
        'cash': 'dinheiro',
        'credit_card': 'cartao_credito',
        'debit_card': 'cartao_debito',
        'dinheiro': 'dinheiro',
        'cartão': 'cartao_credito',
        'transferencia': 'transferencia_bancaria'
    };
    return map[method] || 'outro';
}

load();
