import { database } from "../config/firebase";
import { resolveSpecialtyKey } from "../utils/specialty";

const BACKEND_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://fono-inova-crm-back.onrender.com";

export const exportToCRM = async (appointment) => {
    const EXPORT_TOKEN = import.meta.env.VITE_AGENDA_EXPORT_TOKEN;
    EXPORT_TOKEN

    // 1) validações
    if (appointment.status !== "Confirmado") {
        alert("⚠️ Apenas agendamentos confirmados podem ser exportados.");
        return;
    }

    if (appointment.export?.status === "success") {
        const ok = window.confirm(
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
        alert("❌ Campos obrigatórios faltando:\n\n" + missing.join("\n") + "\n\nPreencha antes de exportar.");
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
        alert("Erro ao preparar exportação. Tente novamente.");
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

            alert(
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
                    alert(`Horário atualizado para ${newTime}. Exportando novamente...`);
                    setTimeout(() => exportToCRM({ ...appointment, time: newTime }), 400);
                }
            } else {
                alert("❌ Horário não disponível e não há alternativas.\n\nEscolha outro horário manualmente.");
            }
            return;
        }

        if (data.code === "DOCTOR_NOT_FOUND") {
            await database.ref(`appointments/${appointment.id}/export`).update({
                status: "error",
                lastError: data.code,
                lastErrorMessage: data.error,
            });

            alert(
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

        alert("❌ Erro ao exportar:\n\n" + (data.error || "Erro desconhecido"));

    } catch (err) {
        await database.ref(`appointments/${appointment.id}/export`).update({
            status: "error",
            lastError: "NETWORK_ERROR",
            lastErrorMessage: err.message,
        });

        alert("❌ Erro de conexão com o servidor.\n\nVerifique sua internet e tente novamente.");
    }
};
