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
  const data = dateObj ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  const dataCompleta = dateObj ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const hora = paciente.time || '';
  const profissional = paciente.professional || paciente.doctor?.fullName || '';
  const especialidade = paciente.specialty || paciente.sessionType || '';

  // Verifica se é hoje ou amanhã
  const hoje = new Date().toISOString().split('T')[0];
  const ehHoje = dateStr === hoje;

  if (ehHoje) {
    const saudacao = responsavel 
      ? 'Bom dia, ' + responsavel + '! Tudo bem? 😊' 
      : 'Bom dia! Tudo bem? 😊';
    return saudacao + '\n\u200B\n' +
      'Passando para lembrar que hoje (' + dataCompleta + ') temos atendimento agendado na Clínica Fono Inova:' + '\n\u200B\n' +
      '👶 Paciente: ' + nomePaciente + '\n' +
      '🕒 ' + hora + ' – ' + especialidade + '\n\u200B\n' +
      'Posso confirmar sua presença?' + '\n' +
      'Qualquer dúvida, estamos à disposição.' + '\n' +
      'Até mais 😊';
  }

  const saudacao = responsavel 
    ? '👋 Olá, ' + responsavel + '!' 
    : '👋 Olá!';

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

  return saudacao + '\n\u200B\n' +
    'Estou passando para confirmar ' + tipoAtendimento + ' de amanhã 😊' + '\n\u200B\n' +
    '👶 Paciente: ' + nomePaciente + '\n' +
    '📅 Data: ' + data + '\n' +
    '⏰ Horário: ' + hora + '\n' +
    '👨‍⚕️ Profissional: ' + profissional + '\n\u200B\n' +
    'Você consegue comparecer?' + '\n\u200B\n' +
    'Responda:' + '\n' +
    '✅ SIM para confirmar' + '\n' +
    '🔄 NÃO para remarcar';
}
