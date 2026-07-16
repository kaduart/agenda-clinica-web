import { toast } from "react-toastify";

/**
 * Mostra um toast de confirmação com botões personalizáveis
 * @param {string} message - Mensagem a ser exibida
 * @param {Object} options - Opções de personalização
 * @param {string} options.title - Título curto opcional (ex: "Atenção") exibido em destaque acima da mensagem
 * @param {string} options.confirmText - Texto do botão de confirmação (padrão: "Confirmar")
 * @param {string} options.cancelText - Texto do botão de cancelamento (padrão: "Cancelar")
 * @param {string} options.confirmColor - Cor/variante: 'red' | 'green' | 'blue' | 'teal' (padrão: 'green')
 * @returns {Promise<boolean>} - Resolve true se confirmado, false se cancelado
 */
export function confirmToast(message, options = {}) {
    const {
        title = "",
        confirmText = "Confirmar",
        cancelText = "Cancelar",
        confirmColor = "green"
    } = options;

    // Mesmas cores semânticas do design system do dashboard financeiro
    // (vermelho/âmbar/azul/verde = red-500/amber-500/blue-500/emerald-500)
    const variants = {
        red: { icon: "fa-triangle-exclamation", bar: "bg-red-500", avatar: "bg-red-500", confirmBtn: "bg-red-500 hover:bg-red-600" },
        teal: { icon: "fa-triangle-exclamation", bar: "bg-amber-500", avatar: "bg-amber-500", confirmBtn: "bg-teal-600 hover:bg-teal-700" },
        blue: { icon: "fa-circle-info", bar: "bg-blue-500", avatar: "bg-blue-500", confirmBtn: "bg-blue-500 hover:bg-blue-600" },
        green: { icon: "fa-circle-check", bar: "bg-emerald-500", avatar: "bg-emerald-500", confirmBtn: "bg-emerald-500 hover:bg-emerald-600" },
    };

    const variant = variants[confirmColor] || variants.green;

    return new Promise((resolve) => {
        const id = toast(
            ({ closeToast }) => (
                <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
                    <div className={`h-[3px] ${variant.bar}`} />
                    <div className="p-4 flex gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white ${variant.avatar}`}>
                            <i className={`fas ${variant.icon} text-sm`}></i>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            {title && (
                                <p className="text-sm font-bold text-gray-900 mb-1">{title}</p>
                            )}
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                {message}
                            </p>
                            <div className="mt-4 flex gap-2 justify-end">
                                <button
                                    className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors"
                                    onClick={() => {
                                        toast.dismiss(id);
                                        closeToast?.();
                                        resolve(false);
                                    }}
                                >
                                    {cancelText}
                                </button>
                                <button
                                    className={`px-3.5 py-1.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-colors ${variant.confirmBtn}`}
                                    onClick={() => {
                                        toast.dismiss(id);
                                        closeToast?.();
                                        resolve(true);
                                    }}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                autoClose: false,
                closeOnClick: false,
                closeButton: false,
                className: "!bg-transparent !shadow-none !p-0",
                bodyClassName: "!p-0 !m-0",
            }
        );
    });
}
