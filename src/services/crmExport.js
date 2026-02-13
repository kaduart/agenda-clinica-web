import { database } from "../config/firebase";
import { resolveSpecialtyKey } from "../utils/specialty";
const EXPORT_TOKEN = "agenda_export_token_fono_inova_2025_secure_abc123";
const BACKEND_URL = "https://fono-inova-crm-back.onrender.com";

/* const BACKEND_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://fono-inova-crm-back.onrender.com"; */

export const exportToCRM = async (appointment) => {

    if (appointment.preAgendamento?.crmPreAgendamentoId) {
        return confirmarEImportarToCRM(appointment, {});
    }

    // 1) validações
    if (appointment.status !== "Confirmado") {
        toast.warning("⚠️ Apenas agendamentos confirmados podem ser exportados.");
        return;
    }

    if (appointment.export?.status === "success") {
        const ok = toast.warning(
            "⚠️ Este agendamento já foi exportado.\n\n" +
            `ID no CRM: ${appointment.export.crmAppointmentId}\n\n` +
            "Deseja exportar novamente? (pode criar duplicata)"
        );
        if (!ok) return;
    }

    const missing = [];
    if (!appointment.patient) missing.push("Nome do paciente");
    if (!appointment.phone) missing.push("Telefone");
    if (!appointment.birthDate) missing.push("Data de nascimento");
    if (!appointment.professional) missing.push("Profissional");

    if (missing.length) {
        toast.warning("❌ Campos obrigatórios faltando:\n\n" + missing.join("\n") + "\n\nPreencha antes de exportar.");
        return;
    }

    // 2) marcar como exporting
    let updated = appointment;
    try {
        await database.ref(`appointments/${appointment.id}/export`).update({
            status: "exporting",
            lastError: null,
            lastErrorMessage: null,
            lastAttemptAt: new Date().toISOString(),
        });

        const snap = await database.ref(`appointments/${appointment.id}`).get();
        updated = { id: appointment.id, ...snap.val() };
    } catch (err) {
        console.error("❌ [EXPORT] Erro ao atualizar Firebase:", err);
        toast.error("Erro ao preparar exportação. Tente novamente.");
        return;
    }

    // 3) enviar
    try {
        const payload = {
            firebaseAppointmentId: updated.id,
            professionalName: updated.professional,
            date: updated.date,
            time: updated.time,
            specialty: updated.specialty || "Fonoaudiologia",
            specialtyKey: updated.specialtyKey || resolveSpecialtyKey(updated.specialty || "Fonoaudiologia"),
            patientInfo: {
                fullName: updated.patient,
                phone: (updated.phone || "").replace(/\D/g, ""),
                birthDate: updated.birthDate,
                email: updated.email || undefined,
            },
            responsible: updated.responsible || undefined,
            observations: updated.observations || undefined,
            crm: {
                serviceType: updated.crm?.serviceType || "individual_session",
                sessionType: updated.crm?.sessionType || "avaliacao",
                paymentMethod: updated.crm?.paymentMethod || "pix",
                paymentAmount: Number(updated.crm?.paymentAmount || 0),
                usePackage: !!updated.crm?.usePackage,
                status: "scheduled",
            },
        };

        const res = await fetch(`${BACKEND_URL}/api/import-from-agenda`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${EXPORT_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (data.success) {
            await database.ref(`appointments/${appointment.id}/export`).update({
                status: "success",
                crmPatientId: data.patientId,
                crmAppointmentId: data.appointmentId,
                crmPaymentId: data.paymentId,
                crmSessionId: data.sessionId,
                exportedAt: new Date().toISOString(),
                lastError: null,
                lastErrorMessage: null,
            });

            toast.success(
                "✅ Agendamento exportado com sucesso!\n\n" +
                `Paciente ID: ${data.patientId}\n` +
                `Agendamento ID: ${data.appointmentId}\n\n` +
                "Agendamento criado no CRM."
            );
            return;
        }

        if (data.code === "TIME_CONFLICT") {
            const alternatives = data.alternatives || [];
            if (alternatives.length) {
                const msg =
                    `⚠️ Horário ${appointment.time} já foi ocupado.\n\n` +
                    "Horários disponíveis:\n" +
                    alternatives.map((t, i) => `${i + 1}. ${t}`).join("\n") +
                    `\n\nDigite o número (1-${alternatives.length}) ou Cancelar:`;

                const choice = prompt(msg);
                const idx = Number(choice) - 1;

                if (!Number.isNaN(idx) && idx >= 0 && idx < alternatives.length) {
                    const newTime = alternatives[idx];
                    await database.ref(`appointments/${appointment.id}`).update({ time: newTime });
                    toast.success(`Horário atualizado para ${newTime}. Exportando novamente...`);
                    setTimeout(() => exportToCRM({ ...appointment, time: newTime }), 400);
                }
            } else {
                toast.error("❌ Horário não disponível e não há alternativas.\n\nEscolha outro horário manualmente.");
            }
            return;
        }

        if (data.code === "DOCTOR_NOT_FOUND") {
            await database.ref(`appointments/${appointment.id}/export`).update({
                status: "error",
                lastError: data.code,
                lastErrorMessage: data.error,
            });

            toast.error(
                "❌ Profissional não encontrado no CRM:\n\n" +
                `"${appointment.professional}"\n\n` +
                "Verifique se o nome está cadastrado corretamente."
            );
            return;
        }

        await database.ref(`appointments/${appointment.id}/export`).update({
            status: "error",
            lastError: data.code || "UNKNOWN_ERROR",
            lastErrorMessage: data.error || "Erro desconhecido",
        });

        toast.error("❌ Erro ao exportar:\n\n" + (data.error || "Erro desconhecido"));

    } catch (err) {
        await database.ref(`appointments/${appointment.id}/export`).update({
            status: "error",
            lastError: "NETWORK_ERROR",
            lastErrorMessage: err.message,
        });

        toast.error("❌ Erro de conexão com o servidor.\n\nVerifique sua internet e tente novamente.");
    }
};

export const autoSendPreAgendamento = async (appointment) => {
    try {
        const payload = {
            firebaseAppointmentId: appointment.id,
            professionalName: appointment.professional,
            date: appointment.date,
            time: appointment.time,
            specialty: appointment.specialty || "Fonoaudiologia",
            patientInfo: {
                fullName: appointment.patient,
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

        const res = await fetch(`${BACKEND_URL}/api/pre-agendamento/webhook`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${EXPORT_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (data.success) {
            await database.ref(`appointments/${appointment.id}/preAgendamento`).set({
                status: "enviado",
                crmPreAgendamentoId: data.id,
                sentAt: new Date().toISOString(),
            });
            return { success: true };
        }

        throw new Error(data.error);

    } catch (err) {
        console.error("Erro:", err);
        await database.ref(`appointments/${appointment.id}/preAgendamento`).set({
            status: "error",
            error: err.message,
        });
        return { success: false, error: err.message };
    }
};

export const confirmarAgendamento = async (appointment, dadosConfirmacao) => {

    // Usa o próprio ID do Firebase (appointment.id) como externalId
    const externalId = appointment.id;

    if (!externalId) {
        alert("Erro: ID do agendamento não encontrado");
        return { success: false };
    }

    try {
        // NOVO ENDPOINT: usa externalId no body ao invés de URL
        const res = await fetch(
            `${BACKEND_URL}/api/import-from-agenda/confirmar-por-external-id`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${EXPORT_TOKEN}`,
                },
                body: JSON.stringify({
                    externalId: externalId,  // ID do Firebase (-OkjTXe5...)
                    doctorId: dadosConfirmacao.doctorId,
                    date: dadosConfirmacao.date || appointment.date,
                    time: dadosConfirmacao.time || appointment.time,
                    sessionValue: dadosConfirmacao.sessionValue || appointment.crm?.paymentAmount || 200,
                    serviceType: appointment.crm?.serviceType || "evaluation",
                    paymentMethod: appointment.crm?.paymentMethod || "pix",
                    notes: "Confirmado pela secretária",
                }),
            }
        );

        const data = await res.json();

        if (data.success) {
            await database.ref(`appointments/${appointment.id}`).update({
                status: "Confirmado",
                export: {
                    status: "success",
                    crmAppointmentId: data.appointmentId,
                    exportedAt: new Date().toISOString(),
                },
                preAgendamento: {
                    status: "importado",
                    crmPreAgendamentoId: data.preAgendamentoId, // agora guardamos
                }
            });
            return { success: true, appointmentId: data.appointmentId };
        }

        throw new Error(data.error);

    } catch (err) {
        alert("Erro ao confirmar: " + err.message);
        return { success: false, error: err.message };
    }
};

// Adicione estas funções no seu crmExport.js (mesmo arquivo)

/**
 * Sincroniza CANCELAMENTO com o CRM
 * Usado quando cancela um agendamento na agenda externa
 */
export const syncCancelToCRM = async (appointment, reason = "Cancelado via agenda externa") => {

    // Só sincroniza se tiver sido exportado ou tiver pré-agendamento
    const hasPreAgendamento = appointment.preAgendamento?.crmPreAgendamentoId;
    const hasExport = appointment.export?.crmAppointmentId;

    if (!hasPreAgendamento && !hasExport) {
        console.log("[syncCancelToCRM] Agendamento nunca foi exportado, ignorando sync");
        return { success: true, skipped: true };
    }

    try {
        // Marca como sincronizando
        await database.ref(`appointments/${appointment.id}/syncCancel`).update({
            status: "syncing",
            lastError: null,
            lastAttemptAt: new Date().toISOString(),
        });

        const payload = {
            externalId: appointment.id, // firebaseAppointmentId
            reason: reason,
            confirmedAbsence: appointment.confirmedAbsence || false
        };

        const res = await fetch(`${BACKEND_URL}/api/import-from-agenda/sync-cancel`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${EXPORT_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (data.success) {
            await database.ref(`appointments/${appointment.id}/syncCancel`).update({
                status: "success",
                crmPreAgendamentoId: data.preAgendamentoId,
                crmAppointmentId: data.appointmentId,
                syncedAt: new Date().toISOString(),
                lastError: null,
            });

            // Atualiza também o export para refletir cancelamento
            if (appointment.export) {
                await database.ref(`appointments/${appointment.id}/export`).update({
                    status: "canceled",
                    canceledAt: new Date().toISOString(),
                });
            }

            console.log("[syncCancelToCRM] ✅ Sucesso:", data);
            return { success: true, data };
        }

        throw new Error(data.error || "Erro desconhecido");

    } catch (err) {
        console.error("[syncCancelToCRM] ❌ Erro:", err);
        await database.ref(`appointments/${appointment.id}/syncCancel`).update({
            status: "error",
            lastError: err.message,
            lastAttemptAt: new Date().toISOString(),
        });
        return { success: false, error: err.message };
    }
};

/**
 * Sincroniza EDIÇÃO/ATUALIZAÇÃO com o CRM
 * Usado quando edita data, hora, profissional ou status na agenda externa
 */
export const syncUpdateToCRM = async (appointment, updates) => {

    // Só sincroniza se tiver sido exportado ou tiver pré-agendamento
    const hasPreAgendamento = appointment.preAgendamento?.crmPreAgendamentoId;
    const hasExport = appointment.export?.crmAppointmentId;

    if (!hasPreAgendamento && !hasExport) {
        console.log("[syncUpdateToCRM] Agendamento nunca foi exportado, ignorando sync");
        return { success: true, skipped: true };
    }

    try {
        // Marca como sincronizando
        await database.ref(`appointments/${appointment.id}/syncUpdate`).update({
            status: "syncing",
            lastError: null,
            lastAttemptAt: new Date().toISOString(),
        });

        const payload = {
            externalId: appointment.id,
            date: updates.date || appointment.date,
            time: updates.time || appointment.time,
            professionalName: updates.professional || appointment.professional,
            specialty: updates.specialty || appointment.specialty,
            observations: updates.observations || appointment.observations,
            patientInfo: updates.patientInfo || {
                fullName: appointment.patient,
                phone: (appointment.phone || "").replace(/\D/g, ""),
                birthDate: appointment.birthDate,
                email: appointment.email,
            },
            status: updates.status || appointment.status // Pendente, Confirmado, Cancelado
        };

        // Remove campos undefined
        Object.keys(payload).forEach(key => {
            if (payload[key] === undefined) delete payload[key];
        });

        const res = await fetch(`${BACKEND_URL}/api/import-from-agenda/sync-update`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${EXPORT_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (data.success) {
            await database.ref(`appointments/${appointment.id}/syncUpdate`).update({
                status: "success",
                crmPreAgendamentoId: data.preAgendamentoId,
                crmAppointmentId: data.appointmentId,
                syncedAt: new Date().toISOString(),
                updatedFields: data.updatedFields || Object.keys(updates),
                lastError: null,
            });

            console.log("[syncUpdateToCRM] ✅ Sucesso:", data);
            return { success: true, data };
        }

        throw new Error(data.error || "Erro desconhecido");

    } catch (err) {
        console.error("[syncUpdateToCRM] ❌ Erro:", err);
        await database.ref(`appointments/${appointment.id}/syncUpdate`).update({
            status: "error",
            lastError: err.message,
            lastAttemptAt: new Date().toISOString(),
        });
        return { success: false, error: err.message };
    }
};

/**
 * Sincroniza EXCLUSÃO com o CRM
 * Usado quando deleta permanentemente um agendamento na agenda externa
 */
export const syncDeleteToCRM = async (appointmentId, reason = "Excluído via agenda externa") => {

    console.log("🚀 [syncDeleteToCRM] INICIANDO...");
    console.log("🚀 URL:", `${BACKEND_URL}/api/import-from-agenda/sync-delete`);
    console.log("🚀 Token existe?", !!EXPORT_TOKEN);

    try {
        const res = await fetch(`${BACKEND_URL}/api/import-from-agenda/sync-delete`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${EXPORT_TOKEN}`,
            },
            body: JSON.stringify({ externalId: appointmentId, reason }),
        });

        console.log("🚀 Resposta HTTP:", res.status); // <-- Qual número aparece aqui?

        const data = await res.json();
        console.log("🚀 Dados:", data);
        return data;
    } catch (err) {
        console.error("❌ ERRO NO FETCH:", err); // <-- O erro aparece aqui?
        throw err;
    }
};

/**
 * Wrapper inteligente que detecta mudanças e sincroniza automaticamente
 * Use isso no onUpdate/onEdit do App.jsx
 */
export const syncIfNeeded = async (oldAppointment, newAppointment) => {
    const changes = {};

    // Detecta mudanças
    if (oldAppointment.date !== newAppointment.date) changes.date = newAppointment.date;
    if (oldAppointment.time !== newAppointment.time) changes.time = newAppointment.time;
    if (oldAppointment.professional !== newAppointment.professional) changes.professional = newAppointment.professional;
    if (oldAppointment.specialty !== newAppointment.specialty) changes.specialty = newAppointment.specialty;
    if (oldAppointment.observations !== newAppointment.observations) changes.observations = newAppointment.observations;
    if (oldAppointment.status !== newAppointment.status) changes.status = newAppointment.status;
    if (oldAppointment.patient !== newAppointment.patient) {
        changes.patientInfo = {
            fullName: newAppointment.patient,
            phone: (newAppointment.phone || "").replace(/\D/g, ""),
            birthDate: newAppointment.birthDate,
            email: newAppointment.email,
        };
    }

    if (Object.keys(changes).length === 0) {
        return { success: true, skipped: true, reason: "no_changes" };
    }

    return syncUpdateToCRM(oldAppointment, changes);
};