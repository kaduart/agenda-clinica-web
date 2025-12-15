// src/components/WeeklyView.jsx
import React from "react";
import { formatDateLocal, getWeeksInMonth, parseYMDLocal } from "../utils/date";
import { generateTimeSlots } from "../utils/timeSlots";

function isWeekend(d) {
    const day = d.getDay();
    return day === 0 || day === 6;
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function sameYMD(dateObj, ymd) {
    return formatDateLocal(dateObj) === ymd;
}

function inRange(d, start, end) {
    return d >= start && d <= end;
}

function getWeekRange({ currentYear, currentMonth, filters }) {
    const weeks = getWeeksInMonth(currentYear, currentMonth);

    // prioridade: filtro de semana
    if (filters?.filterWeek !== null && filters?.filterWeek !== undefined) {
        const w = weeks[filters.filterWeek];
        if (w) return { start: w.start, end: w.end };
    }

    // fallback: semana do filterDate (se existir)
    if (filters?.filterDate) {
        const base = parseYMDLocal(filters.filterDate);
        // acha a semana que contém o dia
        const w = weeks.find((wk) => inRange(base, wk.start, wk.end));
        if (w) return { start: w.start, end: w.end };
    }

    // fallback: primeira semana do mês
    return { start: weeks[0]?.start || new Date(), end: weeks[0]?.end || new Date() };
}

function buildIndexByDateTimeProfessional(appointments) {
    // key: `${date}|${time}|${professional}` => appointment
    const map = new Map();
    for (const a of appointments || []) {
        if (!a?.date || !a?.time || !a?.professional) continue;
        map.set(`${a.date}|${a.time}|${a.professional}`, a);
    }
    return map;
}

function isOccupied(apt) {
    return apt && apt.status !== "Cancelado";
}

export default function WeeklyView({
    appointments,
    professionals,
    activeSpecialtyLabel,
    currentYear,
    currentMonth,
    filters,
    onSlotClick,
}) {
    const [showOnlyFree, setShowOnlyFree] = React.useState(true);
    const [maxShow, setMaxShow] = React.useState(3);

    const { start, end } = React.useMemo(
        () => getWeekRange({ currentYear, currentMonth, filters }),
        [currentYear, currentMonth, filters]
    );

    const days = React.useMemo(() => {
        // cria lista SEG–SEX dentro do range
        const list = [];
        let cur = new Date(start);
        // garante que começa num dia útil (se range vier esquisito)
        for (let i = 0; i < 14 && cur <= end; i++) {
            if (!isWeekend(cur)) list.push(new Date(cur));
            cur = addDays(cur, 1);
        }
        return list.slice(0, 5); // Seg–Sex
    }, [start, end]);

    const slots = React.useMemo(
        () => generateTimeSlots({ start: "08:00", end: "18:40", stepMinutes: 40 }),
        []
    );

    const index = React.useMemo(() => buildIndexByDateTimeProfessional(appointments), [appointments]);

    const dayHeaders = ["Seg", "Ter", "Qua", "Qui", "Sex"];

    const getDayLabel = (d) => {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        return `${dd}/${mm}`;
    };

    const getFreeTimesFor = (dateYMD, professional) => {
        const free = [];
        for (const t of slots) {
            const key = `${dateYMD}|${t}|${professional}`;
            const apt = index.get(key);

            // cancelado conta como vago (igual sua regra)
            if (!apt || (apt && apt.status === "Cancelado")) free.push(t);
        }
        return free;
    };

    const getBusyCountFor = (dateYMD, professional) => {
        let c = 0;
        for (const t of slots) {
            const apt = index.get(`${dateYMD}|${t}|${professional}`);
            if (isOccupied(apt)) c++;
        }
        return c;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <i className="fas fa-table-cells-large text-teal-700" />
                        Semanal (Profissional × Dias)
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Atendimento: <span className="font-semibold">08:00 → 18:40</span> (40min) • Clique em uma vaga para agendar.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowOnlyFree((v) => !v)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold border ${showOnlyFree ? "bg-teal-600 text-white border-teal-700" : "bg-white text-gray-700 border-gray-300"
                            }`}
                    >
                        {showOnlyFree ? "Mostrando só vagas" : "Mostrando tudo"}
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 font-semibold">Mostrar:</span>
                        {[3, 5, 8].map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setMaxShow(n)}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${maxShow === n ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"
                                    }`}
                            >
                                {n} vagas
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                    {/* Header */}
                    <div className="grid grid-cols-[240px_repeat(5,minmax(140px,1fr))] gap-2 mb-2">
                        <div className="px-3 py-2 text-sm font-bold text-gray-700">Profissional</div>
                        {days.map((d, i) => (
                            <div key={i} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-bold text-gray-900">{dayHeaders[i]}</div>
                                    <div className="text-xs font-semibold text-gray-600">{getDayLabel(d)}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Rows */}
                    <div className="space-y-2">
                        {(professionals || []).map((pro) => (
                            <div
                                key={pro}
                                className="grid grid-cols-[240px_repeat(5,minmax(140px,1fr))] gap-2"
                            >
                                <div className="px-3 py-3 rounded-lg bg-white border border-gray-200">
                                    <div className="text-sm font-bold text-gray-900 truncate">{pro}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {activeSpecialtyLabel ? `Especialidade: ${activeSpecialtyLabel}` : "—"}
                                    </div>
                                </div>

                                {days.map((d, idx) => {
                                    const dateYMD = formatDateLocal(d);
                                    const freeTimes = getFreeTimesFor(dateYMD, pro);
                                    const busyCount = getBusyCountFor(dateYMD, pro);

                                    const showTimes = freeTimes.slice(0, maxShow);
                                    const extra = Math.max(0, freeTimes.length - showTimes.length);

                                    return (
                                        <div
                                            key={idx}
                                            className="rounded-lg border border-gray-200 bg-gray-50 p-2"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-gray-700">
                                                    {freeTimes.length} vagas
                                                </span>
                                                <span className="text-[11px] font-semibold text-gray-600">
                                                    {busyCount} ocupados
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5">
                                                {/* VAGAS */}
                                                {showTimes.map((t) => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() =>
                                                            onSlotClick({
                                                                __isEmptySlot: true,
                                                                date: dateYMD,
                                                                time: t,
                                                                professional: pro,
                                                            })
                                                        }
                                                        className="px-2 py-1 rounded-md text-xs font-bold bg-emerald-200 text-emerald-900 border border-emerald-300 hover:bg-emerald-300"
                                                        title="Clique para agendar"
                                                    >
                                                        {t}
                                                    </button>
                                                ))}

                                                {extra > 0 && (
                                                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-gray-200 text-gray-800 border border-gray-300">
                                                        +{extra}
                                                    </span>
                                                )}

                                                {/* OCUPADOS (opcional) */}
                                                {!showOnlyFree && (
                                                    <>
                                                        <div className="w-full h-px bg-gray-200 my-1" />
                                                        {slots.map((t) => {
                                                            const apt = index.get(`${dateYMD}|${t}|${pro}`);
                                                            if (!isOccupied(apt)) return null;

                                                            return (
                                                                <button
                                                                    key={t}
                                                                    type="button"
                                                                    onClick={() => onSlotClick(apt)}
                                                                    className="px-2 py-1 rounded-md text-xs font-bold bg-yellow-200 text-yellow-900 border border-yellow-300 hover:bg-yellow-300"
                                                                    title={apt?.patient ? `Ocupado: ${apt.patient}` : "Ocupado"}
                                                                >
                                                                    {t}
                                                                </button>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* legenda */}
                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-emerald-300 border border-emerald-400" />
                            <span className="text-gray-700 font-semibold">Vago (clique para agendar)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-yellow-300 border border-yellow-400" />
                            <span className="text-gray-700 font-semibold">Ocupado</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
