import { useState } from "react";
import { SPECIALTIES } from "../config/specialties";
import AppointmentRow from "./AppointmentRow";
import CycleWizardModal from "./CycleWizardModal";

export default function AppointmentTable({
    activeSpecialty, appointments,
    onEdit, onDelete, onReminder, onCancel,
    onConfirmCycle }) {

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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Cabeçalho */}
            <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gray-50 border border-gray-200`}>
                            <i className={`fas ${specialty.icon} text-gray-600 text-xl`}></i>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                {specialty.name}
                                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                    {stats.total} registro{stats.total !== 1 ? 's' : ''}
                                </span>
                            </h3>
                            <p className="text-sm text-gray-500">
                                Lista completa de agendamentos e consultas
                            </p>
                        </div>
                    </div>

                    {/* Stats em badges discretos */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            <span className="text-sm font-medium text-gray-700">{stats.confirmed}</span>
                            <span className="text-xs text-gray-500">compareceram</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                            <span className="text-sm font-medium text-gray-700">{stats.pending}</span>
                            <span className="text-xs text-gray-500">agendados</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            <span className="text-sm font-medium text-gray-700">{stats.canceled}</span>
                            <span className="text-xs text-gray-500">cancelados</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros Rápidos */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filtros:</span>
                    <button className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors">
                        Compareceram ({stats.confirmed})
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors">
                        Agendados ({stats.pending})
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors">
                        Hoje
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors">
                        Esta Semana
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                        <i className="fas fa-sort text-xs text-gray-400"></i>
                        <select className="text-xs bg-transparent border-0 text-gray-600 focus:ring-0 cursor-pointer">
                            <option>Ordenar por data</option>
                            <option>Ordenar por paciente</option>
                            <option>Ordenar por status</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
                <div className="min-w-[1200px]">
                    {appointments.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="max-w-sm mx-auto">
                                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <i className="fas fa-calendar-times text-2xl text-gray-400"></i>
                                </div>
                                <h4 className="text-base font-semibold text-gray-900 mb-1">
                                    Nenhum agendamento encontrado
                                </h4>
                                <p className="text-sm text-gray-500 mb-4">
                                    Não há registros para esta especialidade ou filtros aplicados.
                                </p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                                    <i className="fas fa-lightbulb text-xs text-blue-600"></i>
                                    <span className="text-xs text-blue-700">Tente ajustar os filtros ou criar um novo agendamento</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <table className="w-full table-fixed">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="w-[17%] px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-user text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Paciente</span>
                                            </div>
                                        </th>
                                        <th className="w-[11%] px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-calendar-day text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Agendamento</span>
                                            </div>
                                        </th>
                                        <th className="w-[18%] px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-user-md text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Profissional</span>
                                            </div>
                                        </th>
                                        <th className="w-[9%] px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-stethoscope text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Área</span>
                                            </div>
                                        </th>
                                        <th className="w-[9%] px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-flag text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</span>
                                            </div>
                                        </th>
                                        <th className="w-[17%] px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-comment-dots text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Anotações</span>
                                            </div>
                                        </th>
                                        <th className="w-[20%] px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <i className="fas fa-cogs text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Controles</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {appointments.map((appointment, index) => (
                                        <AppointmentRow
                                            key={appointment.id}
                                            appointment={appointment}
                                            index={index}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onCancel={onCancel}
                                            onReminder={onReminder}
                                            onGenerateCycle={handleGenerateCycle}
                                        />
                                    ))}
                                </tbody>
                            </table>

                            {/* Rodapé */}
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                            <span className="text-xs text-gray-600">Compareceu</span>
                                            <span className="text-xs font-medium text-gray-900">({stats.confirmed})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                            <span className="text-xs text-gray-600">Agendado</span>
                                            <span className="text-xs font-medium text-gray-900">({stats.pending})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                            <span className="text-xs text-gray-600">Cancelado</span>
                                            <span className="text-xs font-medium text-gray-900">({stats.canceled})</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                                            <span className="text-xs text-gray-600">
                                                Total: <span className="font-medium text-gray-900">{stats.total}</span> registros
                                            </span>
                                        </div>
                                        <button className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors">
                                            <i className="fas fa-file-export mr-1"></i>
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