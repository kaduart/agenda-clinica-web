// src/components/WeeklyView.jsx
import React from "react";
import { formatDateLocal, getWeeksInMonth, parseYMDLocal } from "../utils/date";
import { generateTimeSlots } from "../utils/timeSlots";
import { SPECIALTIES } from "../config/specialties";

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
    activeSpecialty,
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

    const todayYMD = formatDateLocal(new Date());
    const [expanded, setExpanded] = React.useState(() => new Set());
    const toggleExpanded = (key) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

    const visiblePros = (professionals || []).filter(
        (pro) => !activeSpecialty || activeSpecialty === "todas" || pro.specialty === activeSpecialty
    );

    const patientLabel = (apt) =>
        apt.patientName || apt.patient?.name || apt.patient?.fullName || (typeof apt.patient === "string" ? apt.patient : "");

    const segBtn = (active) =>
        `h-8 px-3 rounded-md text-sm font-semibold transition-colors ${active ? "bg-white text-fi-deep shadow-sm" : "text-fi-muted hover:text-fi-ink"}`;

    const rangeLabel = days.length ? `${getDayLabel(days[0])} a ${getDayLabel(days[days.length - 1])}` : "";

    return (
        <div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 mb-4">
                <div>
                    <h2 className="font-head text-lg font-bold text-fi-ink">Vagas da semana {rangeLabel && <span className="font-semibold text-fi-muted tabular-nums">· {rangeLabel}</span>}</h2>
                    <p className="text-[13px] text-fi-muted mt-0.5">
                        Atendimento das 08:00 às 18:40, de 40 em 40 minutos. Clique numa vaga para agendar.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg bg-fi-bg border border-fi-line p-0.5" role="group" aria-label="O que mostrar">
                        <button type="button" aria-pressed={showOnlyFree} onClick={() => setShowOnlyFree(true)} className={segBtn(showOnlyFree)}>Só vagas</button>
                        <button type="button" aria-pressed={!showOnlyFree} onClick={() => setShowOnlyFree(false)} className={segBtn(!showOnlyFree)}>Vagas e ocupados</button>
                    </div>
                    <div className="inline-flex items-center rounded-lg bg-fi-bg border border-fi-line p-0.5" role="group" aria-label="Quantas vagas mostrar por dia">
                        <span className="px-2 text-[12.5px] font-semibold text-fi-muted">Mostrar</span>
                        {[3, 5, 8].map((n) => (
                            <button key={n} type="button" aria-pressed={maxShow === n} onClick={() => setMaxShow(n)} className={segBtn(maxShow === n)}>
                                {n}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
                <div className="min-w-[980px]">
                    {/* Cabeçalho dos dias */}
                    <div className="grid grid-cols-[220px_repeat(5,minmax(140px,1fr))] gap-2 mb-2">
                        <div className="px-1 py-2 text-[12.5px] font-semibold text-fi-muted self-end">Profissional</div>
                        {days.map((d, i) => {
                            const isToday = formatDateLocal(d) === todayYMD;
                            return (
                                <div key={i} className={`px-3 py-2 rounded-lg border ${isToday ? "bg-fi-soft border-fi-accent/40" : "bg-fi-bg border-fi-line"}`}>
                                    <div className="flex items-baseline justify-between">
                                        <span className={`text-sm font-bold ${isToday ? "text-fi-deep" : "text-fi-ink"}`}>{isToday ? "Hoje" : dayHeaders[i]}</span>
                                        <span className="text-xs font-semibold tabular-nums text-fi-muted">{getDayLabel(d)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {visiblePros.length === 0 && (
                        <div className="py-12 text-center text-sm text-fi-muted">
                            Nenhum profissional nesta especialidade. Escolha outra aba ou cadastre em Profissionais.
                        </div>
                    )}

                    <div className="space-y-2">
                        {visiblePros.map((pro) => {
                            const weekFree = days.reduce((acc, d) => acc + getFreeTimesFor(formatDateLocal(d), pro.fullName).length, 0);
                            const spec = SPECIALTIES[pro.specialty]?.name || activeSpecialtyLabel || "";
                            return (
                                <div key={pro.id || pro.fullName} className="grid grid-cols-[220px_repeat(5,minmax(140px,1fr))] gap-2">
                                    <div className="px-3 py-2.5 rounded-lg bg-white border border-fi-line flex flex-col justify-center">
                                        <div className="text-sm font-semibold text-fi-ink truncate">{pro.fullName}</div>
                                        <div className="text-xs text-fi-muted mt-0.5 truncate">
                                            {spec ? `${spec} · ` : ""}<span className="tabular-nums font-semibold text-fi-deep">{weekFree}</span> vaga{weekFree === 1 ? "" : "s"} na semana
                                        </div>
                                    </div>

                                    {days.map((d, idx) => {
                                        const dateYMD = formatDateLocal(d);
                                        const cellKey = `${pro.fullName}|${dateYMD}`;
                                        const isOpen = expanded.has(cellKey);
                                        const freeTimes = getFreeTimesFor(dateYMD, pro.fullName);
                                        const busyCount = getBusyCountFor(dateYMD, pro.fullName);
                                        const showTimes = isOpen ? freeTimes : freeTimes.slice(0, maxShow);
                                        const extra = Math.max(0, freeTimes.length - showTimes.length);
                                        const isToday = dateYMD === todayYMD;

                                        return (
                                            <div key={idx} className={`rounded-lg border p-2 ${isToday ? "border-fi-accent/40 bg-fi-soft/40" : "border-fi-line bg-white"}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-fi-ink tabular-nums">
                                                        {freeTimes.length} vaga{freeTimes.length === 1 ? "" : "s"}
                                                    </span>
                                                    <span className="text-[11px] text-fi-muted tabular-nums">{busyCount} ocupado{busyCount === 1 ? "" : "s"}</span>
                                                </div>
                                                {/* ocupação do dia: um tracinho por horário */}
                                                <div className="flex gap-[2px] mb-2" aria-hidden="true">
                                                    {slots.map((t) => {
                                                        const apt = index.get(`${dateYMD}|${t}|${pro.fullName}`);
                                                        const occ = isOccupied(apt);
                                                        const pre = occ && apt.operationalStatus === "pre_agendado";
                                                        return <span key={t} className={`h-1.5 flex-1 rounded-[1px] ${pre ? "bg-pink-300" : occ ? "bg-yellow-300" : "bg-emerald-200"}`}></span>;
                                                    })}
                                                </div>

                                                <div className="flex flex-wrap gap-1">
                                                    {showTimes.map((t) => (
                                                        <button
                                                            key={t}
                                                            type="button"
                                                            onClick={() => onSlotClick({ __isEmptySlot: true, date: dateYMD, time: t, professional: pro.fullName })}
                                                            className="h-7 px-2 rounded-md text-xs font-semibold tabular-nums bg-emerald-100 text-emerald-900 border border-emerald-200 hover:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-fi-accent"
                                                            title={`Agendar ${pro.fullName} às ${t}`}
                                                        >
                                                            {t}
                                                        </button>
                                                    ))}

                                                    {(extra > 0 || (isOpen && freeTimes.length > maxShow)) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpanded(cellKey)}
                                                            aria-expanded={isOpen}
                                                            className="h-7 px-2 rounded-md text-xs font-semibold bg-fi-bg text-fi-ink border border-fi-line hover:bg-white"
                                                            title={isOpen ? "Mostrar menos" : "Ver todas as vagas do dia"}
                                                        >
                                                            {isOpen ? "menos" : `+${extra}`}
                                                        </button>
                                                    )}

                                                    {freeTimes.length === 0 && (
                                                        <span className="text-xs text-fi-muted py-1">Dia cheio</span>
                                                    )}

                                                    {!showOnlyFree && busyCount > 0 && (
                                                        <>
                                                            <div className="w-full h-px bg-fi-line my-1" />
                                                            {slots.map((t) => {
                                                                const apt = index.get(`${dateYMD}|${t}|${pro.fullName}`);
                                                                if (!isOccupied(apt)) return null;
                                                                const pre = apt.operationalStatus === "pre_agendado";
                                                                return (
                                                                    <button
                                                                        key={t}
                                                                        type="button"
                                                                        onClick={() => onSlotClick(apt)}
                                                                        className={`h-7 px-2 rounded-md text-xs font-semibold tabular-nums border ${pre
                                                                            ? "bg-pink-100 text-pink-900 border-pink-200 hover:bg-pink-200"
                                                                            : "bg-yellow-100 text-yellow-900 border-yellow-200 hover:bg-yellow-200"}`}
                                                                        title={pre ? `Interesse: ${patientLabel(apt)}` : patientLabel(apt) || "Ocupado"}
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
                            );
                        })}
                    </div>

                    {/* legenda */}
                    <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-fi-muted">
                        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300" />Vago (clique para agendar)</span>
                        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-300" />Ocupado</span>
                        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-pink-200 border border-pink-300" />Interesse (pré-agendamento)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
