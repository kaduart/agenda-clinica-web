export default function Header({ view, setView }) {
    return (
        <header className="bg-teal-500 border-b border-gray-200 py-4 px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <img
                        className="w-14 h-14 object-contain"
                        src="/images/cabeca-logo-verde-clara.png"
                        alt="Logo Clínica Fono Inova"
                    />

                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-white-900">
                            Agenda Clínica Fono Inova
                        </h1>

                        <p className="text-sm text-white-500">
                            Controle de agendamentos
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${view === "list"
                                ? "bg-teal-600 text-white shadow"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        onClick={() => setView("list")}
                    >
                        <i className="fas fa-list mr-2"></i> Lista
                    </button>

                    <button
                        type="button"
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${view === "calendar"
                                ? "bg-teal-600 text-white shadow"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        onClick={() => setView("calendar")}
                    >
                        <i className="far fa-calendar-alt mr-2"></i> Calendário
                    </button>

                    <button
                        type="button"
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${view === "weekly"
                                ? "bg-teal-600 text-white shadow"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        onClick={() => setView("weekly")}
                    >
                        <i className="fas fa-table-cells-large mr-2"></i> Semanal
                    </button>
                </div>
            </div>
        </header>
    );
}
