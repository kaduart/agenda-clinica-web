/**
 * 🗓️ CALENDAR V2 CLIENT
 *
 * Fronteira externa: feriados e dados de calendário.
 * Mantido separado do agendaV2Client porque não faz parte do domínio
 * canônico de agendamentos/pacientes.
 */

import api from "../../services/api.js";

/**
 * Busca feriados nacionais para um ano específico.
 * Tenta o endpoint V2 primeiro; se não existir, cai no V1 legado.
 */
export async function getHolidays(year) {
    const targetYear = year || new Date().getFullYear();

    try {
        const response = await api.get(`/api/v2/calendar/holidays?year=${targetYear}`);
        const payload = response.data;
        if (payload?.success && Array.isArray(payload.data)) {
            return payload.data;
        }
        return Array.isArray(payload) ? payload : [];
    } catch {
        // Fallback seguro para o endpoint legado
        const response = await api.get(`/api/calendar/holidays?year=${targetYear}`);
        const payload = response.data;
        if (payload?.success && Array.isArray(payload.holidays)) {
            return payload.holidays;
        }
        return [];
    }
}
