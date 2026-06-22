import { getWeeksInMonth } from "../utils/date";

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

    return (
        <div className="relative z-10 pointer-events-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            {/* Cabeçalho */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
                        <i className="fas fa-filter text-white text-xl"></i>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Filtros</h2>
                        <p className="text-gray-600 text-sm">Filtre os agendamentos</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 relative z-10">
                    <button
                        onClick={onNewAppointment}
                        className="relative z-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-5 py-3 rounded-xl flex items-center gap-3 font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        <i className="fas fa-plus"></i> Novo Agendamento
                    </button>

                    <button
                        onClick={onOpenProfessionals}
                        className="relative z-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-3 font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        <i className="fas fa-user-md"></i> Profissionais
                    </button>

                    <button
                        onClick={onResetFilters}
                        className="relative z-10 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-5 py-3 rounded-xl flex items-center gap-3 font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        <i className="fas fa-times-circle"></i> Limpar Filtros
                    </button>
                </div>
            </div>

            {/* Badge de filtros ativos */}
            <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        {filters.filterDate && (
                            <span className="px-4 py-2 bg-white text-emerald-700 rounded-xl text-sm font-semibold flex items-center gap-2 border border-emerald-200 shadow-sm">
                                <i className="fas fa-calendar-day text-emerald-600"></i>
                                Data: {filters.filterDate}
                                <button
                                    onClick={() => setFilters((p) => ({ ...p, filterDate: "" }))}
                                    className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {filters.filterProfessional && (
                            <span className="px-4 py-2 bg-white text-emerald-700 rounded-xl text-sm font-semibold flex items-center gap-2 border border-emerald-200 shadow-sm">
                                <i className="fas fa-user-md text-emerald-600"></i>
                                {filters.filterProfessional}
                                <button
                                    onClick={() => setFilters((p) => ({ ...p, filterProfessional: "" }))}
                                    className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {filters.filterStatus && (
                            <span className="px-4 py-2 bg-white text-emerald-700 rounded-xl text-sm font-semibold flex items-center gap-2 border border-emerald-200 shadow-sm">
                                <i className="fas fa-flag text-emerald-600"></i>
                                {filters.filterStatus}
                                <button
                                    onClick={() => setFilters((p) => ({ ...p, filterStatus: "" }))}
                                    className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {filters.filterDay && (
                            <span className="px-4 py-2 bg-white text-emerald-700 rounded-xl text-sm font-semibold flex items-center gap-2 border border-emerald-200 shadow-sm">
                                <i className="fas fa-calendar-week text-emerald-600"></i>
                                {["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][Number(filters.filterDay)] || filters.filterDay}
                                <button
                                    onClick={() => setFilters((p) => ({ ...p, filterDay: "" }))}
                                    className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {filters.filterWeek !== null && (
                            <span className="px-4 py-2 bg-white text-emerald-700 rounded-xl text-sm font-semibold flex items-center gap-2 border border-emerald-200 shadow-sm">
                                <i className="fas fa-calendar-alt text-emerald-600"></i>
                                Semana {filters.filterWeek + 1}
                                <button
                                    onClick={() => setFilters((p) => ({ ...p, filterWeek: null }))}
                                    className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                    </div>

                    {Object.values(filters).filter(v => v !== "" && v !== null).length > 0 && (
                        <button
                            type="button"
                            className="text-sm text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-2"
                            onClick={onResetFilters}
                        >
                            <i className="fas fa-times-circle"></i>
                            Limpar todos
                        </button>
                    )}
                </div>
            </div>

            {/* Filtros principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {/* Data */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <i className="fas fa-calendar text-emerald-600"></i>
                        Data específica
                    </label>
                    <input
                        type="date"
                        className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 text-gray-700"
                        value={filters.filterDate}
                        onChange={(e) => {
                            const selectedDate = e.target.value;

                            // ✅ LÓGICA ORIGINAL
                            setFilters((prev) => ({
                                ...prev,
                                filterDate: selectedDate,
                                filterDay: "",      // ⚠️ limpa dia
                                filterWeek: null    // ⚠️ limpa semana
                            }));
                        }}
                    />
                    {filters.filterDate && (
                        <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
                            <i className="fas fa-check-circle"></i>
                            Mostrando apenas esta data
                        </p>
                    )}
                </div>

                {/* Profissional */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <i className="fas fa-user-md text-emerald-600"></i>
                        Profissional
                    </label>
                    <div className="relative">
                        <select
                            className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 appearance-none text-gray-700 bg-white"
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
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                            <i className="fas fa-chevron-down"></i>
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <i className="fas fa-flag text-emerald-600"></i>
                        Status
                    </label>
                    <div className="relative">
                        <select
                            className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 appearance-none text-gray-700 bg-white"
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
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                            <i className="fas fa-chevron-down"></i>
                        </div>
                    </div>
                </div>

                {/* Dia da semana */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <i className="fas fa-calendar-week text-emerald-600"></i>
                        Dia da semana
                        {filters.filterDate && (
                            <span className="text-xs font-normal text-gray-500 ml-2">(desativado)</span>
                        )}
                    </label>
                    <div className="relative">
                        <select
                            className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 appearance-none text-gray-700 bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
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
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                            <i className="fas fa-chevron-down"></i>
                        </div>
                    </div>
                    {!filters.filterDate && filters.filterDay && (
                        <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
                            <i className="fas fa-check-circle"></i>
                            Filtrando por dia da semana
                        </p>
                    )}
                </div>
            </div>

        </div>
    );
}