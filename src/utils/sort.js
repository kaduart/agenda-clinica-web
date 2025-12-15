const safeTime = (t) => (typeof t === "string" && /^\d{2}:\d{2}$/.test(t) ? t : "00:00");

// ✅ data ASC e hora ASC (corrige o “14:40 indo pro final”)
export const sortAppointmentsByDateTimeAsc = (list) =>
    [...(list || [])].sort((a, b) => {
        const da = (a?.date || "").localeCompare(b?.date || "");
        if (da !== 0) return da;
        return safeTime(a?.time).localeCompare(safeTime(b?.time));
    });
