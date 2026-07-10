/**
 * 💬 WHATSAPP CLIENT
 *
 * Fronteira externa: todos os canais de envio de mensagem WhatsApp
 * (Baileys, WhatsApp Web, VPS, Meta API).
 * Centraliza chamadas HTTP para não espalhar axios nos serviços e componentes.
 */

import api from "../../services/api.js";

// ===============================
// 🔍 STATUS
// ===============================

export async function getBaileysStatus() {
    const response = await api.get('/api/baileys/status');
    return response.data;
}

export async function connectBaileys() {
    const response = await api.post('/api/baileys/connect');
    return response.data;
}

export async function disconnectBaileys() {
    const response = await api.post('/api/baileys/disconnect');
    return response.data;
}

export async function getWhatsAppWebStatus(options = {}) {
    const response = await api.get('/api/whatsapp-web/status', options);
    return response.data;
}

export async function reconnectWhatsAppWeb(options = {}) {
    const response = await api.post('/api/whatsapp-web/reconnect', null, options);
    return response.data;
}

// ===============================
// ✉️ ENVIO DE TEXTO
// ===============================

export async function sendBaileysMessage({ phone, message }) {
    const response = await api.post('/api/baileys/send', { phone, message });
    return response.data;
}

export async function sendWhatsAppWebMessage({ phone, message }) {
    const response = await api.post('/api/whatsapp-web/send', { phone, message });
    return response.data;
}

export async function sendWhatsAppVpsMessage({ phone, message }) {
    const response = await api.post('/api/whatsapp-vps/send', { phone, message });
    return response.data;
}

export async function sendWhatsAppMetaText({ phone, text }) {
    const response = await api.post('/api/whatsapp/send-text', { phone, text });
    return response.data;
}

// ===============================
// 🖼️ ENVIO DE MÍDIA
// ===============================

export async function sendWhatsAppMetaMedia({ phone, file, type = 'image', caption = '' }) {
    const formData = new FormData();
    formData.append('phone', phone);
    formData.append('type', type);
    formData.append('caption', caption);
    formData.append('file', file);

    const response = await api.post('/api/whatsapp/send-media', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
}

// ===============================
// 🚀 ENVIO COM FALLBACK (conveniência)
// ===============================

/**
 * Tenta Baileys → WhatsApp Web → VPS → Meta API, retornando o primeiro sucesso.
 * Preserva a lógica de fallback existente em produção.
 */
export async function sendWhatsAppMessageWithFallback({ phone, message }) {
    let baileysConnected = false;
    try {
        const status = await getBaileysStatus();
        baileysConnected = status?.connected === true || status?.status === 'connected';
    } catch { /* noop */ }

    if (baileysConnected) {
        try {
            return await sendBaileysMessage({ phone, message });
        } catch { /* noop */ }
    }

    try {
        return await sendWhatsAppWebMessage({ phone, message });
    } catch { /* noop */ }

    try {
        return await sendWhatsAppVpsMessage({ phone, message });
    } catch { /* noop */ }

    try {
        return await sendWhatsAppMetaText({ phone, text: message });
    } catch (metaErr) {
        return { success: false, error: metaErr.response?.data?.error || metaErr.message };
    }
}
