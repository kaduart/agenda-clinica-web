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

    return (
        <div className="relative z-10 pointer-events-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
            {/* Cabeçalho */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
                        <i className="fas fa-filter text-white text-sm"></i>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Filtros</h2>
                </div>

                <div className="flex flex-wrap gap-2 relative z-10">
                    <button
                        onClick={onNewAppointment}
                        className="relative z-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        <i className="fas fa-plus"></i> Novo Agendamento
                    </button>

                    <button
                        onClick={onOpenProfessionals}
                        className="relative z-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        <i className="fas fa-user-md"></i> Profissionais
                    </button>

                    {hasActiveFilters && (
                        <button
                            onClick={onResetFilters}
                            className="relative z-10 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                            <i className="fas fa-times-circle"></i> Limpar Filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Badge de filtros ativos - só aparece quando há algo filtrado */}
            {hasActiveFilters && (
                <div className="mb-4 p-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex flex-wrap gap-2">
                            {filters.filterPatientName && (
                                <span className="px-3 py-1.5 bg-white text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 shadow-sm">
                                    <i className="fas fa-search text-emerald-600"></i>
                                    Paciente: {filters.filterPatientName}
                                    <button
                                        onClick={() => setFilters((p) => ({ ...p, filterPatientName: "" }))}
                                        className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                            {filters.filterDate && (
                                <span className="px-3 py-1.5 bg-white text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 shadow-sm">
                                    <i className="fas fa-calendar-day text-emerald-600"></i>
                                    Data: {filters.filterDate}
                                    <button
                                        onClick={() => setFilters((p) => ({ ...p, filterDate: "" }))}
                                        className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                            {filters.filterProfessional && (
                                <span className="px-3 py-1.5 bg-white text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 shadow-sm">
                                    <i className="fas fa-user-md text-emerald-600"></i>
                                    {filters.filterProfessional}
                                    <button
                                        onClick={() => setFilters((p) => ({ ...p, filterProfessional: "" }))}
                                        className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                            {filters.filterStatus && (
                                <span className="px-3 py-1.5 bg-white text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 shadow-sm">
                                    <i className="fas fa-flag text-emerald-600"></i>
                                    {filters.filterStatus}
                                    <button
                                        onClick={() => setFilters((p) => ({ ...p, filterStatus: "" }))}
                                        className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                            {filters.filterDay && (
                                <span className="px-3 py-1.5 bg-white text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 shadow-sm">
                                    <i className="fas fa-calendar-week text-emerald-600"></i>
                                    {["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][Number(filters.filterDay)] || filters.filterDay}
                                    <button
                                        onClick={() => setFilters((p) => ({ ...p, filterDay: "" }))}
                                        className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                            {filters.filterWeek !== null && (
                                <span className="px-3 py-1.5 bg-white text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 shadow-sm">
                                    <i className="fas fa-calendar-alt text-emerald-600"></i>
                                    Semana {filters.filterWeek + 1}
                                    <button
                                        onClick={() => setFilters((p) => ({ ...p, filterWeek: null }))}
                                        className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1"
                            onClick={onResetFilters}
                        >
                            <i className="fas fa-times-circle"></i>
                            Limpar todos
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(240px,1.35fr)_minmax(180px,0.75fr)_minmax(240px,1fr)_auto] gap-3 items-end">
            {/* Busca por paciente - prioridade máxima para o comercial encontrar rápido entre várias sessões */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <i className="fas fa-search text-emerald-600"></i>
                    Buscar paciente
                </label>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Digite o nome do paciente..."
                        className="w-full p-2.5 pl-10 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 text-gray-700 text-sm"
                        value={filters.filterPatientName || ""}
                        onChange={(e) => {
                            setFilters((prev) => ({ ...prev, filterPatientName: e.target.value }));
                        }}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <i className="fas fa-search"></i>
                    </div>
                    {filters.filterPatientName && (
                        <button
                            type="button"
                            onClick={() => setFilters((prev) => ({ ...prev, filterPatientName: "" }))}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                            aria-label="Limpar busca"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Filtros rápidos: Data + Profissional sempre visíveis, avançados escondidos */}
                {/* Data */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <i className="fas fa-calendar text-emerald-600"></i>
                        Data específica
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="dd/mm/aaaa"
                            className="w-full p-2.5 pr-10 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 text-gray-700 text-sm"
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
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                            aria-label="Abrir calendário"
                        >
                            <i className="fas fa-calendar"></i>
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
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <i className="fas fa-user-md text-emerald-600"></i>
                        Profissional
                    </label>
                    <div className="relative">
                        <select
                            className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 appearance-none text-gray-700 bg-white text-sm"
                            value={filters.filterProfessional}
                            onChange={(e) => {
                                setFilters((prev) => ({ ...prev, filterProfessional: e.target.value }));
                            }}
                        >
                            <option value="">Todos os profissionais</option>
                            <option value="livre">📅 Horários livres</option>
                            {professionals.map((p, idx) => (
                                <option key={idx} value={p.fullName}>
                                    {p.fullName}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                            <i className="fas fa-chevron-down"></i>
                        </div>
                    </div>
                </div>

                {/* Toggle de filtros avançados */}
                <div className="flex items-end h-full">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced((v) => !v)}
                        className="w-full lg:w-auto h-[42px] px-4 border-2 border-gray-200 hover:border-emerald-400 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-emerald-700 transition-all duration-200"
                    >
                        <i className={`fas fa-sliders-h`}></i>
                        {showAdvanced ? "Menos filtros" : "Mais filtros"}
                        <i className={`fas fa-chevron-${showAdvanced ? "up" : "down"} text-xs`}></i>
                    </button>
                </div>
            </div>

            {/* Filtros avançados: Status + Dia da semana */}
            {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(240px,340px)_minmax(220px,300px)] gap-3 mt-3 pt-3 border-t border-gray-100 justify-start">
                    {/* Status */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                            <i className="fas fa-flag text-emerald-600"></i>
                            Status
                        </label>
                        <div className="relative">
                            <select
                                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 appearance-none text-gray-700 bg-white text-sm"
                                value={filters.filterStatus}
                                onChange={(e) => {
                                    setFilters((prev) => ({ ...prev, filterStatus: e.target.value }));
                                }}
                            >
                                <option value="">Todos os status</option>
                                <option value="Confirmado">✅ Compareceu</option>
                                <option value="Pendente">⏳ Pendente</option>
                                <option value="Cancelado">❌ Cancelado</option>
                            </select>
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                                <i className="fas fa-chevron-down"></i>
                            </div>
                        </div>
                    </div>

                    {/* Dia da semana */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                            <i className="fas fa-calendar-week text-emerald-600"></i>
                            Dia da semana
                            {filters.filterDate && (
                                <span className="text-xs font-normal text-gray-500 ml-1">(desativado)</span>
                            )}
                        </label>
                        <div className="relative">
                            <select
                                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 appearance-none text-gray-700 bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
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
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                                <i className="fas fa-chevron-down"></i>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
