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
    console.log("📥 [preAppointmentsRepo] approvePreAppointment chamado");
    console.log("📥 [preAppointmentsRepo] ID:", id);
    console.log("📥 [preAppointmentsRepo] data.patientId:", data.patientId);
    console.log("📥 [preAppointmentsRepo] data.isNewPatient:", data.isNewPatient);
    console.log("📥 [preAppointmentsRepo] URL:", `/api/pre-agendamento/${id}/importar`);
    
    try {
        const response = await api.post(`/api/pre-agendamento/${id}/importar`, data);
        console.log("✅ [preAppointmentsRepo] Sucesso:", response.data);
        return response.data;
    } catch (error) {
        console.error('❌ [preAppointmentsRepo] Erro ao aprovar pré-agendamento:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Atualiza um pré-agendamento existente (sem importar/confirmar)
 * @param {string} id 
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
export const updatePreAppointment = async (id, data) => {
    console.log("📝 [preAppointmentsRepo] updatePreAppointment chamado");
    console.log("📝 [preAppointmentsRepo] ID:", id);
    
    try {
        // Usar PATCH conforme definido na rota do backend
        const response = await api.patch(`/api/pre-agendamento/${id}`, data);
        console.log("✅ [preAppointmentsRepo] Atualizado:", response.data);
        return response.data;
    } catch (error) {
        console.error('❌ [preAppointmentsRepo] Erro ao atualizar pré-agendamento:', error.response?.data || error.message);
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

/**
 * Cancela um pré-agendamento (apenas altera status para 'cancelado')
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const cancelPreAppointment = async (id) => {
    try {
        const response = await api.post(`/api/pre-agendamento/${id}/cancelar`);
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao cancelar pré-agendamento:', error);
        throw error;
    }
};
