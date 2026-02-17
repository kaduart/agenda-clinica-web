
import mongoose from 'mongoose';

// URI extraída do backend .env
const MONGO_URI = "mongodb+srv://kaduart:%40Soundcar10@cluster0.g2c3sdk.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

// Schema mínimo para Doctor
const doctorSchema = new mongoose.Schema({
    fullName: String,
    specialty: String,
    active: Boolean
}, { strict: false });

const Doctor = mongoose.model('Doctor', doctorSchema);

async function checkDoctors() {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado!');

        const doctors = await Doctor.find({});
        console.log('\n--- LISTA DE MÉDICOS NO BANCO ---');
        doctors.forEach(d => {
            console.log(`ID: ${d._id} | Nome: "${d.fullName}" | Especialidade: ${d.specialty} | Ativo: ${d.active}`);
        });
        console.log('---------------------------------');

    } catch (err) {
        console.error('💥 Erro:', err);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado.');
    }
}

checkDoctors();
