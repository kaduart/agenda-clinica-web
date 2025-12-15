// src/utils/timeSlots.js
export function generateTimeSlots({
    start = "08:00",
    end = "18:40",
    stepMinutes = 40,
} = {}) {
    const toMinutes = (hhmm) => {
        const [h, m] = String(hhmm).split(":").map(Number);
        return h * 60 + m;
    };

    const toHHMM = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const startMin = toMinutes(start);
    const endMin = toMinutes(end);

    const slots = [];
    for (let cur = startMin; cur <= endMin; cur += stepMinutes) {
        slots.push(toHHMM(cur));
    }
    return slots;
}
