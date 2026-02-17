
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MONGO URI Hardcoded para teste rápido se .env falhar
const MONGO_URI = "mongodb+srv://kaduart:%40Soundcar10@cluster0.g2c3sdk.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";


const appointmentSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: String,
    // ... outros campos simplificados para teste
}, { strict: false }); // Strict false para aceitar campos extras do schema real

const Appointment = mongoose.model('Appointment', appointmentSchema);
const Doctor = mongoose.model('Doctor', new mongoose.Schema({ fullName: String }));
const Patient = mongoose.model('Patient', new mongoose.Schema({ fullName: String, phone: String }));

async function testMongo() {
    console.log('🔌 Conectando ao MongoDB...');
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado!');

        // Buscar Médico Suzane
        const doctor = await Doctor.findOne({ fullName: /Suzane/i });
        if (!doctor) {
            console.error('❌ Médico Suzane não encontrado no banco!');
            return;
        }
        console.log(`👩‍⚕️ Médico encontrado: ${doctor.fullName} (${doctor._id})`);

        // Buscar ou Criar Paciente Teste
        let patient = await Patient.findOne({ fullName: "Paciente Teste Direto" });
        if (!patient) {
            patient = await Patient.create({ fullName: "Paciente Teste Direto", phone: "00000000000" });
            console.log(`👤 Paciente criado: ${patient._id}`);
        } else {
            console.log(`👤 Paciente encontrado: ${patient._id}`);
        }

        // Criar Agendamento Direto
        const appt = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            date: "2025-12-25",
            time: "14:00",
            status: "scheduled_via_migration",
            externalId: "teste-direto-001"
        });

        console.log(`✅ Agendamento criado direto no Mongo: ${appt._id}`);

    } catch (err) {
        console.error('💥 Erro:', err);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado.');
    }
}

testMongo();
