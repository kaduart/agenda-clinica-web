
import api from "./api";

/**
 * Busca a lista completa de pacientes do CRM
 * @returns {Promise<Array>} Lista de pacientes
 */
export const fetchPatients = async () => {
    try {
        console.log("👥 [patientsRepo] Buscando lista de pacientes...");
        const response = await api.get('/api/patients', {
            params: {
                limit: 1000 // Busca uma quantidade razoável para o autocomplete
            }
        });

        // Retorna a lista de pacientes formatada
        return response.data || [];
    } catch (error) {
        console.error('[fetchPatients] Erro:', error);
        return [];
    }
};
