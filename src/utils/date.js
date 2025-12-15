export const formatDateLocal = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

export const parseYMDLocal = (ymd) => {
    const [y, m, d] = (ymd || "").split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
};

export const formatDateBR = (dateString) => {
    const [year, month, day] = (dateString || "").split("-");
    if (!year || !month || !day) return "-";
    return `${day}/${month}/${year}`;
};

export const formatDateDisplay = (dateString) => {
    const [year, month, day] = (dateString || "").split("-");
    if (!year || !month || !day) return "-";
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const options = { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" };
    return date.toLocaleDateString("pt-BR", options);
};

export const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

export function getWeeksInMonth(year, month) {
    const weeks = [];

    // mês começa em 0 (JS), aqui é ok
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // começa sempre na primeira SEGUNDA que toca o mês
    let current = new Date(firstDayOfMonth);
    const day = current.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    current.setDate(current.getDate() + diffToMonday);

    while (current <= lastDayOfMonth) {
        const start = new Date(current);
        const end = new Date(current);
        end.setDate(end.getDate() + 4); // SEG → SEX

        // garante que a semana toca o mês
        if (end >= firstDayOfMonth && start <= lastDayOfMonth) {
            weeks.push({
                start: start < firstDayOfMonth ? firstDayOfMonth : start,
                end: end > lastDayOfMonth ? lastDayOfMonth : end,
            });
        }

        current.setDate(current.getDate() + 7);
    }

    return weeks;
}
