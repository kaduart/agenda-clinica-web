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
      console.log('[WhatsApp] Web local indisponível, tentando VPS externo...');
      
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
          console.log('[WhatsApp] VPS não configurado, usando API Meta Business...');
          
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
    'O agendamento de *' + nomePaciente + '* está confirmado para a avaliação inicial no dia *' + data + ' (' + diaSemana + ')* às *' + hora + '*.' + '\n\u200B\n' +
    'Ficamos muito felizes em recebê-los e preparar tudo com carinho ✨' + '\n\u200B\n' +
    'Qualquer dúvida antes da consulta, pode contar com a gente.' + '\n\u200B\n' +
    '📲 No dia anterior, vamos te enviar uma mensagem para confirmar, combinado?' + '\n\u200B\n' +
    'Até o dia e horário combinados! 😊💛';
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
      ? getSaudacao() + ', ' + responsavel + '! Tudo bem? 😊' 
      : getSaudacao() + '! Tudo bem? 😊';
    return saudacao + '\n\u200B\n' +
      'Passando para lembrar que hoje (' + dataCompleta + ') temos atendimento agendado na Clínica Fono Inova:' + '\n\u200B\n' +
      '👶 Paciente: ' + nomePaciente + '\n' +
      '🕒 ' + hora + ' – ' + especialidade + '\n\u200B\n' +
      'Posso confirmar sua presença?' + '\n' +
      'Qualquer dúvida, estamos à disposição.' + '\n' +
      'Até mais 😊';
  }
  
  const saudacao = responsavel 
    ? '👋 ' + getSaudacao() + ', ' + responsavel + '!' 
    : '👋 ' + getSaudacao() + '!';
  
  // Mapeia serviceType para nome do atendimento
  const serviceTypeMap = {
    'evaluation': 'a avaliação',
    'session': 'a sessão',
    'package_session': 'a sessão do pacote',
    'individual_session': 'a sessão individual',
    'meet': 'a reunião',
    'alignment': 'o alinhamento',
    'return': 'o retorno',
    'tongue_tie_test': 'o teste da língua',
    'neuropsych_evaluation': 'a avaliação neuropsicológica',
    'convenio_session': 'a sessão de convênio'
  };
  const tipoAtendimento = serviceTypeMap[paciente.serviceType] || 'o atendimento';
  
  // Define o texto da data (amanhã, dia da semana, ou data)
  let dataTexto;
  if (ehAmanha) {
    dataTexto = 'de amanhã';
  } else {
    const diaSemana = dateObj ? dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }) : '';
    dataTexto = 'de ' + diaSemana;
  }
  
  return saudacao + '\n\u200B\n' +
    'Estou passando para confirmar ' + tipoAtendimento + ' ' + dataTexto + ' 😊' + '\n\u200B\n' +
    '👶 Paciente: ' + nomePaciente + '\n' +
    '📅 Data: ' + data + '\n' +
    '⏰ Horário: ' + hora + '\n' +
    '👨‍⚕️ Profissional: ' + profissional + '\n\u200B\n' +
    'Você consegue comparecer?' + '\n\u200B\n' +
    'Responda:' + '\n' +
    '✅ SIM para confirmar' + '\n' +
    '🔄 NÃO para remarcar';
}
