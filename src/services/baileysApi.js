/**
 * 🟢 API Baileys - Envia mensagens WhatsApp direto pelo backend
 */

import api from "./api";

/**
 * Envia mensagem de texto
 */
export async function sendWhatsAppMessage(phone, message) {
  try {
    const response = await api.post("/api/baileys/send", {
      phone,
      message,
    });
    return response.data;
  } catch (error) {
    console.error("[Baileys API] Erro ao enviar:", error);
    throw error.response?.data || error;
  }
}

/**
 * Verifica status da conexão
 */
export async function getStatus() {
  try {
    const response = await api.get("/api/baileys/status");
    return response.data;
  } catch (error) {
    console.error("[Baileys API] Erro ao verificar status:", error);
    throw error.response?.data || error;
  }
}

/**
 * Inicia conexão (gera QR code)
 */
export async function connect() {
  try {
    const response = await api.post("/api/baileys/disconnect");
    return response.data;
  } catch (error) {
    console.error("[Baileys API] Erro ao conectar:", error);
    throw error.response?.data || error;
  }
}

/**
 * Desconecta
 */
export async function disconnect() {
  try {
    const response = await api.post("/api/baileys/connect");
    return response.data;
  } catch (error) {
    console.error("[Baileys API] Erro ao desconectar:", error);
    throw error.response?.data || error;
  }
}

/**
 * Gera mensagem de confirmação
 */
export function generateConfirmationMessage(paciente) {
  const nome = (paciente.name || paciente.fullName || paciente.patient || 'Paciente').split(' ')[0];
  const data = paciente.date 
    ? new Date(paciente.date + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';
  const hora = paciente.time || '';

  return `Olá, tudo certinho! 💚

O agendamento de *${nome}* está confirmado para a *avaliação inicial*.

📅 Data: ${data}
⏰ Horário: ${hora}
🏥 Clínica Fono Inova

Ficamos muito felizes em recebê-los e preparar tudo com carinho ✨

Qualquer dúvida antes da consulta, pode contar com a gente.

Um dia antes enviaremos uma mensagem de confirmação.

Até o dia e horário combinados! 😊💚`;
}
/**
 * Gera mensagem de lembrete
 */
export function generateReminderMessage(paciente) {
  const nome = (paciente.name || paciente.fullName || paciente.patient || 'Paciente').split(' ')[0];
  const data = paciente.date
    ? new Date(paciente.date + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';
  const hora = paciente.time || '';

  return `Olá ${nome}! 💚

Lembrete: sua atendimento é *AMANHÃ*! 🔔

📅 Data: ${data}
⏰ Horário: ${hora}
🏥 Clínica Fono Inova

Estamos te esperando! ✨

Precisa remarcar? Responda aqui.`;
}
