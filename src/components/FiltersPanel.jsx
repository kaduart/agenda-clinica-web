import { getWeeksInMonth } from "../utils/date";
import { useRef, useState, useEffect } from "react";

export default function FiltersPanel({
    professionals,
    currentYear,
    currentMonth,
    filters,
    setFilters,
    onNewAppointment,
    onOpenProfessionals,
    onResetFilters
}) {
    const weeksInMonth = getWeeksInMonth(currentYear, currentMonth);
    const dateInputRef = useRef(null);

    const formatDateToBR = (isoDate) => {
        if (!isoDate) return '';
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    };

    const parseBRDateToISO = (brDate) => {
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(brDate)) return '';
        const [d, m, y] = brDate.split('/');
        return `${y}-${m}-${d}`;
    };

    const [dateInputValue, setDateInputValue] = useState(formatDateToBR(filters.filterDate));
    // Dia da semana vem pré-preenchido com o dia de hoje por padrão (e fica desativado
    // enquanto houver data específica), então só conta como filtro "ativo" de verdade
    // quando não há data específica selecionada.
    const isDayFilterActive = !!filters.filterDay && !filters.filterDate;
    const [showAdvanced, setShowAdvanced] = useState(!!filters.filterStatus || isDayFilterActive);

    // Sincroniza o input de texto quando a data é alterada externamente (date picker ou limpar filtros)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDateInputValue(formatDateToBR(filters.filterDate));
    }, [filters.filterDate]);

    // Mantém os filtros avançados visíveis caso já estejam ativos (ex: vindos de outra tela)
    useEffect(() => {
        if (filters.filterStatus || isDayFilterActive) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowAdvanced(true);
        }
    }, [filters.filterStatus, isDayFilterActive]);

    const hasActiveFilters = Object.values(filters).filter(v => v !== "" && v !== null).length > 0;

    // Navegação por dia (‹ Hoje ›): mexe só no filtro de data, igual a digitar a data
    const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const todayISO = toISO(new Date());
    const shiftDay = (delta) => {
        const base = filters.filterDate ? new Date(`${filters.filterDate}T12:00:00`) : new Date();
        base.setDate(base.getDate() + delta);
        setFilters((prev) => ({ ...prev, filterDate: toISO(base), filterDay: "", filterWeek: null }));
    };
    const goToday = () => setFilters((prev) => ({ ...prev, filterDate: todayISO, filterDay: "", filterWeek: null }));
    const dayLabel = filters.filterDate
        ? new Date(`${filters.filterDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "")
        : "Sem data";

    const fieldCls = "w-full h-9 px-3 border border-fi-line rounded-lg bg-white text-sm text-fi-ink focus:outline-none focus:border-fi-accent focus:ring-2 focus:ring-fi-accent/20 transition-colors";
    const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-fi-muted mb-1";
    const chipCls = "h-7 pl-2.5 pr-1 bg-fi-soft text-fi-deep rounded-full text-xs font-semibold inline-flex items-center gap-1.5";
    const chipX = "w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-white/70 transition-colors";

    return (
        <div className="relative z-10 pointer-events-auto bg-white rounded-xl border border-fi-line p-3 sm:p-4 space-y-3">
            {/* Linha 1: dia + ações */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-xl border border-fi-line bg-fi-bg p-0.5" aria-label="Navegar por dia">
                    <button type="button" onClick={() => shiftDay(-1)} className="h-8 w-8 rounded-lg text-fi-ink hover:bg-white" aria-label="Dia anterior">
                        <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    <button
                        type="button"
                        onClick={goToday}
                        className={`h-8 px-3 rounded-lg text-sm font-semibold ${filters.filterDate === todayISO ? "bg-white text-fi-deep shadow-sm" : "text-fi-ink hover:bg-white"}`}
                    >
                        Hoje
                    </button>
                    <span className="px-2 font-head text-sm font-bold text-fi-ink tabular-nums capitalize whitespace-nowrap">{dayLabel}</span>
                    <button type="button" onClick={() => shiftDay(1)} className="h-8 w-8 rounded-lg text-fi-ink hover:bg-white" aria-label="Próximo dia">
                        <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                </div>

                <div className="ml-auto flex flex-wrap gap-2">
                    {hasActiveFilters && (
                        <button
                            onClick={onResetFilters}
                            className="h-9 px-3 rounded-lg text-sm font-semibold text-fi-muted hover:text-fi-ink hover:bg-fi-bg inline-flex items-center gap-1.5"
                        >
                            <i className="fas fa-times-circle text-xs"></i> Limpar filtros
                        </button>
                    )}
                    <button
                        onClick={onOpenProfessionals}
                        className="h-9 px-3 rounded-lg border border-fi-line bg-white text-sm font-semibold text-fi-ink hover:bg-fi-bg inline-flex items-center gap-1.5"
                    >
                        <i className="fas fa-user-md text-xs text-fi-muted"></i> Profissionais
                    </button>
                    <button
                        onClick={onNewAppointment}
                        className="h-9 px-4 rounded-lg bg-fi-accent hover:bg-fi-deep text-white text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                        <i className="fas fa-plus text-xs"></i> Novo agendamento
                    </button>
                </div>
            </div>

            {/* Linha 2: filtros principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.4fr)_minmax(150px,0.7fr)_minmax(200px,1fr)_auto] gap-2.5 items-end">
                {/* Busca por paciente - prioridade máxima para o comercial encontrar rápido entre várias sessões */}
                <div>
                    <label className={labelCls} htmlFor="filtro-paciente">Buscar paciente</label>
                    <div className="relative">
                        <input
                            id="filtro-paciente"
                            type="text"
                            placeholder="Digite o nome do paciente..."
                            className={`${fieldCls} pl-9`}
                            value={filters.filterPatientName || ""}
                            onChange={(e) => {
                                setFilters((prev) => ({ ...prev, filterPatientName: e.target.value }));
                            }}
                        />
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-fi-muted"></i>
                        {filters.filterPatientName && (
                            <button
                                type="button"
                                onClick={() => setFilters((prev) => ({ ...prev, filterPatientName: "" }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-fi-bg text-fi-muted hover:text-fi-ink"
                                aria-label="Limpar busca"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>

                {/* Data específica */}
                <div>
                    <label className={labelCls} htmlFor="filtro-data">Data específica</label>
                    <div className="relative">
                        <input
                            id="filtro-data"
                            type="text"
                            placeholder="dd/mm/aaaa"
                            className={`${fieldCls} pr-9 tabular-nums`}
                            value={dateInputValue}
                            onChange={(e) => {
                                let raw = e.target.value.replace(/\D/g, '').substring(0, 8);
                                if (raw.length >= 5) {
                                    raw = raw.replace(/(\d{2})(\d{2})(\d+)/, '$1/$2/$3');
                                } else if (raw.length >= 3) {
                                    raw = raw.replace(/(\d{2})(\d+)/, '$1/$2');
                                }
                                setDateInputValue(raw);
                                if (raw.length === 0) {
                                    setFilters((prev) => ({
                                        ...prev,
                                        filterDate: "",
                                        filterDay: "",
                                        filterWeek: null
                                    }));
                                } else if (raw.length === 10) {
                                    const isoDate = parseBRDateToISO(raw);
                                    setFilters((prev) => ({
                                        ...prev,
                                        filterDate: isoDate,
                                        filterDay: "",
                                        filterWeek: null
                                    }));
                                }
                            }}
                            onBlur={(e) => {
                                const raw = e.target.value.replace(/\D/g, '');
                                if (raw.length !== 8) {
                                    setDateInputValue(formatDateToBR(filters.filterDate));
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => dateInputRef.current?.showPicker?.()}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fi-muted hover:text-fi-accent transition-colors"
                            aria-label="Abrir calendário"
                        >
                            <i className="fas fa-calendar text-sm"></i>
                        </button>
                        <input
                            ref={dateInputRef}
                            type="date"
                            className="absolute opacity-0 w-0 h-0 p-0 border-0"
                            value={filters.filterDate}
                            onChange={(e) => {
                                setFilters((prev) => ({
                                    ...prev,
                                    filterDate: e.target.value,
                                    filterDay: "",
                                    filterWeek: null
                                }));
                            }}
                        />
                    </div>
                </div>

                {/* Profissional */}
                <div>
                    <label className={labelCls} htmlFor="filtro-profissional">Profissional</label>
                    <select
                        id="filtro-profissional"
                        className={fieldCls}
                        value={filters.filterProfessional}
                        onChange={(e) => {
                            setFilters((prev) => ({ ...prev, filterProfessional: e.target.value }));
                        }}
                    >
                        <option value="">Todos os profissionais</option>
                        <option value="livre">Horários livres</option>
                        {professionals.map((p, idx) => (
                            <option key={idx} value={p.fullName}>
                                {p.fullName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Toggle de filtros avançados */}
                <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    aria-expanded={showAdvanced}
                    className="h-9 px-3 border border-fi-line rounded-lg bg-white inline-flex items-center justify-center gap-2 text-sm font-semibold text-fi-ink hover:bg-fi-bg transition-colors"
                >
                    <i className="fas fa-sliders-h text-xs text-fi-muted"></i>
                    {showAdvanced ? "Menos filtros" : "Mais filtros"}
                    <i className={`fas fa-chevron-${showAdvanced ? "up" : "down"} text-[10px] text-fi-muted`}></i>
                </button>
            </div>

            {/* Filtros avançados: Status + Dia da semana */}
            {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(220px,320px)_minmax(200px,280px)] gap-2.5 pt-3 border-t border-fi-line">
                    <div>
                        <label className={labelCls} htmlFor="filtro-status">Status</label>
                        <select
                            id="filtro-status"
                            className={fieldCls}
                            value={filters.filterStatus}
                            onChange={(e) => {
                                setFilters((prev) => ({ ...prev, filterStatus: e.target.value }));
                            }}
                        >
                            <option value="">Todos os status</option>
                            <option value="Confirmado">Compareceu</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Cancelado">Cancelado</option>
                            <option value="Falta avaliação Google">Falta pedir avaliação Google</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelCls} htmlFor="filtro-dia">
                            Dia da semana
                            {filters.filterDate && (
                                <span className="normal-case font-normal tracking-normal ml-1">(desativado com data específica)</span>
                            )}
                        </label>
                        <select
                            id="filtro-dia"
                            className={`${fieldCls} disabled:bg-fi-bg disabled:text-fi-muted disabled:cursor-not-allowed`}
                            value={filters.filterDay}
                            disabled={!!filters.filterDate}
                            onChange={(e) => {
                                setFilters((prev) => ({ ...prev, filterDay: e.target.value }));
                            }}
                        >
                            <option value="">Todos os dias</option>
                            <option value="1">Segunda-feira</option>
                            <option value="2">Terça-feira</option>
                            <option value="3">Quarta-feira</option>
                            <option value="4">Quinta-feira</option>
                            <option value="5">Sexta-feira</option>
                            <option value="6">Sábado</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Filtros ativos - só aparece quando há algo filtrado */}
            {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {filters.filterPatientName && (
                        <span className={chipCls}>
                            <i className="fas fa-search text-[10px]"></i>
                            Paciente: {filters.filterPatientName}
                            <button onClick={() => setFilters((p) => ({ ...p, filterPatientName: "" }))} className={chipX} aria-label="Remover filtro de paciente">×</button>
                        </span>
                    )}
                    {filters.filterDate && (
                        <span className={chipCls}>
                            <i className="fas fa-calendar-day text-[10px]"></i>
                            Data: {formatDateToBR(filters.filterDate)}
                            <button onClick={() => setFilters((p) => ({ ...p, filterDate: "" }))} className={chipX} aria-label="Remover filtro de data">×</button>
                        </span>
                    )}
                    {filters.filterProfessional && (
                        <span className={chipCls}>
                            <i className="fas fa-user-md text-[10px]"></i>
                            {filters.filterProfessional === "livre" ? "Horários livres" : filters.filterProfessional}
                            <button onClick={() => setFilters((p) => ({ ...p, filterProfessional: "" }))} className={chipX} aria-label="Remover filtro de profissional">×</button>
                        </span>
                    )}
                    {filters.filterStatus && (
                        <span className={chipCls}>
                            <i className="fas fa-flag text-[10px]"></i>
                            {filters.filterStatus}
                            <button onClick={() => setFilters((p) => ({ ...p, filterStatus: "" }))} className={chipX} aria-label="Remover filtro de status">×</button>
                        </span>
                    )}
                    {filters.filterDay && (
                        <span className={chipCls}>
                            <i className="fas fa-calendar-week text-[10px]"></i>
                            {["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][Number(filters.filterDay)] || filters.filterDay}
                            <button onClick={() => setFilters((p) => ({ ...p, filterDay: "" }))} className={chipX} aria-label="Remover filtro de dia da semana">×</button>
                        </span>
                    )}
                    {filters.filterWeek !== null && (
                        <span className={chipCls}>
                            <i className="fas fa-calendar-alt text-[10px]"></i>
                            Semana {filters.filterWeek + 1}
                            <button onClick={() => setFilters((p) => ({ ...p, filterWeek: null }))} className={chipX} aria-label="Remover filtro de semana">×</button>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
