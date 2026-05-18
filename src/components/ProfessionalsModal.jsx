import React from "react";
import { toast } from "react-toastify";
import { SPECIALTIES } from "../config/specialties";

// Apenas especialidades válidas no backend
const VALID_SPECIALTY_KEYS = [
    'fonoaudiologia', 'terapia_ocupacional', 'psicologia', 'fisioterapia',
    'pediatria', 'neuroped', 'psicomotricidade', 'musicoterapia', 'psicopedagogia'
];

export default function ProfessionalsModal({ professionals, onAdd, onDelete, onClose }) {
    const [form, setForm] = React.useState({
        fullName: "",
        email: "",
        specialty: "",
        licenseNumber: "",
        phoneNumber: ""
    });

    const specialtyOptions = Object.entries(SPECIALTIES)
        .filter(([key]) => VALID_SPECIALTY_KEYS.includes(key))
        .map(([key, val]) => ({ key, label: val.name, icon: val.icon, bgColor: val.bgColor, lightBg: val.lightBg, textColor: val.textColor, borderColor: val.borderColor }));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const trimmedName = form.fullName.trim();
        const trimmedEmail = form.email.trim();
        const trimmedSpecialty = form.specialty.trim();

        if (!trimmedName) {
            toast.error("Digite o nome do profissional");
            return;
        }
        if (!trimmedEmail) {
            toast.error("Digite o e-mail");
            return;
        }
        if (!trimmedSpecialty) {
            toast.error("Selecione a especialidade");
            return;
        }
        if (!form.licenseNumber.trim()) {
            toast.error("Número de registro (CRM/CRP/etc) é obrigatório");
            return;
        }
        if (!form.phoneNumber.trim()) {
            toast.error("Telefone é obrigatório");
            return;
        }

        try {
            await onAdd({
                fullName: trimmedName,
                email: trimmedEmail,
                specialty: trimmedSpecialty,
                licenseNumber: form.licenseNumber.trim(),
                phoneNumber: form.phoneNumber.trim()
            });
            // só reseta se sucesso (parent fecha o modal no sucesso)
            setForm({ fullName: "", email: "", specialty: "", licenseNumber: "", phoneNumber: "" });
        } catch {
            // erro: parent já mostrou o toast, mantém os dados do form
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800">Gerenciar Profissionais</h3>
                </div>

                <form onSubmit={handleAdd} className="px-6 py-4 border-b border-gray-200 space-y-3">
                    <label className="block text-sm font-bold text-gray-700">Adicionar profissional</label>

                    <input
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="Nome completo *"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />

                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="E-mail *"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />

                    <div>
                        <p className="text-xs text-gray-500 mb-1">Área principal *</p>
                        <div className="grid grid-cols-3 gap-1.5">
                            {specialtyOptions.map(opt => {
                                const selected = form.specialty === opt.key;
                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, specialty: opt.key }))}
                                        className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-xs font-medium transition-all
                                            ${selected
                                                ? `${opt.bgColor} text-white border-transparent shadow-sm`
                                                : `${opt.lightBg} ${opt.textColor} ${opt.borderColor} hover:opacity-80`
                                            }`}
                                    >
                                        <i className={`fas ${opt.icon} text-sm`}></i>
                                        <span className="text-center leading-tight">{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {!form.specialty && (
                            <p className="mt-1 text-xs text-red-400">Selecione uma área</p>
                        )}
                    </div>

                    <input
                        type="text"
                        name="licenseNumber"
                        value={form.licenseNumber}
                        onChange={handleChange}
                        placeholder="Número de registro (CRM/CRP/etc) *"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />

                    <input
                        type="text"
                        name="phoneNumber"
                        value={form.phoneNumber}
                        onChange={handleChange}
                        placeholder="Telefone *"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />

                    <button
                        type="submit"
                        className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold"
                    >
                        <i className="fas fa-plus mr-2"></i> Adicionar
                    </button>
                </form>

                <div className="px-6 py-4 max-h-64 overflow-y-auto">
                    {professionals.length === 0 && (
                        <p className="text-gray-500 text-sm">Nenhum profissional cadastrado</p>
                    )}

                    {professionals.map((p) => (
                        <div key={p.id || p._id || p.fullName || p.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div>
                                <div className="text-gray-900 font-medium">{p.fullName || p.name || "—"}</div>
                                <div className="text-xs text-gray-500">{p.specialty}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onDelete(p)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                                title="Excluir"
                            >
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
