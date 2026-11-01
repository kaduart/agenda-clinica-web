import { requestConfirm } from "../ui/confirmStore";

/**
 * Confirmação no estilo do app (diálogo no computador, gaveta no celular).
 * Mesma assinatura de antes: confirmToast(message, { title, confirmText, cancelText, confirmColor }).
 * confirmColor: 'red' | 'green' | 'blue' | 'teal' | 'whatsapp'
 * @returns {Promise<boolean>}
 */
export function confirmToast(message, options = {}) {
    return requestConfirm({ message, ...options });
}

export const confirmDialog = confirmToast;
