import React from "react";
import { formatDateLocal } from "../utils/date";

export default function ReminderModal({ appointment, onSave, onClose }) {
    const today = formatDateLocal(new Date());

    const [form, setForm] = React.useState({
        reminderText: "",
        reminderDate: today,
        reminderTime: "",
        reminderDone: false,
    });

    React.useEffect(() => {
        if (!appointment) return;

        setForm({
            reminderText: appointment.reminderText || "",
            reminderDate: appointment.reminderDate || today,
            reminderTime: appointment.reminderTime || "",
            reminderDone: !!appointment.reminderDone,
        });
    }, [appointment]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const trimmed = (form.reminderText || "").trim();
        if (!trimmed) {
            alert("Digite o lembrete.");
            return;
        }

        if (!form.reminderDate) {
            alert("Escolha a data do lembrete.");
            return;
        }

        onSave({
            reminderText: trimmed,
            reminderDate: form.reminderDate,
            reminderTime: form.reminderTime || "",
            reminderDone: !!form.reminderDone,
        });
    };

    if (!appointment) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xl">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Lembrete</h3>
                            <p className="text-xs text-gray-600 mt-1">
                                {appointment.patient || "-"} • {appointment.date || "-"} • {appointment.time || "-"} • {appointment.professional || "-"}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold"
                        >
                            Fechar
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Texto do lembrete *</label>
                            <textarea
                                name="reminderText"
                                value={form.reminderText}
                                onChange={handleChange}
                                rows={3}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder='Ex: "Chamar mês que vem pra reagendar"'
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Data do lembrete *</label>
                                <input
                                    type="date"
                                    name="reminderDate"
                                    value={form.reminderDate}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Hora (opcional)</label>
                                <input
                                    type="time"
                                    name="reminderTime"
                                    value={form.reminderTime}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                id="reminderDone"
                                type="checkbox"
                                name="reminderDone"
                                checked={!!form.reminderDone}
                                onChange={handleChange}
                            />
                            <label htmlFor="reminderDone" className="text-sm text-gray-700 font-semibold">
                                Marcar como feito
                            </label>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
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
                            Salvar lembrete
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
