/**
 * 🟢 Envio de WhatsApp
 * 
 * Opções (prioridade):
 * 1. VPS externo (chip comum) - se configurado
 * 2. API Oficial da Meta (Business) - fallback
 */
import api from './api.js';
import { openWhatsAppQRModal } from '../components/WhatsAppQRGlobal.jsx';

/**
 * Envia mensagem (usa VPS se disponível, senão API Meta)
 */
export async function sendViaExtension(phone, message) {
  try {
    // 🟢 Tenta VPS primeiro (chip comum)
    const response = await api.post('/api/whatsapp-vps/send', { 
      phone, 
      message 
    });
    return response.data;
  } catch (err) {
    const error = err.response?.data?.error || '';
    
    // Se VPS não configurado, usa API Meta
    if (err.response?.status === 404 || error.includes('não configurado')) {
      console.log('[WhatsApp] VPS não configurado, usando API Meta...');
      
      try {
        const response = await api.post('/api/whatsapp/send-text', { 
          phone, 
          text: message 
        });
        return response.data;
      } catch (metaErr) {
        const metaError = metaErr.response?.data?.error || metaErr.message;
        return { success: false, error: metaError };
      }
    }
    
    // VPS configurado mas offline
    if (error.includes('conectar')) {
      openWhatsAppQRModal();
    }
    
    return { success: false, error };
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
  const profissional = paciente.professional || paciente.doctor?.fullName || '';
  
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
  const nome = (paciente.name || paciente.fullName || paciente.patient || 'Paciente').split(' ')[0];
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
