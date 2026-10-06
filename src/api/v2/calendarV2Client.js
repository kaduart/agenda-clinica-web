/**
 * 🗓️ CALENDAR V2 CLIENT
 *
 * Fronteira externa: feriados e dados de calendário.
 * Mantido separado do agendaV2Client porque não faz parte do domínio
 * canônico de agendamentos/pacientes.
 */

import api from "../../services/api.js";

// Feriados mudam no máximo uma vez por ano: um pedido por ano por sessão (o modal e o App pediam a cada abertura).
const holidaysCache = new Map();

/**
 * Busca feriados nacionais para um ano específico (com cache por ano).
 * Usa o endpoint legado primeiro: o /api/v2/calendar/holidays exige JWT de usuário e o token de
 * serviço da Agenda levava 401 em toda chamada antes de cair no fallback.
 */
export function getHolidays(year) {
    const targetYear = year || new Date().getFullYear();
    if (!holidaysCache.has(targetYear)) {
        const request = fetchHolidays(targetYear).catch((error) => {
            holidaysCache.delete(targetYear); // não guarda falha: tenta de novo na próxima
            throw error;
        });
        holidaysCache.set(targetYear, request);
    }
    return holidaysCache.get(targetYear);
}

async function fetchHolidays(targetYear) {
    try {
        const response = await api.get(`/api/calendar/holidays?year=${targetYear}`);
        const payload = response.data;
        if (payload?.success && Array.isArray(payload.holidays)) {
            return payload.holidays;
        }
    } catch {
        // cai para o v2 abaixo
    }
    const response = await api.get(`/api/v2/calendar/holidays?year=${targetYear}`);
    const payload = response.data;
    if (payload?.success && Array.isArray(payload.data)) {
        return payload.data;
    }
    return Array.isArray(payload) ? payload : [];
}
