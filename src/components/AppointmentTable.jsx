import { SPECIALTIES } from "../config/specialties";
import AppointmentRow from "./AppointmentRow";

export default function AppointmentTable({ activeSpecialty, appointments, onEdit, onDelete, onReminder }) {
    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-visible transition-all duration-300 hover:shadow-xl">
            {/* Cabeçalho da Tabela */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200 rounded-t-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${SPECIALTIES[activeSpecialty]?.bgColor || 'bg-gray-100'} transition-transform duration-300 hover:scale-105`}>
                            <i className={`fas ${SPECIALTIES[activeSpecialty]?.icon || 'fa-calendar'} ${SPECIALTIES[activeSpecialty]?.textColor || 'text-gray-700'} text-lg`}></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                {SPECIALTIES[activeSpecialty]?.name || 'Todas as Especialidades'}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Lista de agendamentos e consultas
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-gray-700 bg-white px-4 py-2 rounded-full border border-gray-300 shadow-sm flex items-center gap-2 transition-all duration-300 hover:bg-gray-50 hover:shadow-md">
                            <i className="fas fa-list-check text-gray-600"></i>
                            {appointments.length} registro(s)
                        </span>
                        
                        {appointments.length > 0 && (
                            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                                <i className="fas fa-clock text-gray-500"></i>
                                <span>Última atualização: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto rounded-b-xl">
                <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            {/* Cabeçalhos das Colunas */}
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-user text-gray-500"></i>
                                            Paciente
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-calendar-day text-gray-500"></i>
                                            Data / Horário
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-user-md text-gray-500"></i>
                                            Profissional
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-stethoscope text-gray-500"></i>
                                            Especialidade
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-flag text-gray-500"></i>
                                            Status
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-comment-dots text-gray-500"></i>
                                            Observações
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[180px] pr-8">
                                        <div className="flex items-center justify-end gap-2">
                                            <i className="fas fa-cogs text-gray-500"></i>
                                            Ações
                                        </div>
                                    </th>
                                </tr>
                            </thead>

                            {/* Corpo da Tabela */}
                            <tbody className="divide-y divide-gray-100">
                                {appointments.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400 animate-pulse">
                                                <div className="p-6 bg-gray-100 rounded-full mb-4 transition-all duration-300 hover:bg-gray-200">
                                                    <i className="fas fa-inbox text-4xl"></i>
                                                </div>
                                                <h4 className="text-lg font-semibold text-gray-500 mb-2">
                                                    Nenhum agendamento encontrado
                                                </h4>
                                                <p className="text-sm text-gray-400 max-w-md">
                                                    Não há registros para esta especialidade ou filtro aplicado.
                                                </p>
                                                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                    <p className="text-xs text-blue-600">
                                                        <i className="fas fa-lightbulb mr-1"></i>
                                                        Tente alterar os filtros ou criar um novo agendamento
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    appointments.map((appointment, index) => (
                                        <AppointmentRow
                                            key={appointment.id}
                                            appointment={appointment}
                                            index={index}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onReminder={onReminder}
                                        />
                                    ))
                                )}
                            </tbody>

                            {/* Rodapé da Tabela */}
                            {appointments.length > 0 && (
                                <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <td colSpan="7" className="px-6 py-3">
                                            <div className="flex justify-between items-center text-xs text-gray-600">
                                                <div className="flex items-center gap-4">
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                        <span>Confirmado</span>
                                                    </span>
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                                        <span>Pendente</span>
                                                    </span>
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                                        <span>Cancelado</span>
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <i className="fas fa-info-circle text-gray-500"></i>
                                                    <span>Total de {appointments.length} registros</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}