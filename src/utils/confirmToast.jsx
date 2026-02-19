import { toast } from "react-toastify";

/**
 * Mostra um toast de confirmação com botões personalizáveis
 * @param {string} message - Mensagem a ser exibida
 * @param {Object} options - Opções de personalização
 * @param {string} options.confirmText - Texto do botão de confirmação (padrão: "Confirmar")
 * @param {string} options.cancelText - Texto do botão de cancelamento (padrão: "Cancelar")
 * @param {string} options.confirmColor - Cor do botão de confirmação: 'red' | 'green' | 'blue' | 'teal' (padrão: 'green')
 * @returns {Promise<boolean>} - Resolve true se confirmado, false se cancelado
 */
export function confirmToast(message, options = {}) {
    const {
        confirmText = "Confirmar",
        cancelText = "Cancelar",
        confirmColor = "green"
    } = options;

    // Mapeamento de cores para classes Tailwind
    const colorClasses = {
        red: "bg-red-600 hover:bg-red-700",
        green: "bg-emerald-600 hover:bg-emerald-700",
        blue: "bg-blue-600 hover:bg-blue-700",
        teal: "bg-teal-600 hover:bg-teal-700",
    };

    const confirmClass = colorClasses[confirmColor] || colorClasses.green;

    return new Promise((resolve) => {
        const id = toast(
            ({ closeToast }) => (
                <div>
                    <div className="font-semibold text-gray-800 flex">{message}</div>
                    <div className="mt-3 flex gap-2 justify-end">
                        <button
                            className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition-colors"
                            onClick={() => {
                                toast.dismiss(id);
                                closeToast?.();
                                resolve(false);
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            className={`px-3 py-1.5 rounded text-white font-semibold transition-colors ${confirmClass}`}
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
            ),
            {
                autoClose: false,
                closeOnClick: false,
                closeButton: false,
            }
        );
    });
}
