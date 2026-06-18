
import api from "./api";

/**
 * Busca a lista completa de pacientes do CRM
 * @returns {Promise<Array>} Lista de pacientes
 */
export const fetchPatients = async () => {
    try {
        const response = await api.get('/api/patients', {
            params: {
                limit: 1000 // Busca uma quantidade razoável para o autocomplete
            }
        });

        // Retorna a lista de pacientes formatada
        return response.data || [];
    } catch (error) {
        console.error('[fetchPatients] Erro:', error.response?.data || error.message);
        
        // Se for erro de autenticação, propaga o erro para o frontend
        if (error.response?.status === 401 || error.response?.data?.code === 'INVALID_TOKEN') {
            console.error('❌ [fetchPatients] Token inválido! Verifique o VITE_API_TOKEN no .env');
            throw new Error('INVALID_TOKEN');
        }
        
        return [];
    }
};

/**
 * Busca pacientes por nome/CPF/telefone no backend (accent-insensitive)
 * @param {string} term - Termo de busca
 * @returns {Promise<Array>} Lista de pacientes encontrados
 */
export const searchPatients = async (term) => {
    try {
        const response = await api.get('/api/patients', {
            params: { search: term, limit: 10 }
        });
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('[searchPatients] Erro:', error.response?.data || error.message);
        return [];
    }
};

/**
 * Atualiza dados básicos do paciente no CRM
 * @param {string} patientId - ID do paciente
 * @param {Object} data - Dados a atualizar (phone, email, birthDate, etc)
 * @returns {Promise<Object>} Resposta do backend
 */
export const updatePatient = async (patientId, data) => {
    try {
        const response = await api.put(`/api/patients/${patientId}`, data);
        return response.data;
    } catch (error) {
        console.error('[updatePatient] Erro:', error.response?.data || error.message);
        throw error;
    }
};
