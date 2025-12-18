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

// ===============================
// CICLOS (20→20) - Firebase
// ===============================

// gera um id simples e único pro ciclo
export const createCycleId = () =>
    `cyc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// busca appointments por range de datas (YYYY-MM-DD)
// usa o mesmo padrão do listenAppointmentsForMonth (orderByChild("date")) :contentReference[oaicite:3]{index=3}
export const fetchAppointmentsInRange = async (startDate, endDate) => {
    const snap = await database
        .ref("appointments")
        .orderByChild("date")
        .startAt(startDate)
        .endAt(endDate)
        .get();

    const data = snap.val();
    return data ? Object.entries(data).map(([id, a]) => ({ id, ...a })) : [];
};

// cria as sessões do ciclo em lote e retorna resumo
export const generateCycleAppointments = async (baseAppointment, payload, opts = {}) => {
    const {
        statusForGenerated = baseAppointment?.status || "Confirmado",
        writeCycleMeta = true,
        skipConflicts = true,
    } = opts;

    if (!baseAppointment) throw new Error("baseAppointment ausente");
    if (!payload?.selectedSlots?.length) throw new Error("selectedSlots vazio");

    const cycleId = payload.cycleId || createCycleId();
    const cycleStartDate = String(payload.cycleStartDate || "").trim();
    const cycleEndDate = String(payload.cycleEndDate || "").trim();

    if (!cycleStartDate || !cycleEndDate) {
        throw new Error("cycleStartDate/cycleEndDate ausentes");
    }

    // pega tudo do período 20→20 numa tacada só (ciclo pode atravessar meses)
    const existing = await fetchAppointmentsInRange(cycleStartDate, cycleEndDate);

    const nowIso = new Date().toISOString();
    const appointmentsRef = database.ref("appointments");

    const updates = {};
    const createdIds = [];
    const skipped = [];

    for (const slot of payload.selectedSlots) {
        const date = slot?.date;
        const time = slot?.time;
        if (!date || !time) continue;

        const conflict = existing.some((a) =>
            a.date === date &&
            a.time === time &&
            a.professional === baseAppointment.professional &&
            a.status !== "Cancelado" // mesma regra do hasConflict :contentReference[oaicite:4]{index=4}
        );

        if (conflict && skipConflicts) {
            skipped.push({ date, time, reason: "CONFLICT" });
            continue;
        }

        const id = appointmentsRef.push().key;
        createdIds.push(id);

        updates[`appointments/${id}`] = {
            // campos “padrão” do seu appointment
            patient: baseAppointment.patient || "",
            phone: baseAppointment.phone || "",
            birthDate: baseAppointment.birthDate || "",
            email: baseAppointment.email || "",
            responsible: baseAppointment.responsible || "",
            professional: baseAppointment.professional || "",
            specialty: baseAppointment.specialty || "Fonoaudiologia",
            specialtyKey: baseAppointment.specialtyKey || undefined,

            date,
            time,
            status: statusForGenerated,
            observations:
                (baseAppointment.observations ? `${baseAppointment.observations}\n` : "") +
                `Ciclo automático ${cycleStartDate}→${cycleEndDate} (${payload.sessionsPerWeek}x/semana)`,

            createdAt: nowIso,

            // mantém crm igual seu upsert normaliza :contentReference[oaicite:5]{index=5}
            crm: {
                serviceType: baseAppointment.crm?.serviceType || "individual_session",
                sessionType: baseAppointment.crm?.sessionType || "avaliacao",
                paymentMethod: baseAppointment.crm?.paymentMethod || "pix",
                paymentAmount: Number(baseAppointment.crm?.paymentAmount || 0),
                usePackage: Boolean(baseAppointment.crm?.usePackage),
            },

            // ✅ CHAVE DO CICLO (pra agrupar / cancelar / apagar)
            cycleId,
            cycle: {
                id: cycleId,
                startDate: cycleStartDate,
                endDate: cycleEndDate,
                sessionsPerWeek: Number(payload.sessionsPerWeek || 0),
                totalSessions: Number(payload.totalSessions || 0),
                generatedAt: nowIso,
                baseAppointmentId: baseAppointment.id || null,
            },
        };
    }

    // grava meta do ciclo (opcional, mas eu recomendo)
    if (writeCycleMeta) {
        updates[`cycles/${cycleId}`] = {
            id: cycleId,
            status: "active",
            createdAt: nowIso,
            startDate: cycleStartDate,
            endDate: cycleEndDate,
            sessionsPerWeek: Number(payload.sessionsPerWeek || 0),
            totalSessions: Number(payload.totalSessions || 0),
            baseAppointmentId: baseAppointment.id || null,
            patient: baseAppointment.patient || "",
            professional: baseAppointment.professional || "",
            specialty: baseAppointment.specialty || "",
            createdCount: createdIds.length,
            skippedCount: skipped.length,
        };
    }

    await database.ref().update(updates);

    return {
        cycleId,
        createdCount: createdIds.length,
        createdIds,
        skipped,
    };
};

// busca tudo do ciclo
export const fetchAppointmentsByCycleId = async (cycleId) => {
    const snap = await database
        .ref("appointments")
        .orderByChild("cycleId")
        .equalTo(cycleId)
        .get();

    const data = snap.val();
    return data ? Object.entries(data).map(([id, a]) => ({ id, ...a })) : [];
};

// ✅ “Cancelar ciclo” (soft): não apaga, só marca Cancelado (preserva histórico)
export const cancelCycle = async (cycleId, reason = "Cancelado pelo ciclo") => {
    if (!cycleId) return;

    const items = await fetchAppointmentsByCycleId(cycleId);
    if (!items.length) return;

    const updates = {};
    const nowIso = new Date().toISOString();

    for (const a of items) {
        updates[`appointments/${a.id}/status`] = "Cancelado";
        updates[`appointments/${a.id}/canceledAt`] = nowIso;
        updates[`appointments/${a.id}/observations`] =
            (a.observations ? `${a.observations}\n` : "") + reason;
    }

    updates[`cycles/${cycleId}/status`] = "canceled";
    updates[`cycles/${cycleId}/canceledAt`] = nowIso;

    await database.ref().update(updates);
};

// ✅ “Apagar ciclo” (hard): remove do Firebase
export const deleteCycle = async (cycleId) => {
    if (!cycleId) return;

    const items = await fetchAppointmentsByCycleId(cycleId);
    const updates = {};

    for (const a of items) {
        updates[`appointments/${a.id}`] = null; // multi-path delete
    }
    updates[`cycles/${cycleId}`] = null;

    await database.ref().update(updates);
};
