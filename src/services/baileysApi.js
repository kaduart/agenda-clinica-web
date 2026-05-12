/**
 * 🟢 API Baileys - Envia mensagens WhatsApp direto pelo backend
 */

import api from "./api";

/**
 * Envia mensagem de texto (tenta Baileys → WhatsApp Web → VPS → Meta API)
 */
export async function sendWhatsAppMessage(phone, message) {
  // 1. Tenta Baileys
  try {
    const response = await api.post("/api/baileys/send", { phone, message });
    return response.data;
  } catch (err) {
    const error = err.response?.data?.error || '';
    console.log('[Baileys] Falhou, tentando WhatsApp Web...', error);

    // 2. Tenta WhatsApp Web nativo
    try {
      const response = await api.post('/api/whatsapp-web/send', { phone, message });
      return response.data;
    } catch (err2) {
      const error2 = err2.response?.data?.error || '';
      console.log('[WhatsApp Web] Falhou, tentando VPS...', error2);

      // 3. Tenta VPS
      try {
        const response = await api.post('/api/whatsapp-vps/send', { phone, message });
        return response.data;
      } catch (err3) {
        const error3 = err3.response?.data?.error || '';
        console.log('[VPS] Falhou, tentando Meta API...', error3);

        // 4. Fallback Meta API
        try {
          const response = await api.post('/api/whatsapp/send-text', { phone, text: message });
          return response.data;
        } catch (metaErr) {
          const metaError = metaErr.response?.data?.error || metaErr.message;
          return { success: false, error: metaError };
        }
      }
    }
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
 * Retorna saudação baseada no horário atual
 */
function getSaudacao() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Resolve o tipo de atendimento baseado em serviceType ou specialty
 */
function resolveTipoAtendimento(paciente) {
  const serviceTypeMap = {
    'evaluation': 'a avaliação',
    'session': 'a sessão',
    'package_session': 'a sessão do pacote',
    'individual_session': 'a sessão individual',
    'meet': 'a reunião',
    'alignment': 'o alinhamento',
    'return': 'o retorno',
    'tongue_tie_test': 'o teste da linguinha',
    'neuropsych_evaluation': 'a avaliação neuropsicológica',
    'convenio_session': 'a sessão de convênio'
  };
  if (paciente.serviceType && serviceTypeMap[paciente.serviceType]) {
    return serviceTypeMap[paciente.serviceType];
  }
  const specialty = (paciente.specialty || '').toLowerCase();
  if (specialty.includes('teste da linguinha') || specialty.includes('tongue')) return 'o teste da linguinha';
  if (specialty.includes('avaliação neuropsicológica') || specialty.includes('neuropsic')) return 'a avaliação neuropsicológica';
  if (specialty.includes('avaliação')) return 'a avaliação';
  if (specialty.includes('psicologia')) return 'a sessão de psicologia';
  if (specialty.includes('fonoaudiologia')) return 'a sessão de fonoaudiologia';
  if (specialty.includes('fisioterapia')) return 'a sessão de fisioterapia';
  if (specialty.includes('pediatria')) return 'a consulta de pediatria';
  if (specialty.includes('psicomotricidade')) return 'a sessão de psicomotricidade';
  if (specialty.includes('psicopedagogia')) return 'a sessão de psicopedagogia';
  if (specialty.includes('terapia ocupacional')) return 'a sessão de terapia ocupacional';
  if (specialty.includes('musicoterapia')) return 'a sessão de musicoterapia';
  return 'o atendimento';
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
    ? 'Oi, ' + responsavel + ', tudo certinho! 💚' 
    : 'Oi, tudo certinho! 💚';
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
  const tipoAtendimento = resolveTipoAtendimento(paciente);

  if (ehHoje) {
    const saudacao = responsavel 
      ? '👋 ' + getSaudacao() + ', ' + responsavel + '!' 
      : '👋 ' + getSaudacao() + '!';
    return saudacao + '\n\u200B\n' +
      'Passando para lembrar que *hoje* temos ' + tipoAtendimento + ' agendado na Clínica Fono Inova:' + '\n\u200B\n' +
      '👶 Paciente: *' + nomePaciente + '*' + '\n' +
      '🕓 *' + hora + '* *' + profissional + '*' + '\n\u200B\n' +
      'Posso confirmar sua presença?' + '\n\u200B\n' +
      'Até mais 😊';
  }

  const saudacao = responsavel 
    ? '👋 ' + getSaudacao() + ', ' + responsavel + '!' 
    : '👋 ' + getSaudacao() + '!';

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
