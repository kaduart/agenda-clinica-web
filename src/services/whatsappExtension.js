/**
 * 🟢 Envio de WhatsApp via backend (whatsapp-web.js + Puppeteer)
 * Envia mensagens silenciosamente pelo servidor — sem extensao Chrome, sem reload de aba
 */
import api from './api.js';

/**
 * Envia mensagem via backend
 */
export async function sendViaExtension(phone, message) {
  try {
    const response = await api.post('/api/whatsapp-web/send', { phone, message });
    return response.data;
  } catch (err) {
    const error = err.response?.data?.error || err.message || 'Erro ao enviar mensagem';
    return { success: false, error };
  }
}

/**
 * Gera mensagem de confirmação
 */
export function generateConfirmationMessage(paciente) {
  const nome = (paciente.fullName || paciente.patient || 'Paciente').split(' ')[0];
  const data = paciente.date 
    ? new Date(paciente.date + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';
  const hora = paciente.time || '';
  const profissional = paciente.professional || paciente.doctor?.fullName || '';
  
  return `Olá, avaliação está CONFIRMADA! 💚\n\n` +
    `O agendamento de *${nome}* está confirmado para a avaliação inicial.\n\n` +
    `📅 Data: ${data}\n` +
    `⏰ Horário: ${hora}\n` +
    `👩‍⚕️ Profissional: ${profissional}\n` +
    `🏥 Clínica Fono Inova\n\n` +
    `Ficamos muito felizes em recebê-los e preparar tudo com carinho ✨\n\n` +
    `Qualquer dúvida antes da consulta, pode contar com a gente.\n\n` +
    `Um dia antes enviaremos uma mensagem de confirmação.\n\n` +
    `Até o dia e horário combinados! 😊💚`;
}

/**
 * Gera mensagem de lembrete
 */
export function generateReminderMessage(paciente) {
  const nome = (paciente.fullName || paciente.patient || 'Paciente').split(' ')[0];
  const data = paciente.date 
    ? new Date(paciente.date + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';
  const hora = paciente.time || '';
  
  return `Olá ${nome}! 💚\n\n` +
    `Lembrete: sua avaliação é *AMANHÃ*! 🔔\n\n` +
    `📅 Data: ${data}\n` +
    `⏰ Horário: ${hora}\n` +
    `🏥 Clínica Fono Inova\n\n` +
    `Estamos te esperando! ✨\n\n` +
    `Precisa remarcar? Responda aqui.`;
}
