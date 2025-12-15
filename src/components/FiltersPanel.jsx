import { getWeeksInMonth, parseYMDLocal } from "../utils/date";

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
                </div>
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
                            setFilters((prev) => ({ ...prev, filterDate: selectedDate }));

                            if (selectedDate) {
                                const d = parseYMDLocal(selectedDate);
                                const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
                                setFilters((prev) => ({ ...prev, filterDay: dayOfWeek.toString() }));
                            }
                        }}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
                    <select
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                        value={filters.filterProfessional}
                        onChange={(e) => setFilters((prev) => ({ ...prev, filterProfessional: e.target.value }))}
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
                        onChange={(e) => setFilters((prev) => ({ ...prev, filterStatus: e.target.value }))}
                    >
                        <option value="">Todos</option>
                        <option value="Confirmado">Confirmado</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dia</label>
                    <select
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                        value={filters.filterDay}
                        onChange={(e) => setFilters((prev) => ({ ...prev, filterDay: e.target.value }))}
                    >
                        <option value="">Todos</option>
                        <option value="1">Segunda</option>
                        <option value="2">Terça</option>
                        <option value="3">Quarta</option>
                        <option value="4">Quinta</option>
                        <option value="5">Sexta</option>
                        <option value="6">Sábado</option>
                    </select>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <i className="fas fa-calendar-week text-teal-700"></i> Semanas do Mês
                </h3>
                <div className="flex flex-wrap gap-2 overflow-x-auto">
                    <button
                        className={`px-3 py-2 rounded-lg font-medium text-sm ${filters.filterWeek === null ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        onClick={() => setFilters((prev) => ({ ...prev, filterWeek: null }))}
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
                                key={index}
                                className={`px-3 py-2 rounded-lg font-medium text-sm relative ${selected
                                    ? "bg-teal-600 text-white"
                                    : isCurrentWeek
                                        ? "bg-orange-200 text-orange-800 hover:bg-orange-300"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                onClick={() => setFilters((prev) => ({ ...prev, filterWeek: index }))}
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
                {["1", "2", "3", "4", "5"].map((day) => (
                    <button
                      type="button"
                        key={day}
                        className={`px-3 py-1.5 rounded-lg font-medium text-sm ${filters.filterDay === day ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        onClick={() => setFilters((prev) => ({ ...prev, filterDay: prev.filterDay === day ? "" : day }))}
                    >
                        {["Seg", "Ter", "Qua", "Qui", "Sex"][Number(day) - 1]}
                    </button>
                ))}
            </div>
        </div>
    );
}
