/**
 * 🟢 Envio de WhatsApp via backend (whatsapp-web.js + Puppeteer)
 * Envia mensagens silenciosamente pelo servidor — sem extensao Chrome, sem reload de aba
 */
import api from './api.js';
import { openWhatsAppQRModal } from '../components/WhatsAppQRGlobal.jsx';

/**
 * Envia mensagem via backend
 */
export async function sendViaExtension(phone, message) {
  try {
    const response = await api.post('/api/whatsapp-web/send', { 
      phone, 
      message: message 
    });
    return response.data;
  } catch (err) {
    const error = err.response?.data?.error || err.message || 'Erro ao enviar mensagem';
    
    // Verifica se é erro de não conectado e abre o modal automaticamente
    const isNotConnected = 
      error.includes('nao esta conectado') ||
      error.includes('não conectado') ||
      error.includes('Escaneie o QR') ||
      error.includes('qr');
    
    if (isNotConnected) {
      console.log('[WhatsApp] Não conectado - abrindo modal QR');
      openWhatsAppQRModal();
    }
    
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
  
  // Formato exato como na imagem
  return `Olá, avaliação está CONFIRMADA! 💚
O agendamento de ${nome} está confirmado para a avaliação inicial.

📅 Data: ${data}
⏰ Horário: ${hora}
👩‍⚕️ Profissional: ${profissional}

🏥 Clínica Fono Inova Ficamos muito felizes em recebê-los e preparar tudo com carinho ✨
💬 Qualquer dúvida antes da consulta, pode contar com a gente.

Um dia antes enviaremos uma mensagem de confirmação.
Até o dia e horário combinados! 😊💚`;
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
  
  return `Olá ${nome}! 💚
Lembrete: sua avaliação é *AMANHÃ*! 🔔

📅 Data: ${data}
⏰ Horário: ${hora}
🏥 Clínica Fono Inova

Estamos te esperando! ✨

Precisa remarcar? Responda aqui.`;
}
