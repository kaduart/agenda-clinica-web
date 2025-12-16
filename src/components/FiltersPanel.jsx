import { getWeeksInMonth } from "../utils/date";

export default function FiltersPanel({
    professionals,
    currentYear,
    currentMonth,
    filters,
    setFilters,
    onNewAppointment,
    onOpenProfessionals,
}) {
    const weeksInMonth = getWeeksInMonth(currentYear, currentMonth);

    const handleResetFilters = () => {
        console.log("🔄 [FiltersPanel] Limpando filtros...");
        setFilters({
            filterDate: "",
            filterProfessional: "",
            filterStatus: "",
            filterDay: "",
            filterWeek: null,
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <i className="fas fa-filter text-teal-700"></i> Filtros
                </h2>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                        onClick={onNewAppointment}
                    >
                        <i className="fas fa-plus"></i> Novo Agendamento
                    </button>
                    <button
                        type="button"
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                        onClick={onOpenProfessionals}
                    >
                        <i className="fas fa-user-md"></i> Profissionais
                    </button>
                    <button
                        type="button"
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
                        onClick={handleResetFilters}
                    >
                        <i className="fas fa-times-circle"></i> Limpar Filtros
                    </button>
                </div>
            </div>

            {/* Badge de filtros ativos */}
            <div className="mb-4 flex flex-wrap gap-2">
                {filters.filterDate && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold flex items-center gap-1">
                        Data: {filters.filterDate}
                        <button
                            onClick={() => setFilters((p) => ({ ...p, filterDate: "" }))}
                            className="hover:text-blue-900"
                        >
                            ×
                        </button>
                    </span>
                )}
                {filters.filterProfessional && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold flex items-center gap-1">
                        Prof: {filters.filterProfessional}
                        <button
                            onClick={() => setFilters((p) => ({ ...p, filterProfessional: "" }))}
                            className="hover:text-purple-900"
                        >
                            ×
                        </button>
                    </span>
                )}
                {filters.filterStatus && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold flex items-center gap-1">
                        Status: {filters.filterStatus}
                        <button
                            onClick={() => setFilters((p) => ({ ...p, filterStatus: "" }))}
                            className="hover:text-amber-900"
                        >
                            ×
                        </button>
                    </span>
                )}
                {filters.filterDay && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1">
                        Dia: {["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][Number(filters.filterDay)] || filters.filterDay}
                        <button
                            onClick={() => setFilters((p) => ({ ...p, filterDay: "" }))}
                            className="hover:text-green-900"
                        >
                            ×
                        </button>
                    </span>
                )}
                {filters.filterWeek !== null && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold flex items-center gap-1">
                        Semana: {filters.filterWeek + 1}
                        <button
                            onClick={() => setFilters((p) => ({ ...p, filterWeek: null }))}
                            className="hover:text-orange-900"
                        >
                            ×
                        </button>
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input
                        type="date"
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                        value={filters.filterDate}
                        onChange={(e) => {
                            const selectedDate = e.target.value;
                            console.log("📅 [FiltersPanel] Data selecionada:", selectedDate);

                            // ✅ Quando seleciona uma data, LIMPA filterDay e filterWeek
                            setFilters((prev) => ({
                                ...prev,
                                filterDate: selectedDate,
                                filterDay: "",      // ⚠️ limpa dia
                                filterWeek: null    // ⚠️ limpa semana
                            }));
                        }}
                    />
                    {filters.filterDate && (
                        <p className="text-xs text-teal-600 mt-1 font-semibold">
                            ✓ Mostrando apenas esta data
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
                    <select
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                        value={filters.filterProfessional}
                        onChange={(e) => {
                            console.log("👤 [FiltersPanel] Profissional:", e.target.value);
                            setFilters((prev) => ({ ...prev, filterProfessional: e.target.value }));
                        }}
                    >
                        <option value="">Todos</option>
                        <option value="livre">Livre</option>
                        {professionals.map((p, idx) => (
                            <option key={idx} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                        value={filters.filterStatus}
                        onChange={(e) => {
                            console.log("🏷️ [FiltersPanel] Status:", e.target.value);
                            setFilters((prev) => ({ ...prev, filterStatus: e.target.value }));
                        }}
                    >
                        <option value="">Todos</option>
                        <option value="Confirmado">Confirmado</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dia da Semana
                        {filters.filterDate && (
                            <span className="text-xs text-gray-500 ml-1">(desativado)</span>
                        )}
                    </label>
                    <select
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        value={filters.filterDay}
                        disabled={!!filters.filterDate}
                        onChange={(e) => {
                            console.log("📆 [FiltersPanel] Dia da semana:", e.target.value);
                            setFilters((prev) => ({ ...prev, filterDay: e.target.value }));
                        }}
                    >
                        <option value="">Todos</option>
                        <option value="1">Segunda</option>
                        <option value="2">Terça</option>
                        <option value="3">Quarta</option>
                        <option value="4">Quinta</option>
                        <option value="5">Sexta</option>
                        <option value="6">Sábado</option>
                    </select>
                    {!filters.filterDate && filters.filterDay && (
                        <p className="text-xs text-teal-600 mt-1 font-semibold">
                            ✓ Filtrando por dia da semana
                        </p>
                    )}
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <i className="fas fa-calendar-week text-teal-700"></i> Semanas do Mês
                    {filters.filterDate && (
                        <span className="text-xs text-gray-500">(desativado enquanto data específica estiver selecionada)</span>
                    )}
                </h3>
                <div className="flex flex-wrap gap-2 overflow-x-auto">
                    <button
                        type="button"
                        disabled={!!filters.filterDate}
                        className={`px-3 py-2 rounded-lg font-medium text-sm ${filters.filterWeek === null
                                ? "bg-teal-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        onClick={() => {
                            console.log("📅 [FiltersPanel] Semana: Mês Inteiro");
                            setFilters((prev) => ({ ...prev, filterWeek: null }));
                        }}
                    >
                        Mês Inteiro
                    </button>

                    {weeksInMonth.map((week, index) => {
                        const isCurrentWeek = (() => {
                            const today = new Date();
                            return today >= week.start && today <= week.end;
                        })();

                        const selected = filters.filterWeek === index;

                        return (
                            <button
                                type="button"
                                key={index}
                                disabled={!!filters.filterDate}
                                className={`px-3 py-2 rounded-lg font-medium text-sm relative ${selected
                                        ? "bg-teal-600 text-white"
                                        : isCurrentWeek
                                            ? "bg-orange-200 text-orange-800 hover:bg-orange-300"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                onClick={() => {
                                    console.log(`📅 [FiltersPanel] Semana ${index + 1} selecionada`);
                                    setFilters((prev) => ({ ...prev, filterWeek: index }));
                                }}
                            >
                                {isCurrentWeek && !selected && (
                                    <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs px-1 rounded-full">
                                        •
                                    </span>
                                )}
                                Semana {index + 1}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700 self-center">Atalhos:</span>
                {["1", "2", "3", "4", "5"].map((day) => (
                    <button
                        type="button"
                        key={day}
                        disabled={!!filters.filterDate}
                        className={`px-3 py-1.5 rounded-lg font-medium text-sm ${filters.filterDay === day
                                ? "bg-teal-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        onClick={() => {
                            const newDay = filters.filterDay === day ? "" : day;
                            console.log("📆 [FiltersPanel] Toggle dia:", newDay);
                            setFilters((prev) => ({ ...prev, filterDay: newDay }));
                        }}
                    >
                        {["Seg", "Ter", "Qua", "Qui", "Sex"][Number(day) - 1]}
                    </button>
                ))}
            </div>
        </div>
    );
}