import * as v2 from "../api/v2/agendaV2Client";

/**
 * Busca pré-agendamentos filtrados (operationalStatus = pre_agendado)
 * Como o backend ainda não filtra por operationalStatus, busca tudo e filtra no frontend.
 */
export const fetchPreAppointments = async (filters = {}) => {
    try {
        const data = await v2.getAppointments(filters);
        const appointments = data?.data?.appointments || data?.appointments || [];
        // Filtra apenas pré-agendamentos no frontend
        return appointments.filter(a => a.operationalStatus === 'pre_agendado');
    } catch (error) {
        console.error('❌ Erro ao buscar pré-agendamentos:', error);
        return [];
    }
};

/**
 * Cria um novo pré-agendamento como appointment com status pre_agendado
 */
export const createPreAppointment = async (data) => {
    try {
        const payload = {
            ...data,
            operationalStatus: 'pre_agendado',
        };
        const response = await v2.createAppointment(payload);
        console.log("✅ [preAppointmentsRepo] Pré-agendamento criado:", response);
        return response;
    } catch (error) {
        console.error('❌ [preAppointmentsRepo] Erro ao criar pré-agendamento:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Confirma um pré-agendamento existente, atualizando o MESMO registro para scheduled
 */
export const approvePreAppointment = async (id, data) => {
    console.log("📥 [preAppointmentsRepo] approvePreAppointment chamado (V2 - appointments-only)");
    console.log("📥 [preAppointmentsRepo] ID:", id);
    console.log("📥 [preAppointmentsRepo] data.patientId:", data.patientId);
    console.log("📥 [preAppointmentsRepo] data.isNewPatient:", data.isNewPatient);
    
    try {
        const payload = {
            ...data,
            operationalStatus: 'scheduled',
        };
        const response = await v2.updateAppointment(id, payload);
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
        const response = await v2.updateAppointment(id, data);
        console.log("✅ [preAppointmentsRepo] Atualizado:", response);
        return response;
    } catch (error) {
        console.error('❌ [preAppointmentsRepo] Erro ao atualizar pré-agendamento:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Descarta um pré-agendamento (hard delete)
 */
export const discardPreAppointment = async (id, reason) => {
    try {
        console.log(`[discardPreAppointment] Descartando appointment ${id}. Motivo: ${reason}`);
        const response = await v2.deleteAppointment(id);
        return response;
    } catch (error) {
        console.error('❌ Erro ao descartar pré-agendamento:', error);
        throw error;
    }
};

/**
 * Cancela um pré-agendamento (altera status para 'cancelado')
 */
export const cancelPreAppointment = async (id) => {
    try {
        const response = await v2.cancelAppointment(id, "Cancelado via Web App");
        return response;
    } catch (error) {
        console.error('❌ Erro ao cancelar pré-agendamento:', error);
        throw error;
    }
};
