// Versão Adaptada: Usa Client SDK (não precisa de serviceAccountKey.json pois as regras estão abertas)
import { initializeApp, deleteApp } from "firebase/app";
import { getDatabase, ref, get, child } from "firebase/database";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBcAvxbMqJiSVkJjejadxZfRv6jI0myNbk",
    authDomain: "agenda-clinica-fono-inova.firebaseapp.com",
    databaseURL: "https://agenda-clinica-fono-inova-default-rtdb.firebaseio.com",
    projectId: "agenda-clinica-fono-inova",
    storageBucket: "agenda-clinica-fono-inova.firebasestorage.app",
    messagingSenderId: "16411552752",
    appId: "1:16411552752:web:f338a5ea8c0c3577d44b35",
};

// Inicializar Firebase Client
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function extractConfig() {
    console.log('🚀 Iniciando EXTRAÇÃO Firebase -> JSON...');

    try {
        console.log('📥 Lendo agendamentos do Firebase...');
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, 'appointments'));

        if (!snapshot.exists()) {
            console.log('⚠️ Nenhum agendamento encontrado no Firebase.');
            process.exit(0);
            return;
        }

        const appointments = snapshot.val();
        const entries = Object.entries(appointments); // [id, rawData]
        console.log(`📦 Total de agendamentos encontrados: ${entries.length}`);

        const dumpPath = path.resolve(__dirname, 'appointments_dump.json');

        // Transformar objeto { id: {} } em array [{ id, ... }] para e facilitar
        const dataToSave = entries.map(([id, data]) => ({ ...data, firebaseId: id }));

        fs.writeFileSync(dumpPath, JSON.stringify(dataToSave, null, 2));
        console.log(`💾 Dump salvo em: ${dumpPath}`);

        await deleteApp(app);
        console.log('✅ Extração concluída com sucesso!');
        process.exit(0);

    } catch (error) {
        console.error('\n💥 Erro na extração:', error);
        process.exit(1);
    }
}

extractConfig();
