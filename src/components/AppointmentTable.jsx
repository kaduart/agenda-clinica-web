import { useState } from "react";
import { SPECIALTIES } from "../config/specialties";
import AppointmentRow from "./AppointmentRow";
import CycleWizardModal from "./CycleWizardModal";
import { QUICK_FILTERS } from "../utils/daySummary";

export default function AppointmentTable({
    activeSpecialty, appointments, isLoading,
    onEdit, onDelete, onReminder, onCancel,
    onConfirmCycle, onPostAppointment, quickFilterLabel, onClearQuickFilter }) {

    const [cycleWizardOpen, setCycleWizardOpen] = useState(false);
    const [baseAppointment, setBaseAppointment] = useState(null);

    function handleGenerateCycle(appointment) {
        setBaseAppointment(appointment);
        setCycleWizardOpen(true);
    }

    const specialty = SPECIALTIES[activeSpecialty] || SPECIALTIES.todas;

    return (
        <div className="bg-white rounded-xl border border-fi-line overflow-visible">
            {/* Cabeçalho */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-fi-line">
                <h3 className="font-head text-sm font-bold text-fi-ink">{specialty.name}</h3>
                <span className="text-xs font-semibold tabular-nums text-fi-muted">
                    {appointments.length} registro{appointments.length !== 1 ? 's' : ''}
                </span>
                {quickFilterLabel && QUICK_FILTERS[quickFilterLabel] && (
                    <span className="h-6 pl-2.5 pr-1 rounded-full bg-fi-soft text-fi-deep text-xs font-semibold inline-flex items-center gap-1">
                        Só: {QUICK_FILTERS[quickFilterLabel].label}
                        <button type="button" onClick={onClearQuickFilter} className="w-5 h-5 rounded-full hover:bg-white/70" aria-label="Mostrar todos">×</button>
                    </span>
                )}
            </div>

            {/* Lista */}
            <div>
                {isLoading ? (
                    <div className="px-6 py-16 text-center">
                        <div className="max-w-sm mx-auto">
                            <div className="w-12 h-12 mx-auto bg-fi-soft rounded-full flex items-center justify-center mb-3">
                                <i className="fas fa-spinner fa-spin text-xl text-fi-accent"></i>
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
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-fi-bg rounded-lg border border-fi-line">
                                <i className="fas fa-lightbulb text-xs text-fi-muted"></i>
                                <span className="text-xs text-fi-muted">Tente ajustar os filtros ou criar um novo agendamento</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header row — espelha as colunas do AppointmentRow */}
                        <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-b border-fi-line bg-fi-bg">
                            <div className="w-36 shrink-0 flex items-center">
                                <span className="text-[10.5px] font-semibold text-fi-muted uppercase tracking-wide flex items-center gap-1.5">
                                    <i className="fas fa-clock text-xs"></i> Horário / Profissional
                                </span>
                            </div>
                            <div className="flex-[1.2] min-w-0 flex items-center">
                                <span className="text-[10.5px] font-semibold text-fi-muted uppercase tracking-wide flex items-center gap-1.5">
                                    <i className="fas fa-user text-xs"></i> Paciente
                                </span>
                            </div>
                            <div className="w-36 shrink-0 hidden md:flex items-center justify-center">
                                <span className="text-[10.5px] font-semibold text-fi-muted uppercase tracking-wide flex items-center justify-center gap-1.5">
                                    <i className="fas fa-comment-check text-xs"></i> Confirmação
                                </span>
                            </div>
                            <div className="w-32 shrink-0 hidden lg:flex items-center">
                                <span className="text-[10.5px] font-semibold text-fi-muted uppercase tracking-wide flex items-center gap-1.5">
                                    <i className="fas fa-stethoscope text-xs"></i> Área / Tipo
                                </span>
                            </div>
                            <div className="w-32 shrink-0 hidden xl:flex items-center">
                                <span className="text-[10.5px] font-semibold text-fi-muted uppercase tracking-wide flex items-center gap-1.5">
                                    <i className="fas fa-comment-dots text-xs"></i> Anotações
                                </span>
                            </div>
                            <div className="w-28 shrink-0 text-center hidden md:flex items-center justify-center">
                                <span className="text-[10.5px] font-semibold text-fi-muted uppercase tracking-wide flex items-center justify-center gap-1.5">
                                    <i className="fas fa-flag text-xs"></i> Status do atendimento
                                </span>
                            </div>
                            <div className="w-64 shrink-0 flex items-center justify-end">
                                <span className="text-[10.5px] font-semibold text-fi-muted uppercase tracking-wide flex items-center justify-center gap-1.5">
                                    <i className="fas fa-cogs text-xs"></i> Ações
                                </span>
                            </div>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-fi-line">
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
                                    onPostAppointment={onPostAppointment}
                                />
                            ))}
                        </div>
                    </>
                )}
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
