
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURAÇÃO
const MONGO_URI = "mongodb+srv://kaduart:%40Soundcar10@cluster0.g2c3sdk.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

mongoose.set('debug', true);

// MAPA DE MÉDICOS (Corrigido após validação no banco)
// MAPA DE MÉDICOS (Corrigido após validação no banco)
const DOCTOR_MAP = {
    // Suzane
    "Suzane de Moraes": "Suzane de Morais Soares",
    "Dra. Suzane": "Suzane de Morais Soares",
    "Suzane": "Suzane de Morais Soares",

    // Mikaelly
    "Micaelly": "Mikaelly da Silva Sousa",
    "Fonoaudióloga": "Mikaelly da Silva Sousa",
    "Fonoaudiólogas": "Mikaelly da Silva Sousa",

    // Lorrany
    "Lorrany Siqueira": "Lorrany Siqueira Marques",
    "Lorrane": "Lorrany Siqueira Marques",
    "Lorrane fono": "Lorrany Siqueira Marques",
    "lorrany": "Lorrany Siqueira Marques",

    // Outros Exatos
    "Bárbara Martins": "Bárbara Martins Rodrigues",
    "Iara Hellen": "Iara Hellen Da Costa",
    "Lauro Jorge Dário": "Lauro Jorge Dário",
    "Luiz Henrique": "Luis Henrique",
    "Maria Cristina": "Maria cristina",
    "Maryana": "Mayra Magda Mendes Oliveira", // Suposição baseada em similaridade fonética/contexto
    "Myrnna": "Mayra Magda Mendes Oliveira",  // Suposição
    "Mayra": "Mayra Magda Mendes Oliveira",
    "Tatiana Celuta": "Tatiana Celuta Peres",
    "Tatiana Celuta ": "Tatiana Celuta Peres",
    "Thayná Miranda": "Thayna Miranda",
    "Vinicius": "Vinicius Oliveira Teodoro",
    "Victoria Amorim": "Victoria Amorim"
};

// SCHEMAS SIMPLIFICADOS (Mas compatíveis)
const doctorSchema = new mongoose.Schema({
    fullName: String,
    specialty: String,
    active: Boolean
}, { strict: false });

const patientSchema = new mongoose.Schema({
    fullName: String,
    phone: String,
    cpf: String,
    email: String,
    birthDate: String
}, { strict: false });

const appointmentSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    externalId: String, // ID do Firebase
    firebaseAppointmentId: String,
    date: String, // YYYY-MM-DD
    time: String, // HH:mm
    status: String,
    serviceType: String,
    notes: String,
    crm: Object
}, { strict: false });

const Doctor = mongoose.model('Doctor', doctorSchema);
const Patient = mongoose.model('Patient', patientSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);

// Mapeamento de Status
function mapStatus(firebaseStatus) {
    if (!firebaseStatus) return 'pending';
    const s = firebaseStatus.toLowerCase();
    if (s === 'confirmado') return 'confirmed';
    if (s === 'pendente') return 'pending';
    if (s === 'cancelado') return 'canceled';
    if (s === 'vaga') return 'pending';
    return 'pending';
}

async function run() {
    console.log('🚀 Iniciando Carga DIRETA no MongoDB...');

    // Ler Dump
    const dumpPath = path.resolve(__dirname, 'appointments_dump.json');
    if (!fs.existsSync(dumpPath)) {
        console.error('❌ Dump não encontrado!');
        process.exit(1);
    }
    const rawData = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));
    console.log(`📦 Lidos ${rawData.length} registros do JSON.`);

    // Conectar
    try {
        process.stdout.write('🔌 Conectando ao MongoDB...');
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ Conectado!');

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const [index, raw] of rawData.entries()) {
            const firebaseId = raw.firebaseId;
            process.stdout.write(`\rProcessando ${index + 1}/${rawData.length}: ${firebaseId}... `);

            try {
                // 1. Verificar Duplicidade
                const exists = await Appointment.findOne({ externalId: firebaseId });
                if (exists) {
                    process.stdout.write('⏩ JÁ EXISTE');
                    skipCount++;
                    continue;
                }

                // 2. Resolver Médico
                let profName = raw.professional;
                if (DOCTOR_MAP[profName]) profName = DOCTOR_MAP[profName];
                profName = profName.replace(/^(Dra?\.?)\s+/i, '').trim();

                let doctor = await Doctor.findOne({
                    fullName: { $regex: new RegExp(`^${profName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') }
                });

                // Fallback para "match parcial" se não achar exato
                if (!doctor) {
                    doctor = await Doctor.findOne({
                        fullName: { $regex: new RegExp(profName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
                    });
                }

                if (!doctor) {
                    process.stdout.write(`⚠️ MÉDICO N/A (${profName})`);
                    errorCount++;
                    continue;
                }

                // 3. Resolver Paciente
                // Tenta pelo nome exato primeiro
                let patientName = raw.patientInfo?.fullName || "Paciente Desconhecido";
                let patient = await Patient.findOne({
                    fullName: { $regex: new RegExp(`^${patientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                });

                // Tenta pelo CPF se tiver
                if (!patient && raw.patientInfo?.cpf) {
                    patient = await Patient.findOne({ cpf: raw.patientInfo.cpf });
                }

                // Se não achar, CRIA
                if (!patient) {
                    // Normalizar telefone
                    let phone = raw.patientInfo?.phone || "00000000000";
                    phone = phone.replace(/\D/g, "");
                    if (phone.length < 8) phone = "00000000000";

                    patient = await Patient.create({
                        fullName: patientName,
                        phone: phone,
                        email: raw.patientInfo?.email || "",
                        birthDate: raw.patientInfo?.birthDate || "",
                        cpf: raw.patientInfo?.cpf || null
                    });
                    // process.stdout.write(` (Novo Paciente) `);
                }

                // 4. Criar Agendamento
                await Appointment.create({
                    patient: patient._id,
                    doctor: doctor._id,
                    externalId: firebaseId,
                    firebaseAppointmentId: firebaseId,
                    date: raw.date,
                    time: raw.time,
                    status: mapStatus(raw.status),
                    observations: raw.observations,
                    crm: {
                        serviceType: raw.crm?.serviceType || 'evaluation',
                        sessionType: raw.crm?.sessionType || 'avaliacao',
                        paymentMethod: raw.crm?.paymentMethod || 'pix',
                        paymentAmount: Number(raw.crm?.paymentAmount || 0),
                        usePackage: Boolean(raw.crm?.usePackage),
                    }
                });

                process.stdout.write('✅ OK');
                successCount++;

            } catch (err) {
                process.stdout.write(`❌ ERRO: ${err.message}`);
                errorCount++;
            }

            // Pequeno delay para não saturar I/O
            //await new Promise(r => setTimeout(r, 5));
        }

        console.log('\n\n🎉 Migração Direta Finalizada!');
        console.log(`✅ Sucesso: ${successCount}`);
        console.log(`⏩ Já existiam: ${skipCount}`);
        console.log(`❌ Falhas: ${errorCount}`);

    } catch (err) {
        console.error('\n💥 Erro Fatal:', err);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado.');
    }
}

run();
