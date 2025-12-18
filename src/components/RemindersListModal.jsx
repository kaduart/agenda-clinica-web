import React from "react";

export default function RemindersListModal({
    open,
    reminders = [],
    onClose,
    onDone,
    onCancel,
    onSnooze7,
    onOpenAppointment,
}) {
    const [q, setQ] = React.useState("");
    const [status, setStatus] = React.useState("pending");

    if (!open) return null;

    const filtered = reminders.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        const hay = `${r.text || ""} ${r.patient || ""} ${r.professional || ""} ${r.dueDate || ""}`.toLowerCase();
        return hay.includes((q || "").toLowerCase());
    });

    // Estatísticas rápidas
    const stats = {
        total: reminders.length,
        pending: reminders.filter(r => r.status === "pending").length,
        done: reminders.filter(r => r.status === "done").length,
        canceled: reminders.filter(r => r.status === "canceled").length,
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-lg z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-scaleIn">
                {/* Header com gradiente */}
                <div className="relative px-6 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                                <i className="fas fa-bell text-2xl"></i>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">Lembretes</h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1.5 text-sm opacity-90">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                        <span>{filtered.length} encontrados</span>
                                    </div>
                                    <div className="h-4 w-px bg-white/40"></div>
                                    <div className="text-sm opacity-90">
                                        {stats.pending} pendentes • {stats.done} concluídos
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 group"
                        >
                            <i className="fas fa-times text-xl group-hover:scale-110 transition-transform"></i>
                        </button>
                    </div>
                </div>

                {/* Barra de filtros melhorada */}
                <div className="p-5 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative">
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                <i className="fas fa-search"></i>
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por paciente, profissional, descrição..."
                                className="w-full pl-12 pr-4 py-3.5 border-0 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm focus:ring-3 focus:ring-emerald-500/30 focus:bg-white transition-all duration-300 text-gray-700 placeholder-gray-400"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="relative">
                                <select
                                    className="appearance-none pl-4 pr-10 py-3.5 bg-white/80 backdrop-blur-sm border-0 rounded-xl shadow-sm focus:ring-3 focus:ring-emerald-500/30 focus:bg-white transition-all duration-300 text-gray-700 cursor-pointer"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="pending">📋 Pendentes</option>
                                    <option value="done">✅ Concluídos</option>
                                    <option value="canceled">❌ Cancelados</option>
                                    <option value="all">📊 Todos</option>
                                </select>
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                                    <i className="fas fa-chevron-down"></i>
                                </div>
                            </div>
                            <button className="px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-md hover:shadow-lg font-medium">
                                <i className="fas fa-filter mr-2"></i>
                                Filtrar
                            </button>
                        </div>
                    </div>

                    {/* Status badges */}
                    <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-thin">
                        {[
                            { key: 'pending', label: 'Pendentes', count: stats.pending, color: 'bg-amber-100 text-amber-800 border-amber-200' },
                            { key: 'done', label: 'Concluídos', count: stats.done, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                            { key: 'canceled', label: 'Cancelados', count: stats.canceled, color: 'bg-red-100 text-red-800 border-red-200' },
                            { key: 'all', label: 'Total', count: stats.total, color: 'bg-blue-100 text-blue-800 border-blue-200' }
                        ].map((stat) => (
                            <button
                                key={stat.key}
                                onClick={() => setStatus(stat.key)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${status === stat.key ? 'ring-2 ring-offset-2 ring-emerald-500' : ''} ${stat.color} transition-all duration-200 hover:scale-105 min-w-fit`}
                            >
                                <span className="font-semibold">{stat.label}</span>
                                <span className="px-2 py-1 text-xs font-bold bg-white/50 rounded-full">
                                    {stat.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lista de lembretes */}
                <div className="max-h-[60vh] overflow-auto p-1 scrollbar-thin">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                                <i className="fas fa-inbox text-3xl text-gray-400"></i>
                            </div>
                            <h4 className="text-xl font-semibold text-gray-600 mb-2">Nenhum lembrete encontrado</h4>
                            <p className="text-gray-400 max-w-sm">
                                {q ? 'Tente ajustar os termos da busca' : 'Todos os lembretes estão organizados!'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 p-3">
                            {filtered.map((r) => (
                                <div
                                    key={r.id}
                                    className={`group relative p-5 rounded-2xl transition-all duration-300 hover:translate-x-1 ${r.status === "done"
                                        ? "bg-gradient-to-r from-gray-50 to-gray-100/50 border-l-4 border-gray-300"
                                        : r.status === "canceled"
                                            ? "bg-gradient-to-r from-red-50/50 to-red-100/30 border-l-4 border-red-400"
                                            : "bg-gradient-to-r from-white to-emerald-50/70 border-l-4 border-emerald-500 shadow-sm hover:shadow-md"
                                        }`}
                                >
                                    {/* Indicador de status */}
                                    <div className="absolute top-4 right-4">
                                        {r.status === "pending" && (
                                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                        )}
                                        {r.status === "done" && (
                                            <div className="p-1 bg-emerald-100 rounded-full">
                                                <i className="fas fa-check text-emerald-600 text-xs"></i>
                                            </div>
                                        )}
                                        {r.status === "canceled" && (
                                            <div className="p-1 bg-red-100 rounded-full">
                                                <i className="fas fa-ban text-red-600 text-xs"></i>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                        {/* Informações principais */}
                                        <div className="flex-1">
                                            {/* Cabeçalho com paciente e profissional */}
                                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-white rounded-lg shadow-xs">
                                                        <i className="fas fa-user text-emerald-600"></i>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">{r.patient}</h4>
                                                        <p className="text-sm text-gray-500">{r.professional}</p>
                                                    </div>
                                                </div>
                                                <div className="h-8 w-px bg-gray-200"></div>
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-white rounded-lg shadow-xs">
                                                        <i className="fas fa-calendar-day text-emerald-600"></i>
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">
                                                            {r.dueDate}
                                                            {r.dueTime && (
                                                                <span className="text-gray-600 ml-2">• {r.dueTime}</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400">Data limite</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Descrição do lembrete */}
                                            <div className="mb-4">
                                                <p className="text-gray-800 leading-relaxed">
                                                    <i className="fas fa-sticky-note text-emerald-500 mr-2"></i>
                                                    {r.text}
                                                </p>
                                            </div>

                                            {/* Tags e status */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${r.status === "done"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : r.status === "canceled"
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-amber-100 text-amber-800"
                                                    }`}>
                                                    <i className={`fas ${r.status === "done"
                                                        ? "fa-check-circle"
                                                        : r.status === "canceled"
                                                            ? "fa-ban"
                                                            : "fa-clock"
                                                        } mr-1.5`}></i>
                                                    {r.status === "done" ? "Concluído" :
                                                        r.status === "canceled" ? "Cancelado" : "Pendente"}
                                                </span>

                                                {r.notes && (
                                                    <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                                        <i className="fas fa-note-sticky mr-1.5"></i>
                                                        Notas
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ações para lembretes pendentes */}
                                        {r.status === "pending" && (
                                            <div className="flex lg:flex-col gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-gray-200 lg:pl-4">
                                                <button
                                                    onClick={() => onDone?.(r)}
                                                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md group"
                                                    title="Marcar como concluído"
                                                >
                                                    <i className="fas fa-check group-hover:scale-110 transition-transform"></i>
                                                    <span className="font-medium">Concluir</span>
                                                </button>

                                                <button
                                                    onClick={() => onSnooze7?.(r)}
                                                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-xl hover:from-amber-500 hover:to-amber-600 transition-all duration-200 shadow-sm hover:shadow-md group"
                                                    title="Adiar por 7 dias"
                                                >
                                                    <i className="fas fa-clock group-hover:scale-110 transition-transform"></i>
                                                    <span className="font-medium">+7 dias</span>
                                                </button>

                                                <button
                                                    onClick={() => onCancel?.(r)}
                                                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md group"
                                                    title="Cancelar lembrete"
                                                >
                                                    <i className="fas fa-ban group-hover:scale-110 transition-transform"></i>
                                                    <span className="font-medium">Cancelar</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-200 bg-gradient-to-b from-white to-gray-50">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-gray-500">
                            <i className="fas fa-info-circle text-emerald-500 mr-2"></i>
                            Clique em um lembrete para mais opções
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                            >
                                Fechar
                            </button>
                            {stats.pending > 0 && (
                                <button className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg">
                                    <i className="fas fa-paper-plane mr-2"></i>
                                    Enviar Lembretes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Adicionar ao seu CSS global ou inline
const styles = `
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes scaleIn {
    from { 
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
    }
    to { 
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
}

.animate-scaleIn {
    animation: scaleIn 0.3s ease-out;
}

.scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 #f1f5f9;
}

.scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

.hover-lift {
    transition: transform 0.2s ease;
}

.hover-lift:hover {
    transform: translateY(-2px);
}
`;

// Adicionar estilos ao documento
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}