import { database } from "../config/firebase";
import { formatDateLocal } from "../utils/date";

export const listenAppointmentsForMonth = (year, month, onData) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = formatDateLocal(firstDay);
    const endDate = formatDateLocal(lastDay);

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

    const payload = {
        ...editingAppointment,
        ...appointmentData,
        status: safeStatus,
        phone: cleanPhone,
        createdAt,
    };

    if (editingAppointment?.id) {
        await database.ref(`appointments/${editingAppointment.id}`).update(payload);
        return { mode: "update", id: editingAppointment.id };
    }

    const ref = database.ref("appointments").push();
    await ref.set(payload);
    return { mode: "create", id: ref.key };
};

export const deleteAppointment = async (id) => {
    console.log("Deleting appointment with id:", id);
    await database.ref(`appointments/${id}`).remove();
};
