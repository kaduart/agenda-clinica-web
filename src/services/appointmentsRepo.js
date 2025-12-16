import { database } from "../config/firebase";
import { formatDateLocal } from "../utils/date";

export const listenAppointmentsForMonth = (year, month, onData) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = formatDateLocal(firstDay);
    const endDate = formatDateLocal(lastDay);

    console.log(`[listenAppointments] Range: ${startDate} → ${endDate}`);

    const ref = database
        .ref("appointments")
        .orderByChild("date")
        .startAt(startDate)
        .endAt(endDate);

    const handler = (snapshot) => {
        const data = snapshot.val();
        const list = data
            ? Object.entries(data).map(([id, appointment]) => ({ id, ...appointment }))
            : [];

        console.log(`[listenAppointments] Recebidos ${list.length} agendamentos`);
        onData(list);
    };

    ref.on("value", handler);
    return () => ref.off("value", handler);
};

export const hasConflict = (appointments, candidate, editingId) => {
    return (appointments || []).some((a) =>
        a.id !== editingId &&
        a.date === candidate.date &&
        a.time === candidate.time &&
        a.professional === candidate.professional &&
        a.status !== "Cancelado"
    );
};

export const upsertAppointment = async ({ editingAppointment, appointmentData }) => {
    const safeStatus = appointmentData.status === "Vaga" ? "Pendente" : appointmentData.status;
    const createdAt =
        editingAppointment?.createdAt ||
        appointmentData.createdAt ||
        new Date().toISOString();

    const cleanPhone = (appointmentData.phone || "").replace(/\D/g, "");

    // ✅ NORMALIZAR TIPOS CRM
    const payload = {
        ...editingAppointment,
        ...appointmentData,
        status: safeStatus,
        phone: cleanPhone,
        createdAt,
        crm: {
            serviceType: appointmentData.crm?.serviceType || "individual_session",
            sessionType: appointmentData.crm?.sessionType || "avaliacao",
            paymentMethod: appointmentData.crm?.paymentMethod || "pix",
            paymentAmount: Number(appointmentData.crm?.paymentAmount || 0), // ⚠️ force Number
            usePackage: Boolean(appointmentData.crm?.usePackage), // ⚠️ force Boolean
        },
    };

    console.log("[upsertAppointment] Payload final:", JSON.stringify(payload, null, 2));

    if (editingAppointment?.id) {
        await database.ref(`appointments/${editingAppointment.id}`).update(payload);
        console.log(`[upsertAppointment] ✅ Atualizado: ${editingAppointment.id}`);
        return { mode: "update", id: editingAppointment.id };
    }

    const ref = database.ref("appointments").push();
    await ref.set(payload);
    console.log(`[upsertAppointment] ✅ Criado: ${ref.key}`);
    return { mode: "create", id: ref.key };
};

export const deleteAppointment = async (id) => {
    console.log(`[deleteAppointment] Excluindo: ${id}`);
    await database.ref(`appointments/${id}`).remove();
};