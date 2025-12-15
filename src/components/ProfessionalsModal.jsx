import React from "react";
import { formatDateLocal } from "../utils/date";
import { resolveSpecialtyKey } from "../utils/specialty";

export default function AppointmentModal({ appointment, professionals, onSave, onClose }) {
    const [formData, setFormData] = React.useState({
        patient: "",
        phone: "",
        birthDate: "",
        email: "",
        responsible: "",
        date: "",
        time: "",
        professional: "",
        specialty: appointment?.specialty || "Fonoaudiologia",
        specialtyKey: appointment?.specialtyKey || resolveSpecialtyKey(appointment?.specialty || "Fonoaudiologia"),
        status: "Confirmado",
        observations: "",
        createdAt: appointment?.createdAt || null,
        crm: {
            serviceType: appointment?.crm?.serviceType || "individual_session",
            sessionType: appointment?.crm?.sessionType || "avaliacao",
            paymentMethod: appointment?.crm?.paymentMethod || "pix",
            paymentAmount: Number(appointment?.crm?.paymentAmount || 0),
            usePackage: !!appointment?.crm?.usePackage,
        },
    });

    React.useEffect(() => {
        const today = formatDateLocal(new Date());

        if (appointment) {
            setFormData({
                patient: appointment.patient || "",
                phone: appointment.phone || "",
                birthDate: appointment.birthDate || "",
                email: appointment.email || "",
                responsible: appointment.responsible || "",
                date: appointment.date || today,
                time: appointment.time || "08:00",
                professional: appointment.professional || (professionals?.[0] || ""),
                specialty: appointment.specialty || "Fonoaudiologia",
                specialtyKey:
                    appointment.specialtyKey ||
                    resolveSpecialtyKey(appointment.specialty || "Fonoaudiologia"),
                status: appointment.status || "Confirmado",
                observations: appointment.observations || "",
                createdAt: appointment.createdAt || null,
                crm: {
                    serviceType: appointment.crm?.serviceType || "individual_session",
                    sessionType: appointment.crm?.sessionType || "avaliacao",
                    paymentMethod: appointment.crm?.paymentMethod || "pix",
                    paymentAmount: Number(appointment.crm?.paymentAmount || 0),
                    usePackage: !!appointment.crm?.usePackage,
                },
            });
        } else {
            setFormData({
                patient: "",
                phone: "",
                birthDate: "",
                email: "",
                responsible: "",
                date: today,
                time: "08:00",
                professional: professionals?.[0] || "",
                specialty: "Fonoaudiologia",
                specialtyKey: resolveSpecialtyKey("Fonoaudiologia"),
                status: "Confirmado",
                observations: "",
                createdAt: null,
                crm: {
                    serviceType: "individual_session",
                    sessionType: "avaliacao",
                    paymentMethod: "pix",
                    paymentAmount: 0,
                    usePackage: false,
                },
            });
        }
    }, [appointment, professionals]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === "specialty") {
            setFormData((prev) => ({
                ...prev,
                specialty: value,
                specialtyKey: resolveSpecialtyKey(value),
            }));
            return;
        }

        if (name.startsWith("crm.")) {
            const key = name.split(".")[1];
            setFormData((prev) => ({
                ...prev,
                crm: {
                    ...prev.crm,
                    [key]:
                        type === "checkbox"
                            ? checked
                            : key === "paymentAmount"
                                ? Number(value || 0)
                                : value,
                },
            }));
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const isEdit = !!appointment?.id;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 sticky top-0">
                    <h3 className="text-lg font-semibold text-gray-800">
                        {isEdit ? "Editar Agendamento" : "Novo Agendamento"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Atendimento: 08:00 → 18:40 (intervalo 40min)
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Paciente *</label>
                            <input
                                type="text"
                                name="patient"
                                value={formData.patient}
                                onChange={handleChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Telefone *</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Data de nascimento *</label>
                                <input
                                    type="date"
                                    name="birthDate"
                                    value={formData.birthDate}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                <input
                                    type="text"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Responsável</label>
                                <input
                                    type="text"
                                    name="responsible"
                                    value={formData.responsible}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Data *</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Horário *</label>
                                <input
                                    type="time"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Dica: use horários múltiplos de 40min (08:00, 08:40, 09:20… 18:40)
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Profissional *</label>
                                <select
                                    name="professional"
                                    value={formData.professional}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                >
                                    {(professionals || []).map((p, idx) => (
                                        <option key={idx} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Especialidade *</label>
                                <select
                                    name="specialty"
                                    value={formData.specialty}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="Fonoaudiologia">Fonoaudiologia</option>
                                    <option value="Psicologia">Psicologia</option>
                                    <option value="Terapia Ocupacional">Terapia Ocupacional</option>
                                    <option value="Fisioterapia">Fisioterapia</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Status *</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="Confirmado">Confirmado</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo (CRM)</label>
                                <select
                                    name="crm.serviceType"
                                    value={formData.crm.serviceType}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="individual_session">Sessão avulsa</option>
                                    <option value="package_session">Sessão de pacote</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de sessão</label>
                                <select
                                    name="crm.sessionType"
                                    value={formData.crm.sessionType}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="avaliacao">Avaliação</option>
                                    <option value="sessao">Sessão</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Pagamento</label>
                                <select
                                    name="crm.paymentMethod"
                                    value={formData.crm.paymentMethod}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="pix">Pix</option>
                                    <option value="cash">Dinheiro</option>
                                    <option value="credit_card">Cartão Crédito</option>
                                    <option value="debit_card">Cartão Débito</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Valor</label>
                                <input
                                    type="text"
                                    name="crm.paymentAmount"
                                    value={formData.crm.paymentAmount}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    min="0"
                                    step="1"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                id="usePackage"
                                type="checkbox"
                                name="crm.usePackage"
                                checked={!!formData.crm.usePackage}
                                onChange={handleChange}
                            />
                            <label htmlFor="usePackage" className="text-sm text-gray-700 font-semibold">
                                Usar pacote (se houver)
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Observações</label>
                            <textarea
                                name="observations"
                                value={formData.observations}
                                onChange={handleChange}
                                rows="3"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>

                        {/* debug opcional */}
                        <div className="text-xs text-gray-400">
                            specialtyKey: <span className="font-mono">{formData.specialtyKey}</span>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 sticky bottom-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold"
                        >
                            {isEdit ? "Atualizar" : "Criar"} Agendamento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
