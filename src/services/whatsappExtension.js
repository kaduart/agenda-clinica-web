/**
 * 🟢 Envio de WhatsApp
 * 
 * Opções (prioridade):
 * 1. VPS externo (chip comum) - se configurado
 * 2. API Oficial da Meta (Business) - fallback
 */
import {
  getWhatsAppWebStatus,
  sendWhatsAppWebMessage,
  sendWhatsAppVpsMessage,
  sendWhatsAppMetaText,
  markAttendanceConfirmationSent,
} from '../api/v2/whatsappClient.js';

import {
  generateProfessionalNewAppointmentMessage,
  generateProfessionalReminderMessage
} from './professionalMessages.js';

/**
 * Envia mensagem (usa VPS se disponível, senão API Meta Business)
 */
export async function sendViaExtension(phone, message, context = {}) {
  let needsReconnect = false;

  try {
    // 🟢 Verifica se WhatsApp está conectado antes de enviar
    const statusRes = await getWhatsAppWebStatus({ timeout: 5000 });
    if (!statusRes.ready) {
      return { success: false, error: 'WhatsApp não está conectado', needsReconnect: true };
    }

    // 🟢 Tenta WhatsApp Web nativo primeiro (chip comum / Business)
    const response = await sendWhatsAppWebMessage({ phone, message, ...context });
    return { ...response, needsReconnect: false };
  } catch (err) {
    const error = err.response?.data?.error || err.message || '';
    
    // Se WhatsApp Web não estiver conectado, marca para reconectar e tenta fallback
    if (err.response?.status === 404 || error.includes('conectado') || error.includes('desconectado') || error.includes('não configurado') || error.includes('QR')) {
      needsReconnect = true;
      
      try {
        const response = await sendWhatsAppVpsMessage({ phone, message });
        if (context.purpose === 'attendance_confirmation' && context.appointmentId) {
          await markAttendanceConfirmationSent(context.appointmentId, response?.messageId || response?.id);
        }
        return { ...response, needsReconnect: true };
      } catch (vpsErr) {
        const vpsError = vpsErr.response?.data?.error || '';
        
        // Se VPS também não tiver, usa API Meta Business como último recurso
        if (vpsErr.response?.status === 404 || vpsError.includes('não configurado')) {
          
          try {
            const response = await sendWhatsAppMetaText({ phone, text: message });
            if (context.purpose === 'attendance_confirmation' && context.appointmentId) {
              await markAttendanceConfirmationSent(context.appointmentId, response?.messageId || response?.id);
            }
            return { ...response, needsReconnect: true };
          } catch (metaErr) {
            const metaError = metaErr.response?.data?.error || metaErr.message;
            return { success: false, error: metaError, needsReconnect: true };
          }
        }
        
        return { success: false, error: vpsError, needsReconnect: true };
      }
    }
    
    return { success: false, error, needsReconnect: false };
  }
}

/**
 * Retorna saudação baseada no horário atual
 */
function getSaudacao() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Extrai a data string (YYYY-MM-DD) independente do formato de entrada
 */
function extractDateString(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === 'string') {
    // Se for ISO (2025-08-05T13:00:00.000Z), pega só a parte da data
    if (dateInput.includes('T')) {
      return dateInput.split('T')[0];
    }
    // Se já for YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
  }
  // Se for Date object
  if (dateInput instanceof Date) {
    return dateInput.toISOString().split('T')[0];
  }
  return null;
}

/**
 * Gera mensagem de confirmação
 */
export function generateConfirmationMessage(paciente) {
  const responsavel = paciente.responsible 
    ? paciente.responsible.split(' ')[0] 
    : paciente.patient?.guardianName?.split(' ')[0]
    || paciente.patientInfo?.guardianName?.split(' ')[0]
    || null;
  const nomePaciente = paciente.patientName || paciente.patient?.fullName || paciente.patient?.name || paciente.fullName || paciente.name || 'Paciente';

  const dateStr = extractDateString(paciente.date);
  const dateObj = dateStr ? new Date(dateStr + 'T12:00:00') : null;
  const data = dateObj ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const diaSemana = dateObj ? dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }) : '';
  const hora = paciente.time || '';

  // Avaliação inicial x sessão (pacote/sessão avulsa): evita chamar toda consulta de "avaliação inicial"
  const tipoRaw = String(paciente.sessionType || paciente.serviceType || paciente.type || '');
  const ehSessao = /sess|pacote/i.test(tipoRaw);
  const tipoTexto = ehSessao ? 'atendimento' : 'avaliação inicial';
  const prof = paciente.professional || paciente.doctor?.fullName || '';
  const profTexto = prof ? ' com *' + prof + '*' : '';

  return `${getSaudacao()}${responsavel ? ', ' + responsavel : ''}! O ${tipoTexto} do *${nomePaciente}*${profTexto} está confirmado para *${diaSemana}, ${data}, às ${hora}*, na Clínica Fono Inova (Av. Minas Gerais, 405, Jundiaí).` + '\n\u200B\n' +
    'Um dia antes, enviamos um lembrete rápido. Se precisar remarcar, é só responder aqui. 💚';
}

/**
 * Gera mensagem de lembrete
 */
export function generateReminderMessage(paciente) {
  const responsavel = paciente.responsible 
    ? paciente.responsible.split(' ')[0] 
    : paciente.patient?.guardianName?.split(' ')[0]
    || paciente.patientInfo?.guardianName?.split(' ')[0]
    || null;
  const nomePaciente = paciente.patientName || paciente.patient?.fullName || paciente.patient?.name || paciente.fullName || paciente.name || 'Paciente';
  
  const dateStr = extractDateString(paciente.date);
  const dateObj = dateStr ? new Date(dateStr + 'T12:00:00') : null;
  const dataCompleta = dateObj ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const hora = paciente.time || '';
  const profissional = paciente.professional || paciente.doctor?.fullName || '';
  // Verifica se é hoje, amanhã ou outro dia
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const amanhaStr = amanha.toISOString().split('T')[0];
  
  const ehHoje = dateStr === hojeStr;
  const ehAmanha = dateStr === amanhaStr;
  
  const diaTexto = ehHoje ? `Hoje (${dataCompleta})` : ehAmanha ? `Amanhã (${dataCompleta})` : dataCompleta;

  return `${getSaudacao()}${responsavel ? `, ${responsavel}` : ''}! 💚\n\n` +
    `🔔 *Lembrete de atendimento*\n\n` +
    `👤 Paciente: *${nomePaciente}*\n` +
    `📅 Data: *${diaTexto}*\n` +
    `⏰ Horário: *${hora}*\n` +
    `${profissional ? `👩‍⚕️ Profissional: *${profissional}*\n` : ''}` +
    `📍 Clínica Fono Inova\nAv. Minas Gerais, 405 — Jundiaí\n\n` +
    `Selecione abaixo se poderá comparecer:`;
}

export {
  generateProfessionalNewAppointmentMessage,
  generateProfessionalReminderMessage
};
