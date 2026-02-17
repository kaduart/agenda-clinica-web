import api from './api';

/**
 * Busca pré-agendamentos filtrados
 * @param {Object} filters 
 * @returns {Promise<Array>}
 */
export const fetchPreAppointments = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.specialty) params.append('specialty', filters.specialty);
        if (filters.preferredDate) {
            params.append('from', filters.preferredDate);
            params.append('to', filters.preferredDate);
        }

        const response = await api.get(`/api/pre-agendamento?${params.toString()}`);
        return response.data.data || [];
    } catch (error) {
        console.error('❌ Erro ao buscar pré-agendamentos:', error);
        return [];
    }
};

/**
 * Importa/Aprova um pré-agendamento, convertendo-o em agendamento real
 * @param {string} id 
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
export const approvePreAppointment = async (id, data) => {
    try {
        const response = await api.post(`/api/pre-agendamento/${id}/importar`, data);
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao aprovar pré-agendamento:', error);
        throw error;
    }
};

/**
 * Descarta um pré-agendamento
 * @param {string} id 
 * @param {string} reason 
 * @returns {Promise<Object>}
 */
export const discardPreAppointment = async (id, reason) => {
    try {
        const response = await api.post(`/api/pre-agendamento/${id}/descartar`, { reason });
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao descartar pré-agendamento:', error);
        throw error;
    }
};
