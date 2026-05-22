import { useState } from "react";
import { SPECIALTIES } from "../config/specialties";
import AppointmentRow from "./AppointmentRow";
import CycleWizardModal from "./CycleWizardModal";

export default function AppointmentTable({
    activeSpecialty, appointments, isLoading,
    onEdit, onDelete, onReminder, onCancel,
    onConfirmCycle }) {

    const [cycleWizardOpen, setCycleWizardOpen] = useState(false);
    const [baseAppointment, setBaseAppointment] = useState(null);

    function handleGenerateCycle(appointment) {
        setBaseAppointment(appointment);
        setCycleWizardOpen(true);
    }

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
                                    {appointments.length} registro{appointments.length !== 1 ? 's' : ''}
                                </span>
                            </h3>
                            <p className="text-sm text-gray-500">
                                Lista completa de agendamentos e consultas
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
                <div className="min-w-[1200px]">
                    {isLoading ? (
                        <div className="px-6 py-16 text-center">
                            <div className="max-w-sm mx-auto">
                                <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                    <i className="fas fa-spinner fa-spin text-2xl text-blue-500"></i>
                                </div>
                                <h4 className="text-base font-semibold text-gray-900 mb-1">
                                    Carregando agendamentos...
                                </h4>
                                <p className="text-sm text-gray-500">
                                    Buscando dados do servidor.
                                </p>
                            </div>
                        </div>
                    ) : appointments.length === 0 ? (
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
                                        <th className="w-[18%] px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-user text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Paciente</span>
                                            </div>
                                        </th>
                                        <th className="w-[7%] px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-clock text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Hora</span>
                                            </div>
                                        </th>
                                        <th className="w-[16%] px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-user-md text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Profissional</span>
                                            </div>
                                        </th>
                                        <th className="w-[14%] px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-stethoscope text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Área</span>
                                            </div>
                                        </th>
                                        <th className="w-[14%] px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-comment-dots text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Anotações</span>
                                            </div>
                                        </th>
                                        <th className="w-[11%] px-4 py-3 text-left">
                                            <div className="flex items-center gap-2">
                                                <i className="fas fa-flag text-xs text-gray-400"></i>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</span>
                                            </div>
                                        </th>
                                        <th className="w-[17%] px-4 py-3 text-center">
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