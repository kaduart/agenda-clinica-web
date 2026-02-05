import { useState } from "react";
import { toast } from "react-toastify";
import { database } from "../config/firebase";
import {
    autoSendPreAgendamento,
    confirmarAgendamento
} from "../services/crmExport";

export default function ExportButton({ appointment }) {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        doctorId: "",
        sessionValue: appointment.crm?.paymentAmount || 200
    });

    const preStatus = appointment.preAgendamento?.status;
    const exportStatus = appointment.export?.status;

    // Já foi importado completamente
    if (exportStatus === "success") {
        return (
            <span className="text-xs text-emerald-600 font-medium">
                ✅ No CRM
            </span>
        );
    }

    // Enviando
    if (loading || preStatus === "enviando") {
        return <i className="fas fa-spinner fa-spin text-gray-400"></i>;
    }

    // Erro no envio
    if (preStatus === "error") {
        return (
            <button
                className="text-orange-600 hover:text-orange-800 text-xs"
                onClick={handleSend}
            >
                ⚠️ Tentar novamente
            </button>
        );
    }

    // Já enviado como pré-agendamento → mostra CONFIRMAR
    if (preStatus === "enviado") {
        return (
            <>
                <button
                    className="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
                    onClick={() => setShowModal(true)}
                >
                    Confirmar
                </button>

                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white p-4 rounded-lg w-80">
                            <h4 className="font-bold mb-2">Confirmar Agendamento</h4>
                            <p className="text-sm mb-3">{appointment.patient}</p>

                            <select
                                className="w-full border p-2 mb-2 text-sm"
                                value={form.doctorId}
                                onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                            >
                                <option value="">Selecione profissional...</option>
                                <option value="ID1">Dra. Lorrany</option>
                                <option value="ID2">Dra. Vitória</option>
                            </select>

                            <input
                                type="number"
                                className="w-full border p-2 mb-3 text-sm"
                                value={form.sessionValue}
                                onChange={(e) => setForm({ ...form, sessionValue: Number(e.target.value) })}
                                placeholder="Valor"
                            />

                            <div className="flex gap-2">
                                <button
                                    className="flex-1 py-1 border rounded text-sm"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="flex-1 py-1 bg-emerald-600 text-white rounded text-sm disabled:opacity-50"
                                    disabled={!form.doctorId}
                                    onClick={handleConfirm}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Ainda não enviou → botão ENVIAR
    return (
        <button
            className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
            onClick={handleSend}
        >
            <i className="fas fa-paper-plane"></i> Enviar p/ CRM
        </button>
    );

    async function handleSend() {
        setLoading(true);
        await database.ref(`appointments/${appointment.id}/preAgendamento`).update({
            status: "enviando"
        });

        const result = await autoSendPreAgendamento(appointment);

        setLoading(false);

        if (result.success) {
            toast.success("Enviado! Aparece no painel do CRM.");
        } else {
            toast.error("Erro: " + result.error);
        }
    }

    async function handleConfirm() {
        setLoading(true);
        const result = await confirmarAgendamento(appointment, form);
        setLoading(false);

        if (result.success) {
            setShowModal(false);
            toast.success("Confirmado e importado!");
        }
    }
}