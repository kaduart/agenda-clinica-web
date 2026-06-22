import * as v2 from "../api/v2/agendaV2Client";
import { mapAppointmentListResponseDTO } from "../api/v2/appointment.response.dto";

/**
 * Busca pré-agendamentos filtrados (operationalStatus = pre_agendado)
 * Usa o endpoint dedicado /api/v2/pre-appointments, que já filtra no backend.
 */
export const fetchPreAppointments = async (filters = {}) => {
    const startTime = Date.now();
    try {
        console.log(`[preAppointmentsRepo] 🚀 Buscando pré-agendamentos com filtros:`, filters);
        const rawList = await v2.listPreAppointments(filters);
        console.log(`[preAppointmentsRepo] RAW list length:`, rawList?.length || 0);
        const preAgendados = mapAppointmentListResponseDTO(rawList);
        console.log(`[preAppointmentsRepo] ✅ Recebidos ${preAgendados.length} pré-agendamentos em ${Date.now() - startTime}ms`);
        return preAgendados;
    } catch (error) {
        console.error(`❌ [preAppointmentsRepo] Erro após ${Date.now() - startTime}ms:`, error);
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
    
    try {
        const payload = {
            ...data,
            operationalStatus: 'scheduled',
        };
        const response = await v2.updateAppointment(id, payload);
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
    
    try {
        const response = await v2.updateAppointment(id, data);
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
