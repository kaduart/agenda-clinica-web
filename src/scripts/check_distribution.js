
import mongoose from 'mongoose';

const MONGO_URI = "mongodb+srv://kaduart:%40Soundcar10@cluster0.g2c3sdk.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

const appointmentSchema = new mongoose.Schema({
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }
}, { strict: false });

const doctorSchema = new mongoose.Schema({ fullName: String });

const Appointment = mongoose.model('Appointment', appointmentSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);

async function checkDistribution() {
    try {
        console.log('🔌 Conectando...');
        await mongoose.connect(MONGO_URI);

        const doctors = await Doctor.find({});
        const doctorMap = {};
        doctors.forEach(d => doctorMap[d._id] = d.fullName);

        console.log('📥 Baixando todos os agendamentos...');
        const appointments = await Appointment.find({}, 'doctor').lean();

        const counts = {};
        let nullDoctor = 0;

        appointments.forEach(a => {
            if (!a.doctor) {
                nullDoctor++;
            } else {
                counts[a.doctor] = (counts[a.doctor] || 0) + 1;
            }
        });

        console.log('\n--- DISTRIBUIÇÃO POR MÉDICO ---');
        let total = 0;
        for (const [docId, count] of Object.entries(counts)) {
            const name = doctorMap[docId] || `⚠️ ID DESCONHECIDO (${docId})`;
            console.log(`${name}: ${count}`);
            total += count;
        }
        if (nullDoctor > 0) console.log(`⚠️ SEM MÉDICO: ${nullDoctor}`);
        console.log('------------------------------');
        console.log(`TOTAL PROCESSADO: ${appointments.length}`);


    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkDistribution();
