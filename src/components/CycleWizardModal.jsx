import { useEffect, useMemo, useState } from "react";

function pad2(n) {
    return String(n).padStart(2, "0");
}

function parseYMD(ymd) {
    // ymd: "YYYY-MM-DD"
    const [y, m, d] = (ymd || "").split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 12, 0, 0, 0); // meio-dia pra evitar bug de fuso
}

function formatYMD(date) {
    const y = date.getFullYear();
    const m = pad2(date.getMonth() + 1);
    const d = pad2(date.getDate());
    return `${y}-${m}-${d}`;
}

function lastDayOfMonth(year, monthIndex0) {
    return new Date(year, monthIndex0 + 1, 0).getDate(); // dia 0 do mês seguinte
}

function addOneMonthSameDayOrLast(ymd) {
    const d = parseYMD(ymd);
    if (!d) return null;

    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();

    const targetMonth = m + 1;
    const ty = y + Math.floor(targetMonth / 12);
    const tm = targetMonth % 12;

    const maxDay = lastDayOfMonth(ty, tm);
    const safeDay = Math.min(day, maxDay);

    const out = new Date(ty, tm, safeDay, 12, 0, 0, 0);
    return formatYMD(out);
}

function dowFromYMD(ymd) {
    const d = parseYMD(ymd);
    if (!d) return 0;
    return d.getDay(); // 0=dom ... 6=sab
}

function generateSlots({ startYMD, endYMD, pattern, includeEnd = true }) {
    const start = parseYMD(startYMD);
    const end = parseYMD(endYMD);
    if (!start || !end) return [];

    const endTime = includeEnd ? end.getTime() : (new Date(end.getTime() - 24 * 3600 * 1000)).getTime();

    const set = new Set();
    const out = [];

    for (let t = start.getTime(); t <= endTime; t += 24 * 3600 * 1000) {
        const d = new Date(t);
        const ymd = formatYMD(d);
        const dow = d.getDay();

        for (const p of pattern) {
            if (p && Number(p.dow) === dow && p.time) {
                const key = `${ymd}-${p.time}`;
                if (!set.has(key)) {
                    set.add(key);
                    out.push({ date: ymd, time: p.time });
                }
            }
        }
    }

    out.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
    return out;
}

const DOW_LABELS = [
    { v: 0, l: "Dom" },
    { v: 1, l: "Seg" },
    { v: 2, l: "Ter" },
    { v: 3, l: "Qua" },
    { v: 4, l: "Qui" },
    { v: 5, l: "Sex" },
    { v: 6, l: "Sáb" },
];

export default function CycleWizardModal({ open, appointment, onClose, onConfirm }) {
    const seedDate = appointment?.date || "";
    const seedTime = appointment?.time || "";

    const [startDate, setStartDate] = useState(seedDate);
    const [startTime, setStartTime] = useState(seedTime);
    const [includeEndDate, setIncludeEndDate] = useState(true);

    const [sessionsPerWeek, setSessionsPerWeek] = useState(1);
    const [pattern, setPattern] = useState([{ dow: 0, time: seedTime || "16:00" }]);

    const endDate = useMemo(() => addOneMonthSameDayOrLast(startDate) || "", [startDate]);

    // quando abre/ troca appointment, reseta
    useEffect(() => {
        if (!open) return;
        setStartDate(seedDate);
        setStartTime(seedTime);
        setSessionsPerWeek(1);
        setPattern([{ dow: dowFromYMD(seedDate), time: seedTime || "16:00" }]);
        setIncludeEndDate(true);
    }, [open, seedDate, seedTime]);

    // ajusta tamanho do pattern conforme sessionsPerWeek
    useEffect(() => {
        setPattern((prev) => {
            const base = prev?.[0] || { dow: dowFromYMD(startDate), time: startTime || "16:00" };
            const next = Array.from({ length: sessionsPerWeek }, (_, i) => prev?.[i] || base);
            // evita duplicar exatamente o mesmo dia/hora em 2x/3x
            return next.map((p, idx) => (idx === 0 ? p : { ...p, dow: (p.dow + idx) % 7 }));
        });
    }, [sessionsPerWeek]); // eslint-disable-line

    const previewSlots = useMemo(() => {
        const normalizedPattern = pattern.map((p, idx) => ({
            dow: Number(p?.dow ?? 0),
            time: (idx === 0 ? startTime : p?.time) || startTime || "16:00",
        }));
        return generateSlots({
            startYMD: startDate,
            endYMD: endDate,
            includeEnd: includeEndDate,
            pattern: normalizedPattern,
        });
    }, [startDate, endDate, includeEndDate, startTime, pattern]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative w-[min(900px,95vw)] max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-2xl border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-extrabold text-gray-900">Gerar sessões do ciclo (20→20)</h3>
                        <p className="text-sm text-gray-600">
                            Base: <span className="font-semibold">{appointment?.patient || "Paciente"}</span> •{" "}
                            {seedDate || "—"} {seedTime || ""}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                        onClick={onClose}
                        title="Fechar"
                    >
                        <i className="fas fa-xmark" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Ciclo */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="block">
                            <span className="text-xs font-bold text-gray-700">Data início (referência)</span>
                            <input
                                type="date"
                                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </label>

                        <label className="block">
                            <span className="text-xs font-bold text-gray-700">Hora base</span>
                            <input
                                type="time"
                                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </label>

                        <label className="block">
                            <span className="text-xs font-bold text-gray-700">Data fim (automático)</span>
                            <input
                                type="date"
                                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50"
                                value={endDate}
                                readOnly
                            />
                            <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={includeEndDate}
                                    onChange={(e) => setIncludeEndDate(e.target.checked)}
                                />
                                Incluir a data final no ciclo
                            </label>
                        </label>
                    </div>

                    {/* Frequência */}
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <label className="block">
                            <span className="text-xs font-bold text-gray-700">Sessões por semana</span>
                            <select
                                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
                                value={sessionsPerWeek}
                                onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                            >
                                <option value={1}>1x / semana</option>
                                <option value={2}>2x / semana</option>
                                <option value={3}>3x / semana</option>
                            </select>
                        </label>

                        <div className="text-xs text-gray-600">
                            Prévia: <span className="font-extrabold text-gray-900">{previewSlots.length}</span> sessão(ões)
                        </div>
                    </div>

                    {/* Padrão semanal */}
                    <div className="space-y-3">
                        <div className="text-xs font-extrabold text-gray-700">Padrão semanal</div>

                        {pattern.map((p, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                <div className="text-sm font-bold text-gray-700">
                                    {idx === 0 ? "Slot base" : `Slot ${idx + 1}`}
                                </div>

                                <label className="block">
                                    <span className="text-xs font-bold text-gray-700">Dia da semana</span>
                                    <select
                                        className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
                                        value={p.dow}
                                        onChange={(e) => {
                                            const v = Number(e.target.value);
                                            setPattern((prev) => prev.map((x, i) => (i === idx ? { ...x, dow: v } : x)));
                                        }}
                                        disabled={idx === 0} // base segue o startDate
                                        title={idx === 0 ? "O slot base segue o dia do início" : ""}
                                    >
                                        {DOW_LABELS.map((d) => (
                                            <option key={d.v} value={d.v}>
                                                {d.l}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-xs font-bold text-gray-700">Hora</span>
                                    <input
                                        type="time"
                                        className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2"
                                        value={idx === 0 ? startTime : (p.time || startTime)}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (idx === 0) setStartTime(v);
                                            setPattern((prev) => prev.map((x, i) => (i === idx ? { ...x, time: v } : x)));
                                        }}
                                    />
                                </label>
                            </div>
                        ))}

                        <div className="text-xs text-gray-600">
                            * O primeiro slot segue o dia do <b>início</b>. Os demais você ajusta conforme a rotina do paciente.
                        </div>
                    </div>

                    {/* Prévia */}
                    <div className="border border-gray-200 rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-extrabold text-gray-900">Prévia do ciclo</div>
                            <div className="text-xs text-gray-600">{startDate} → {endDate}</div>
                        </div>

                        <div className="mt-3 max-h-48 overflow-auto text-sm text-gray-800 space-y-1">
                            {previewSlots.map((s, i) => (
                                <div key={`${s.date}-${s.time}-${i}`} className="flex items-center justify-between">
                                    <span className="font-semibold">{s.date}</span>
                                    <span className="font-extrabold">{s.time}</span>
                                </div>
                            ))}
                            {previewSlots.length === 0 && (
                                <div className="text-gray-500">Nenhum slot gerado (verifique padrão e datas).</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 disabled:opacity-50"
                        disabled={!appointment || previewSlots.length === 0}
                        onClick={() => {
                            onConfirm?.({
                                cycleStartDate: startDate,
                                cycleEndDate: endDate,
                                includeEndDate,
                                sessionsPerWeek,
                                weeklyPattern: pattern,
                                selectedSlots: previewSlots,
                                calculationMode: "sessions",
                                totalSessions: previewSlots.length,
                            });
                        }}
                    >
                        Gerar sessões
                    </button>
                </div>
            </div>
        </div>
    );
}
