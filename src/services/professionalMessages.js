/**
 * 🟢 Geradores de mensagem para profissionais/doutores
 *
 * Usados tanto no envio via Baileys quanto via WhatsApp Web nativo.
 */

function getSaudacao() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function extractDateString(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === 'string') {
    if (dateInput.includes('T')) {
      return dateInput.split('T')[0];
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
  }
  if (dateInput instanceof Date) {
    return dateInput.toISOString().split('T')[0];
  }
  return null;
}

function formatDate(dateInput) {
  const dateStr = extractDateString(dateInput);
  if (!dateStr) return '';
  const dateObj = new Date(dateStr + 'T12:00:00');
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatWeekday(dateInput) {
  const dateStr = extractDateString(dateInput);
  if (!dateStr) return '';
  const dateObj = new Date(dateStr + 'T12:00:00');
  return dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
}

function firstName(name) {
  return (name || 'Profissional').split(' ')[0];
}

/**
 * Notifica o profissional sobre um novo agendamento/avaliação.
 */
export function generateProfessionalNewAppointmentMessage(appointment) {
  const profissional = appointment.professional || appointment.doctor?.fullName || '';
  const nomePaciente = appointment.patientName || appointment.patient?.fullName || appointment.patient?.name || appointment.fullName || appointment.name || 'Paciente';
  const data = formatDate(appointment.date);
  const diaSemana = formatWeekday(appointment.date);
  const hora = appointment.time || '';
  const especialidade = appointment.specialty || appointment.specialtyKey || appointment.sessionType || '';
  const queixa = appointment.observations || appointment.notes || appointment.patient?.mainComplaint || '';

  let mensagem = `${getSaudacao()}, ${firstName(profissional)}! Tudo bem? 💚` + '\n\u200B\n' +
    'Novo agendamento confirmado na Clínica Fono Inova:' + '\n\u200B\n' +
    '👶 Paciente: *' + nomePaciente + '*' + '\n' +
    '📅 Data: *' + data + ' (' + diaSemana + ')*' + '\n' +
    '🕓 Horário: *' + hora + '*' + '\n' +
    '🩺 Especialidade: *' + especialidade + '*';

  if (queixa) {
    mensagem += '\n📝 Queixa principal: *' + queixa + '*';
  }

  return mensagem + '\n\u200B\n' +
    'Por favor, confirme sua ciência. Qualquer dúvida, estamos à disposição. 😊';
}

/**
 * Envia lembrete ao profissional sobre atendimento agendado.
 */
export function generateProfessionalReminderMessage(appointment) {
  const profissional = appointment.professional || appointment.doctor?.fullName || '';
  const nomePaciente = appointment.patientName || appointment.patient?.fullName || appointment.patient?.name || appointment.fullName || appointment.name || 'Paciente';
  const data = formatDate(appointment.date);
  const diaSemana = formatWeekday(appointment.date);
  const hora = appointment.time || '';
  const especialidade = appointment.specialty || appointment.specialtyKey || appointment.sessionType || '';
  const queixa = appointment.observations || appointment.notes || appointment.patient?.mainComplaint || '';

  const dateStr = extractDateString(appointment.date);
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const amanhaStr = amanha.toISOString().split('T')[0];

  let dataTexto;
  if (dateStr === hojeStr) {
    dataTexto = '*hoje*';
  } else if (dateStr === amanhaStr) {
    dataTexto = '*amanhã* (' + data + ')';
  } else {
    dataTexto = '*' + data + ' (' + diaSemana + ')*';
  }

  let mensagem = `${getSaudacao()}, ${firstName(profissional)}! 💚` + '\n\u200B\n' +
    'Lembrete de atendimento agendado ' + dataTexto + ' na Clínica Fono Inova:' + '\n\u200B\n' +
    '👶 Paciente: *' + nomePaciente + '*' + '\n' +
    '🕓 Horário: *' + hora + '*' + '\n' +
    '🩺 Especialidade: *' + especialidade + '*';

  if (queixa) {
    mensagem += '\n📝 Queixa principal: *' + queixa + '*';
  }

  return mensagem + '\n\u200B\n' +
    'Até mais! 😊';
}
