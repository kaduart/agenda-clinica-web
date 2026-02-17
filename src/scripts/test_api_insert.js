
import axios from 'axios';

const API_URL = 'http://localhost:5000';
const API_TOKEN = 'agenda_export_token_fono_inova_2025_secure_abc123';

async function testInsert() {
    console.log("🧪 Testando inserção única na API...");


    // Payload dummy válido baseado no schema
    const payload = { "externalId": "-OXOR6bMhHM9tCjlx4l3", "firebaseAppointmentId": "-OXOR6bMhHM9tCjlx4l3", "patientInfo": { "fullName": "Leandro Fernandes", "phone": "00000000000" }, "responsible": "Larice", "professionalName": "Lorrany Siqueira", "specialty": "Fonoaudiologia", "date": "2025-08-19", "time": "18:00", "status": "pending", "observations": "ss", "crm": { "serviceType": "evaluation", "sessionType": "avaliacao", "paymentMethod": "pix", "paymentAmount": 0, "usePackage": false } };

    try {
        const res = await axios.post(`${API_URL}/api/import-from-agenda/criar-e-confirmar`, payload, {
            headers: { 'Authorization': `Bearer ${API_TOKEN}` },
            timeout: 10000
        });
        console.log("✅ Sucesso:", res.status, res.data);
    } catch (err) {
        console.error("❌ Erro:", err.message);
        if (err.response) {
            console.error("Dados do erro:", err.response.data);
            console.error("Status:", err.response.status);
        }
    }
}

testInsert();
