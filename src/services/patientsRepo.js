
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
