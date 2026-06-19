import React from "react";
import { sendWhatsAppMessage } from "../services/baileysApi";

const STORAGE_KEY_MESSAGES = "postAppointmentMessages_v3";
const STORAGE_KEY_GOOGLE_LINK = "postAppointmentGoogleLink";

const NL = '\n​\n';

const DEFAULT_MESSAGE_1 =
    '👋 {{SAUDACAO}}, {{RESPONSAVEL}}!' + NL +
    'Passamos para saber como foi a consulta de *{{NOME}}* hoje aqui na Clínica Fono Inova 💚' + NL +
    'Tudo correu bem? O atendimento atendeu as expectativas de vocês?';

const DEFAULT_MESSAGE_2 =
    'Fico muito feliz em saber! 😊' + NL +
    'Sua opinião é muito importante pra nós.' + NL +
    'Você poderia reservar 1 minutinho para deixar uma avaliação no Google? Ajuda muito outras famílias a encontrarem nossa clínica 🙏' + NL +
    '👉 {{LINK}}' + NL +
    'Obrigada, {{RESPONSAVEL}}! 💙';

const DEFAULT_GOOGLE_LINK = "https://g.page/r/CR6aUdS_hstDEBM/review";

function loadSavedMessages() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                message1: parsed.message1 || DEFAULT_MESSAGE_1,
                message2: parsed.message2 || DEFAULT_MESSAGE_2,
            };
        }
    } catch {
        console.error("[PostAppointmentModal] Erro ao carregar mensagens");
    }
    return { message1: DEFAULT_MESSAGE_1, message2: DEFAULT_MESSAGE_2 };
}

function saveMessages(message1, message2) {
    try {
        localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify({ message1, message2 }));
    } catch (e) {
        console.error("[PostAppointmentModal] Erro ao salvar mensagens:", e);
    }
}

function loadGoogleLink() {
    try {
        return localStorage.getItem(STORAGE_KEY_GOOGLE_LINK) || DEFAULT_GOOGLE_LINK;
    } catch {
        return DEFAULT_GOOGLE_LINK;
    }
}

function saveGoogleLink(link) {
    try {
        localStorage.setItem(STORAGE_KEY_GOOGLE_LINK, link);
    } catch (e) {
        console.error("[PostAppointmentModal] Erro ao salvar link:", e);
    }
}

function getSaudacao() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
}

function resolvePhone(appointment) {
    return (appointment.patient?.phone || appointment.phone || appointment.patientPhone || "").replace(/\D/g, "");
}

function resolveFirstName(appointment) {
    const name = appointment.patientName || appointment.patient?.fullName || appointment.patient?.name || appointment.fullName || appointment.name || "Paciente";
    return name.split(" ")[0];
}

function resolveResponsibleFirstName(appointment) {
    const responsible = appointment.responsible || appointment.patient?.guardianName || appointment.patientInfo?.guardianName || "";
    return responsible ? responsible.split(" ")[0] : "";
}

function applyVariables(text, appointment, googleLink) {
    const firstName = resolveFirstName(appointment);
    const responsible = resolveResponsibleFirstName(appointment);
    const professional = appointment.doctor?.fullName || appointment.professional?.fullName || appointment.professional?.name || (typeof appointment.professional === "string" ? appointment.professional : "") || "";

    return text
        .replace(/{{SAUDACAO}}/g, getSaudacao())
        .replace(/{{NOME}}/g, firstName)
        .replace(/{{RESPONSAVEL}}/g, responsible || firstName)
        .replace(/{{PROFISSIONAL}}/g, professional)
        .replace(/{{LINK}}/g, googleLink || "[COLOCAR LINK DO GOOGLE AQUI]");
}

export default function PostAppointmentModal({ appointment, onClose }) {
    const saved = React.useMemo(() => loadSavedMessages(), []);
    const [message1, setMessage1] = React.useState(saved.message1);
    const [message2, setMessage2] = React.useState(saved.message2);
    const [googleLink, setGoogleLink] = React.useState(loadGoogleLink());
    const [sending, setSending] = React.useState(null); // 'msg1' | 'msg2' | null
    const [showSuccess, setShowSuccess] = React.useState(null); // 'msg1' | 'msg2' | null

    const phone = resolvePhone(appointment);
    const preview1 = applyVariables(message1, appointment, googleLink);
    const preview2 = applyVariables(message2, appointment, googleLink);

    React.useEffect(() => {
        saveMessages(message1, message2);
    }, [message1, message2]);

    React.useEffect(() => {
        saveGoogleLink(googleLink);
    }, [googleLink]);

    const handleSend = async (type) => {
        if (!phone) {
            showToast("Paciente sem telefone cadastrado", "error");
            return;
        }

        setSending(type);
        const message = type === "msg1" ? preview1 : preview2;
        const result = await sendWhatsAppMessage(phone, message);
        setSending(null);

        if (result.success) {
            setShowSuccess(type);
            setTimeout(() => setShowSuccess(null), 3000);
            if (result.needsReconnect) {
                window.dispatchEvent(new CustomEvent("open-whatsapp-connect"));
                showToast("Mensagem enviada pela Meta API. Conecte o WhatsApp Web nativo para usar chip comum.", "warning");
            } else {
                showToast(type === "msg1" ? "Mensagem de pós-atendimento enviada!" : "Pedido de avaliação enviado!", "success");
            }
        } else if (result.error?.includes("conectado") || result.error?.includes("QR") || result.error?.includes("desconectado") || result.needsReconnect) {
            window.dispatchEvent(new CustomEvent("open-whatsapp-connect"));
            showToast("WhatsApp desconectado. Escaneie o QR code.", "error");
        } else {
            showToast(result.error || "Erro ao enviar", "error");
        }
    };

    function showToast(msg, variant = "success") {
        const toast = document.createElement("div");
        const colors = {
            success: "bg-emerald-500",
            error: "bg-red-500",
            warning: "bg-amber-500",
        };
        toast.className = `fixed bottom-4 right-4 ${colors[variant] || colors.success} text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg`;
        toast.innerHTML = `<i class="fab fa-whatsapp mr-2"></i> ${msg}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <i className="fab fa-whatsapp text-emerald-600"></i>
                            Pós-atendimento
                        </h3>
                        <p className="text-sm text-gray-500">
                            {appointment.patientName || appointment.patient?.fullName || appointment.patient?.name || "Paciente"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {!phone && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                            <i className="fas fa-exclamation-circle mr-2"></i>
                            Este paciente não possui telefone cadastrado.
                        </div>
                    )}

                    {/* Link do Google */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Link da avaliação no Google
                        </label>
                        <input
                            type="url"
                            value={googleLink}
                            onChange={(e) => setGoogleLink(e.target.value)}
                            placeholder="https://g.page/.../review"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Use <code className="bg-gray-100 px-1 rounded">{"{{LINK}}"}</code> no texto da mensagem 2 para incluir o link automaticamente.
                        </p>
                    </div>

                    {/* Mensagem 1 */}
                    <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-100">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                                <i className="fas fa-heart text-emerald-600"></i>
                                Mensagem 1 — Cuidado / Experiência
                            </h4>
                            <button
                                type="button"
                                onClick={() => handleSend("msg1")}
                                disabled={sending === "msg1" || !phone}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                                    showSuccess === "msg1"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                }`}
                            >
                                {sending === "msg1" ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : showSuccess === "msg1" ? (
                                    <i className="fas fa-check"></i>
                                ) : (
                                    <i className="fab fa-whatsapp"></i>
                                )}
                                {showSuccess === "msg1" ? "Enviada" : "Enviar mensagem 1"}
                            </button>
                        </div>
                        <textarea
                            value={message1}
                            onChange={(e) => setMessage1(e.target.value)}
                            rows={4}
                            className="w-full p-3 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm mb-3"
                        />
                        <div className="bg-white border border-emerald-100 rounded-lg p-3">
                            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">Preview</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{preview1}</p>
                        </div>
                    </div>

                    {/* Mensagem 2 */}
                    <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                                <i className="fas fa-star text-blue-600"></i>
                                Mensagem 2 — Pedido de avaliação
                            </h4>
                            <button
                                type="button"
                                onClick={() => handleSend("msg2")}
                                disabled={sending === "msg2" || !phone}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                                    showSuccess === "msg2"
                                        ? "bg-blue-600 text-white"
                                        : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                }`}
                            >
                                {sending === "msg2" ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : showSuccess === "msg2" ? (
                                    <i className="fas fa-check"></i>
                                ) : (
                                    <i className="fab fa-whatsapp"></i>
                                )}
                                {showSuccess === "msg2" ? "Enviada" : "Enviar mensagem 2"}
                            </button>
                        </div>
                        <textarea
                            value={message2}
                            onChange={(e) => setMessage2(e.target.value)}
                            rows={5}
                            className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mb-3"
                        />
                        <div className="bg-white border border-blue-100 rounded-lg p-3">
                            <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mb-1">Preview</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{preview2}</p>
                        </div>
                    </div>

                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <strong>Variáveis disponíveis:</strong>{" "}
                        <code className="bg-gray-100 px-1 rounded">{"{{SAUDACAO}}"}</code>{" "}
                        <code className="bg-gray-100 px-1 rounded">{"{{NOME}}"}</code>{" "}
                        <code className="bg-gray-100 px-1 rounded">{"{{RESPONSAVEL}}"}</code>{" "}
                        <code className="bg-gray-100 px-1 rounded">{"{{PROFISSIONAL}}"}</code>{" "}
                        <code className="bg-gray-100 px-1 rounded">{"{{LINK}}"}</code>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
