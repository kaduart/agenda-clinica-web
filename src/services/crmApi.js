/**
 * 🚀 Serviço de Integração com CRM - Versão V2 Adapter
 * 
 * LEGADO: Substitui lógica antiga espalhada.
 * AGORA: thin wrapper sobre api/v2/agendaV2Client
 * 
 * Quando seguro, este arquivo pode ser deprecado e os imports
 * migrados diretamente para appointmentsRepo.js ou agendaV2Client.
 */

import * as v2 from "../api/v2/agendaV2Client";

// Cache local com localStorage (persiste entre reloads)
const getCache = () => {
    try {
        return JSON.parse(localStorage.getItem('crmCache') || '{}');
    } catch {
        return {};
    }
};

const setCache = (key, value) => {
    const cache = getCache();
    cache[key] = value;
    localStorage.setItem('crmCache', JSON.stringify(cache));
};

const getCacheItem = (key) => getCache()[key];

const localCache = {
    get: getCacheItem,
    set: setCache,
    delete: (key) => {
        const cache = getCache();
        delete cache[key];
        localStorage.setItem('crmCache', JSON.stringify(cache));
    }
};

// ===============================
// 🔁 THIN WRAPPERS (V2 ADAPTER)
// ===============================

/**
 * Exporta agendamento confirmado para o CRM
 * @deprecated Use appointmentsRepo.upsertAppointment diretamente
 */
export const exportToCRM = async (appointment) => {
    try {
        const cacheKey = `export_${appointment.id}`;
        const cached = localCache.get(cacheKey);
        
        if (cached?.status === 'success' && !confirm("Já exportado. Deseja exportar novamente?")) {
            return { success: true, cached: true };
        }

        if (appointment.status !== "Confirmado") {
            alert("⚠️ Apenas agendamentos confirmados podem ser exportados.");
            return { success: false, error: 'Status não confirmado' };
        }

        const missing = [];
        const patientNameForExport = appointment.patientName || appointment.patient?.name || appointment.patient?.fullName || (typeof appointment.patient === 'string' ? appointment.patient : '') || '';
        if (!patientNameForExport) missing.push("Nome do paciente");
        if (!appointment.phone) missing.push("Telefone");
        if (!appointment.birthDate) missing.push("Data de nascimento");
        if (!appointment.professional) missing.push("Profissional");

        if (missing.length) {
            alert("❌ Campos obrigatórios faltando:\n\n" + missing.join("\n"));
            return { success: false, error: 'Campos faltando' };
        }

        const payload = {
            _id: appointment.id,
            professionalName: appointment.professional,
            date: `${appointment.date}T${appointment.time}:00-03:00`,
            time: appointment.time,
            specialty: appointment.specialtyKey || appointment.specialty || "fonoaudiologia",
            patientInfo: {
                fullName: patientNameForExport,
                phone: (appointment.phone || "").replace(/\D/g, ""),
                birthDate: appointment.birthDate,
                email: appointment.email || undefined,
            },
            responsible: appointment.responsible || undefined,
            observations: appointment.observations || undefined,
            crm: {
                serviceType: appointment.crm?.serviceType || "individual_session",
                sessionType: appointment.crm?.sessionType || "evaluation",
                paymentMethod: appointment.crm?.paymentMethod || "pix",
                paymentAmount: Number(appointment.crm?.paymentAmount || 0),
                usePackage: !!appointment.crm?.usePackage,
                status: "scheduled",
            },
        };

        const data = await v2.createPreAppointment(payload);

        localCache.set(cacheKey, {
            status: 'success',
            crmPreAgendamentoId: data.preAgendamentoId,
            exportedAt: new Date().toISOString()
        });

        alert(`✅ Exportado com sucesso!\n\nPré-agendamento ID: ${data.preAgendamentoId}`);
        return { success: true, data };

    } catch (err) {
        console.error("❌ Erro ao exportar:", err);
        localCache.set(`export_${appointment.id}`, {
            status: 'error',
            error: err.message,
            attemptedAt: new Date().toISOString()
        });
        alert("❌ Erro ao exportar:\n\n" + err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Envia pré-agendamento automaticamente
 * @deprecated Use appointmentsRepo.upsertAppointment diretamente
 */
export const autoSendPreAgendamento = async (appointment) => {
    try {
        const payload = {
            _id: appointment.id,
            professionalName: appointment.professional,
            professionalId: appointment.professionalId,
            date: `${appointment.date}T${appointment.time}:00-03:00`,
            time: appointment.time,
            specialty: appointment.specialtyKey || appointment.specialty || "fonoaudiologia",
            patientInfo: {
                fullName: patientNameForExport,
                phone: (appointment.phone || "").replace(/\D/g, ""),
                birthDate: appointment.birthDate,
                email: appointment.email,
            },
            responsible: appointment.responsible,
            observations: appointment.observations,
            crm: {
                serviceType: appointment.crm?.serviceType || "individual_session",
                sessionType: appointment.crm?.sessionType || "evaluation",
                paymentMethod: appointment.crm?.paymentMethod || "pix",
                paymentAmount: Number(appointment.crm?.paymentAmount || 0),
            },
            source: 'agenda_externa'
        };

        const data = await v2.createPreAppointment(payload);

        localCache.set(`pre_${appointment.id}`, {
            status: 'enviado',
            crmPreAgendamentoId: data.preAgendamentoId || data.appointmentId,
            sentAt: new Date().toISOString()
        });

        return { success: true, data };

    } catch (err) {
        console.error("❌ Erro no pré-agendamento:", err);
        localCache.set(`pre_${appointment.id}`, {
            status: 'error',
            error: err.message
        });
        return { success: false, error: err.message };
    }
};

/**
 * Confirma agendamento no CRM
 * @deprecated Use appointmentsRepo.confirmAppointment diretamente
 */
export const confirmarAgendamento = async (appointment, dadosConfirmacao) => {
    try {
        const data = await v2.confirmPreAppointment(appointment.id, {
            doctorId: dadosConfirmacao.doctorId,
            date: dadosConfirmacao.date || appointment.date,
            time: dadosConfirmacao.time || appointment.time,
            sessionValue: dadosConfirmacao.sessionValue || appointment.crm?.paymentAmount || 200,
            serviceType: appointment.crm?.serviceType || "evaluation",
            paymentMethod: appointment.crm?.paymentMethod || "pix",
            notes: "Confirmado pela secretária",
        });

        localCache.set(`export_${appointment.id}`, {
            status: 'confirmed',
            crmAppointmentId: data.appointmentId,
            confirmedAt: new Date().toISOString()
        });

        return { success: true, data };

    } catch (err) {
        console.error("❌ Erro ao confirmar:", err);
        return { success: false, error: err.message };
    }
};

/**
 * Sincroniza cancelamento com o CRM
 * @deprecated Use appointmentsRepo.cancelAppointment diretamente
 */
export const syncCancelToCRM = async (appointment, reason = "Cancelado via agenda externa") => {
    const cacheKey = `syncCancel_${appointment.id}`;
    const hasPre = localCache.get(`pre_${appointment.id}`)?.status === 'enviado';
    const hasExport = localCache.get(`export_${appointment.id}`)?.status === 'success';

    if (!hasPre && !hasExport) {
        console.log("[syncCancelToCRM] Nunca foi exportado, ignorando");
        return { success: true, skipped: true };
    }

    try {
        localCache.set(cacheKey, { status: 'syncing' });
        const data = await v2.cancelAppointment(appointment.id, reason, {
            confirmedAbsence: appointment.confirmedAbsence || false
        });

        localCache.set(cacheKey, {
            status: 'success',
            syncedAt: new Date().toISOString()
        });

        return { success: true, data };

    } catch (err) {
        console.error("[syncCancelToCRM] Erro:", err);
        localCache.set(cacheKey, { status: 'error', error: err.message });
        return { success: false, error: err.message };
    }
};

/**
 * Sincroniza atualização com o CRM
 * @deprecated Use appointmentsRepo.updateAppointmentDirect diretamente
 */
export const syncUpdateToCRM = async (appointment, updates) => {
    const hasPre = localCache.get(`pre_${appointment.id}`)?.status === 'enviado';
    const hasExport = localCache.get(`export_${appointment.id}`)?.status === 'success';

    if (!hasPre && !hasExport) {
        return { success: true, skipped: true };
    }

    try {
        const payload = {
            _id: appointment.id,
            date: updates.date || appointment.date,
            time: updates.time || appointment.time,
            professionalName: updates.professional || appointment.professional,
            specialty: updates.specialtyKey || updates.specialty || appointment.specialtyKey || appointment.specialty,
            observations: updates.observations || appointment.observations,
            patientInfo: updates.patientInfo || {
                fullName: appointment.patientName || appointment.patient?.name || appointment.patient?.fullName || (typeof appointment.patient === 'string' ? appointment.patient : '') || '',
                phone: (appointment.phone || "").replace(/\D/g, ""),
                birthDate: appointment.birthDate,
                email: appointment.email,
            },
            status: updates.status || appointment.status
        };

        Object.keys(payload).forEach(key => {
            if (payload[key] === undefined) delete payload[key];
        });

        const data = await v2.updateAppointment(appointment.id, payload);
        return { success: true, data };

    } catch (err) {
        console.error("[syncUpdateToCRM] Erro:", err);
        return { success: false, error: err.message };
    }
};

/**
 * Sincroniza exclusão com o CRM
 * @deprecated Use appointmentsRepo.hardDeleteAppointment diretamente
 */
export const syncDeleteToCRM = async (appointmentId, reason = "Excluído via agenda externa") => {
    try {
        console.log(`[syncDeleteToCRM] Excluindo ${appointmentId}. Motivo: ${reason}`);
        const data = await v2.deleteAppointment(appointmentId);
        localCache.delete(`pre_${appointmentId}`);
        localCache.delete(`export_${appointmentId}`);
        return data;

    } catch (err) {
        console.error("❌ ERRO NO DELETE:", err);
        throw err;
    }
};

/**
 * Wrapper inteligente de sincronização
 * @deprecated Use appointmentsRepo diretamente
 */
export const syncIfNeeded = async (oldAppointment, newAppointment) => {
    console.log("[syncIfNeeded] ==========================================");
    
    const changes = {};
    if (oldAppointment.date !== newAppointment.date) changes.date = newAppointment.date;
    if (oldAppointment.time !== newAppointment.time) changes.time = newAppointment.time;
    if (oldAppointment.professional !== newAppointment.professional) changes.professional = newAppointment.professional;
    if (oldAppointment.status !== newAppointment.status) changes.status = newAppointment.status;

    if (Object.keys(changes).length === 0) {
        return { success: true, skipped: true };
    }

    const mudouParaConfirmado = changes.status === "Confirmado" && oldAppointment.status !== "Confirmado";
    const aindaNaoFoiImportado = !localCache.get(`export_${newAppointment.id}`)?.crmAppointmentId;

    if (mudouParaConfirmado && aindaNaoFoiImportado) {
        if (localCache.get(`pre_${newAppointment.id}`)?.crmPreAgendamentoId) {
            return confirmarAgendamento(newAppointment, {
                date: newAppointment.date,
                time: newAppointment.time,
                sessionValue: newAppointment.crm?.paymentAmount || 200
            });
        }
        
        await autoSendPreAgendamento(newAppointment);
        await new Promise(r => setTimeout(r, 500));
        return confirmarAgendamento(newAppointment, {
            date: newAppointment.date,
            time: newAppointment.time,
            sessionValue: newAppointment.crm?.paymentAmount || 200
        });
    }

    return syncUpdateToCRM(oldAppointment, changes);
};

/**
 * 🗓️ Busca disponibilidade semanal de horários livres
 * @deprecated Use appointmentsRepo.fetchWeeklyAvailability diretamente
 */
export const fetchWeeklyAvailability = async (startDate, specialty, days = 7) => {
    try {
        const data = await v2.getWeeklyAvailability({ startDate, specialty, days });
        return data;
    } catch (err) {
        console.error("[fetchWeeklyAvailability] Erro:", err);
        throw err;
    }
};
