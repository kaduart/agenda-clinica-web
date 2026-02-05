import { database } from "../config/firebase";
import { resolveSpecialtyKey } from "../utils/specialty";

const BACKEND_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://fono-inova-crm-back.onrender.com";

export const exportToCRM = async (appointment) => {
    const EXPORT_TOKEN = import.meta.env.VITE_AGENDA_EXPORT_TOKEN;
    EXPORT_TOKEN

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
    const EXPORT_TOKEN = import.meta.env.VITE_AGENDA_EXPORT_TOKEN;

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
    const EXPORT_TOKEN = import.meta.env.VITE_AGENDA_EXPORT_TOKEN;

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