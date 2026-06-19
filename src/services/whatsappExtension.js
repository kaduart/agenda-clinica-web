/**
 * 🟢 Envio de WhatsApp
 * 
 * Opções (prioridade):
 * 1. VPS externo (chip comum) - se configurado
 * 2. API Oficial da Meta (Business) - fallback
 */
import api from './api.js';
import { openWhatsAppQRModal } from '../components/WhatsAppQRGlobal.jsx';
import {
  generateProfessionalNewAppointmentMessage,
  generateProfessionalReminderMessage
} from './professionalMessages.js';

/**
 * Envia mensagem (usa VPS se disponível, senão API Meta Business)
 */
export async function sendViaExtension(phone, message) {
  let needsReconnect = false;

  try {
    // 🟢 Verifica se WhatsApp está conectado antes de enviar
    const statusRes = await api.get('/api/whatsapp-web/status', { timeout: 5000 });
    if (!statusRes.data.ready) {
      return { success: false, error: 'WhatsApp não está conectado', needsReconnect: true };
    }

    // 🟢 Tenta WhatsApp Web nativo primeiro (chip comum / Business)
    const response = await api.post('/api/whatsapp-web/send', { 
      phone, 
      message 
    });
    return { ...response.data, needsReconnect: false };
  } catch (err) {
    const error = err.response?.data?.error || err.message || '';
    
    // Se WhatsApp Web não estiver conectado, marca para reconectar e tenta fallback
    if (err.response?.status === 404 || error.includes('conectado') || error.includes('desconectado') || error.includes('não configurado') || error.includes('QR')) {
      needsReconnect = true;
      
      try {
        const response = await api.post('/api/whatsapp-vps/send', { 
          phone, 
          message 
        });
        return { ...response.data, needsReconnect: true };
      } catch (vpsErr) {
        const vpsError = vpsErr.response?.data?.error || '';
        
        // Se VPS também não tiver, usa API Meta Business como último recurso
        if (vpsErr.response?.status === 404 || vpsError.includes('não configurado')) {
          
          try {
            const response = await api.post('/api/whatsapp/send-text', { 
              phone, 
              text: message 
            });
            return { ...response.data, needsReconnect: true };
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
  const saudacao = responsavel 
    ? `${getSaudacao()}, ${responsavel}! Tudo certinho? 💚` 
    : `${getSaudacao()}! Tudo certinho? 💚`;
  const nomePaciente = paciente.patientName || paciente.patient?.fullName || paciente.patient?.name || paciente.fullName || paciente.name || 'Paciente';

  const dateStr = extractDateString(paciente.date);
  const dateObj = dateStr ? new Date(dateStr + 'T12:00:00') : null;
  const data = dateObj ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const diaSemana = dateObj ? dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }) : '';
  const hora = paciente.time || '';

  return saudacao + '\n\u200B\n' +
    'Tudo certo! O agendamento do *' + nomePaciente + '* está confirmado para a *avaliação inicial* no dia *' + data + ' (' + diaSemana + ')* às *' + hora + '* 💚' + '\n\u200B\n' +
    'Ficamos muito felizes em receber vocês e preparar tudo com carinho ✨' + '\n\u200B\n' +
    'Se surgir qualquer dúvida antes do dia, é só chamar aqui.' + '\n\u200B\n' +
    '📲 Um dia antes, enviamos outra mensagem para confirmar, combinado?' + '\n\u200B\n' +
    'Te espero no dia e horário marcados! 😊';
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
  const data = dateObj ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  const dataCompleta = dateObj ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const hora = paciente.time || '';
  const profissional = paciente.professional || paciente.doctor?.fullName || '';
  const especialidade = paciente.specialty || paciente.sessionType || '';
  
  // Verifica se é hoje, amanhã ou outro dia
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const amanhaStr = amanha.toISOString().split('T')[0];
  
  const ehHoje = dateStr === hojeStr;
  const ehAmanha = dateStr === amanhaStr;
  
  if (ehHoje) {
    const saudacao = responsavel 
      ? '👋 ' + getSaudacao() + ', ' + responsavel + '!' 
      : '👋 ' + getSaudacao() + '!';
    return saudacao + '\n\u200B\n' +
      'Passando para lembrar que *hoje* temos atendimento agendado na Clínica Fono Inova:' + '\n\u200B\n' +
      '👶 Paciente: *' + nomePaciente + '*' + '\n' +
      '🕓 *' + hora + '* *' + profissional + '*' + '\n\u200B\n' +
      'Posso confirmar sua presença?' + '\n\u200B\n' +
      'Até mais 😊';
  }
  
  const saudacao = responsavel 
    ? '👋 ' + getSaudacao() + ', ' + responsavel + '!' 
    : '👋 ' + getSaudacao() + '!';
  
  // Define o texto da data (amanhã, dia da semana, ou data)
  let dataTexto;
  if (ehAmanha) {
    dataTexto = 'amanhã (' + dataCompleta + ')';
  } else {
    dataTexto = dataCompleta;
  }
  
  return saudacao + '\n\u200B\n' +
    'Passando para lembrar que *' + dataTexto + '* temos atendimento agendado na Clínica Fono Inova:' + '\n\u200B\n' +
    '👶 Paciente: *' + nomePaciente + '*' + '\n' +
    '🕓 *' + hora + '* *' + profissional + '*' + '\n\u200B\n' +
    'Posso confirmar sua presença?' + '\n\u200B\n' +
    'Até mais 😊';
}

export {
  generateProfessionalNewAppointmentMessage,
  generateProfessionalReminderMessage
};
