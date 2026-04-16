import * as v2 from "../api/v2/agendaV2Client";

/**
 * Busca pré-agendamentos filtrados
 */
export const fetchPreAppointments = async (filters = {}) => {
    try {
        const data = await v2.listPreAppointments(filters);
        return data || [];
    } catch (error) {
        console.error('❌ Erro ao buscar pré-agendamentos:', error);
        return [];
    }
};

/**
 * Cria um novo pré-agendamento
 */
export const createPreAppointment = async (data) => {
    try {
        const response = await v2.createPreAppointment(data);
        console.log("✅ [preAppointmentsRepo] Pré-agendamento criado:", response);
        return response;
    } catch (error) {
        console.error('❌ [preAppointmentsRepo] Erro ao criar pré-agendamento:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Importa/Aprova um pré-agendamento, convertendo-o em agendamento real
 */
export const approvePreAppointment = async (id, data) => {
    console.log("📥 [preAppointmentsRepo] approvePreAppointment chamado (V2)");
    console.log("📥 [preAppointmentsRepo] ID:", id);
    console.log("📥 [preAppointmentsRepo] data.patientId:", data.patientId);
    console.log("📥 [preAppointmentsRepo] data.isNewPatient:", data.isNewPatient);
    
    try {
        const response = await v2.confirmPreAppointment(id, data);
        console.log("✅ [preAppointmentsRepo] Sucesso:", response);
        return response;
    } catch (error) {
        console.error('❌ [preAppointmentsRepo] Erro ao aprovar pré-agendamento:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Atualiza um pré-agendamento existente (sem importar/confirmar)
 */
export const updatePreAppointment = async (id, data) => {
    console.log("📝 [preAppointmentsRepo] updatePreAppointment chamado");
    console.log("📝 [preAppointmentsRepo] ID:", id);
    
    try {
        const response = await v2.updatePreAppointment(id, data);
        console.log("✅ [preAppointmentsRepo] Atualizado:", response);
        return response;
    } catch (error) {
        console.error('❌ [preAppointmentsRepo] Erro ao atualizar pré-agendamento:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Descarta um pré-agendamento
 */
export const discardPreAppointment = async (id, reason) => {
    try {
        const response = await v2.discardPreAppointment(id, reason);
        return response;
    } catch (error) {
        console.error('❌ Erro ao descartar pré-agendamento:', error);
        throw error;
    }
};

/**
 * Cancela um pré-agendamento (apenas altera status para 'cancelado')
 */
export const cancelPreAppointment = async (id) => {
    try {
        const response = await v2.cancelPreAppointment(id);
        return response;
    } catch (error) {
        console.error('❌ Erro ao cancelar pré-agendamento:', error);
        throw error;
    }
};
