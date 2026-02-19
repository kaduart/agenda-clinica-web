import { useState } from "react";
import { SPECIALTIES } from "../config/specialties";
import AppointmentRow from "./AppointmentRow";
import CycleWizardModal from "./CycleWizardModal";

export default function AppointmentTable({
    activeSpecialty, appointments,
    onEdit, onDelete, onReminder, onCancel,
    onConfirmCycle, onConfirm }) {

    const [cycleWizardOpen, setCycleWizardOpen] = useState(false);
    const [baseAppointment, setBaseAppointment] = useState(null);

    function handleGenerateCycle(appointment) {
        setBaseAppointment(appointment);
        setCycleWizardOpen(true);
    }

    // Estatísticas em tempo real
    const stats = {
        total: appointments.length,
        confirmed: appointments.filter(a => a.status === 'Confirmado' || ['confirmed', 'paid'].includes(a.operationalStatus)).length,
        pending: appointments.filter(a => a.status === 'Pendente' || ['scheduled', 'pending'].includes(a.operationalStatus)).length,
        canceled: appointments.filter(a => a.status === 'Cancelado' || ['canceled', 'missed'].includes(a.operationalStatus)).length,
    };

    const specialty = SPECIALTIES[activeSpecialty] || SPECIALTIES.todas;

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-500 hover:shadow-2xl group">
            {/* Cabeçalho Premium */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
                {/* Efeito de brilho */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse-slow"></div>

                <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br from-white/20 to-transparent backdrop-blur-sm border border-white/10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                            <i className={`fas ${specialty.icon} text-white text-2xl`}></i>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                {specialty.name}
                                <span className="text-sm font-normal bg-white/20 text-white/90 px-3 py-1 rounded-full">
                                    {stats.total} registro{stats.total !== 1 ? 's' : ''}
                                </span>
                            </h3>
                            <p className="text-gray-300 mt-2 flex items-center gap-3">
                                <i className="fas fa-stream text-gray-400"></i>
                                Lista completa de agendamentos e consultas
                            </p>
                        </div>
                    </div>

                    {/* Stats em tempo real */}
                    <div className="flex flex-wrap gap-3">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-white font-semibold">{stats.confirmed}</span>
                                <span className="text-gray-300 text-sm">Confirmados</span>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                                <span className="text-white font-semibold">{stats.pending}</span>
                                <span className="text-gray-300 text-sm">Pendentes</span>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                            <div className="flex items-center gap-2">
                                <i className="fas fa-sync-alt text-blue-400 animate-spin text-xs"></i>
                                <span className="text-white text-sm font-mono">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Barra de progresso sutil */}
                <div className="relative mt-6 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-amber-500 to-transparent animate-shimmer"></div>
                </div>
            </div>

            {/* Filtros Rápidos */}
            <div className="px-8 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-semibold text-gray-700">Filtros rápidos:</span>
                    <div className="flex flex-wrap gap-2">
                        <button className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors">
                            Confirmados ({stats.confirmed})
                        </button>
                        <button className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors">
                            Pendentes ({stats.pending})
                        </button>
                        <button className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
                            Hoje
                        </button>
                        <button className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors">
                            Esta Semana
                        </button>
                    </div>
                    <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                        <i className="fas fa-sort-amount-down text-gray-400"></i>
                        <select className="bg-transparent border-0 focus:ring-0 text-gray-700 font-medium">
                            <option>Ordenar por: Data</option>
                            <option>Ordenar por: Paciente</option>
                            <option>Ordenar por: Status</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabela - Design Brutal */}
            <div className="overflow-x-auto overflow-y-hidden">
                <div className="min-w-full inline-block align-middle">
                    {appointments.length === 0 ? (
                        <div className="px-8 py-20 text-center">
                            <div className="max-w-md mx-auto">
                                <div className="relative mb-8">
                                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center">
                                        <i className="fas fa-calendar-times text-4xl text-gray-400"></i>
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center animate-bounce">
                                        <i className="fas fa-exclamation text-white text-sm"></i>
                                    </div>
                                </div>
                                <h4 className="text-2xl font-bold text-gray-800 mb-3">
                                    Nenhum agendamento encontrado
                                </h4>
                                <p className="text-gray-600 mb-6">
                                    Não há registros para esta especialidade ou os filtros aplicados.
                                </p>
                                <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                                    <i className="fas fa-lightbulb text-blue-500 text-lg"></i>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-blue-700">Dica rápida</p>
                                        <p className="text-xs text-blue-600">
                                            Tente ajustar os filtros ou criar um novo agendamento
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Cabeçalhos Premium */}
                            <div className="sticky top-0 z-10">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                            <th className="px-8 py-5 text-left">
                                                <div className="flex items-center gap-3 group">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                                                        <i className="fas fa-user text-gray-600"></i>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Paciente</span>
                                                        <div className="text-xs text-gray-500 mt-1">Nome completo</div>
                                                    </div>
                                                </div>
                                            </th>
                                            <th className="px-8 py-5 text-left">
                                                <div className="flex items-center gap-3 group">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                                                        <i className="fas fa-calendar-day text-gray-600"></i>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Agendamento</span>
                                                        <div className="text-xs text-gray-500 mt-1">Data e horário</div>
                                                    </div>
                                                </div>
                                            </th>
                                            <th className="px-8 py-5 text-left">
                                                <div className="flex items-center gap-3 group">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                                                        <i className="fas fa-user-md text-gray-600"></i>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Profissional</span>
                                                        <div className="text-xs text-gray-500 mt-1">Responsável</div>
                                                    </div>
                                                </div>
                                            </th>
                                            <th className="px-8 py-5 text-left">
                                                <div className="flex items-center gap-3 group">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                                                        <i className="fas fa-stethoscope text-gray-600"></i>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Área</span>
                                                        <div className="text-xs text-gray-500 mt-1">Especialidade</div>
                                                    </div>
                                                </div>
                                            </th>
                                            <th className="px-8 py-5 text-left">
                                                <div className="flex items-center gap-3 group">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                                                        <i className="fas fa-flag text-gray-600"></i>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Status</span>
                                                        <div className="text-xs text-gray-500 mt-1">Situação</div>
                                                    </div>
                                                </div>
                                            </th>
                                            {/* ANOTAÇÕES */}
                                            <th className="px-8 py-5 text-left w-[18%] max-w-[260px]">
                                                <div className="flex items-center gap-3 group">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                                                        <i className="fas fa-comment-dots text-gray-600"></i>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                            Anotações
                                                        </span>
                                                        <div className="text-xs text-gray-500 mt-1">Observações</div>
                                                    </div>
                                                </div>
                                            </th>

                                            {/* CONTROLES */}
                                            <th className="px-8 py-5 text-center">
                                                <div className="flex items-center justify-center gap-3 group">
                                                    <div className="text-right">
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                            Controles
                                                        </span>
                                                        <div className="text-xs text-gray-500 mt-1">Ações</div>
                                                    </div>
                                                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                                                        <i className="fas fa-cogs text-white"></i>
                                                    </div>
                                                </div>
                                            </th>

                                        </tr>
                                    </thead>

                                    {/* Corpo da Tabela */}
                                    <tbody className="divide-y divide-gray-100/50">
                                        {appointments.map((appointment, index) => (
                                            <AppointmentRow
                                                key={appointment.id}
                                                appointment={appointment}
                                                index={index}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                                onCancel={onCancel} // ✅ Passando onCancel
                                                onReminder={onReminder}
                                                onGenerateCycle={handleGenerateCycle}
                                                onConfirm={onConfirm}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Rodapé da Tabela */}
                            <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 px-8 py-5 text-center to-gray-100 border-t-2 border-gray-200 px-8 py-4">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                            <span className="text-sm text-gray-700">Confirmado</span>
                                            <span className="text-sm font-bold text-gray-900 ml-1">({stats.confirmed})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                                            <span className="text-sm text-gray-700">Pendente</span>
                                            <span className="text-sm font-bold text-gray-900 ml-1">({stats.pending})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                            <span className="text-sm text-gray-700">Cancelado</span>
                                            <span className="text-sm font-bold text-gray-900 ml-1">({stats.canceled})</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-chart-bar text-gray-500"></i>
                                                <span className="text-sm font-semibold text-gray-700">
                                                    Total: <span className="text-gray-900">{stats.total}</span> registros
                                                </span>
                                            </div>
                                        </div>
                                        <button className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-sm hover:shadow-md font-medium">
                                            <i className="fas fa-file-export mr-2"></i>
                                            Exportar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal de Ciclo */}
            <CycleWizardModal
                open={cycleWizardOpen}
                appointment={baseAppointment}
                onClose={() => setCycleWizardOpen(false)}
                onConfirm={(payload) => {
                    onConfirmCycle?.(payload, baseAppointment);
                    setCycleWizardOpen(false);
                }}
            />
        </div>
    );
}