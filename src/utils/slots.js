export function generateTimeSlots({ start = "08:00", end = "18:40", stepMinutes = 40 } = {}) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    const out = [];
    for (let m = startMin; m <= endMin; m += stepMinutes) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        out.push(`${hh}:${mm}`);
    }
    return out;
}
