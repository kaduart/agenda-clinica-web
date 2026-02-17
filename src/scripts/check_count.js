
import mongoose from 'mongoose';

const MONGO_URI = "mongodb+srv://kaduart:%40Soundcar10@cluster0.g2c3sdk.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

const appointmentSchema = new mongoose.Schema({}, { strict: false });
const Appointment = mongoose.model('Appointment', appointmentSchema);

async function countAppointments() {
    try {
        console.log('🔌 Conectando...');
        await mongoose.connect(MONGO_URI);
        const count = await Appointment.countDocuments({});
        console.log(`📊 Total de Agendamentos no Banco: ${count}`);

        // Verificar um recente importado via script (que deve ter externalId)
        const sample = await Appointment.findOne({ externalId: { $exists: true } }).sort({ _id: -1 });
        if (sample) {
            console.log('🔍 Último importado:', JSON.stringify(sample, null, 2));
        } else {
            console.log('⚠️ Nenhum agendamento com externalId encontrado.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

countAppointments();
