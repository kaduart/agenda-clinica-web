const STATUS_ALIASES = {
  confirmed: 'confirmed',
  confirmada: 'confirmed',
  confirmado: 'confirmed',
  confirm: 'confirmed',
  yes: 'confirmed',
  sim: 'confirmed',
  change_requested: 'change_requested',
  solicitou_alteracao: 'change_requested',
  canceled: 'change_requested',
  cancelled: 'change_requested',
  cancelada: 'change_requested',
  cancelado: 'change_requested',
  cancelou: 'change_requested',
  declined: 'change_requested',
  rejected: 'change_requested',
  review_required: 'review_required',
  verificar_resposta: 'review_required',
  no_response: 'no_response',
  sem_resposta: 'no_response',
  unanswered: 'no_response',
  awaiting_response: 'no_response',
  pending: 'pending',
  sent: 'no_response',
};

const normalizeKey = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\s-]+/g, '_');

export const normalizeAttendanceConfirmationStatus = (value) => (
  STATUS_ALIASES[normalizeKey(value)] || null
);

export const resolveAttendanceConfirmation = (appointment = {}) => {
  const raw = appointment.attendanceConfirmation
    || appointment.patientConfirmation
    || appointment.confirmation
    || appointment.metadata?.attendanceConfirmation
    || appointment.metadata?.patientConfirmation
    || appointment.raw?.attendanceConfirmation
    || appointment.raw?.patientConfirmation
    || appointment.raw?.confirmation
    || null;

  const objectValue = raw && typeof raw === 'object' ? raw : {};
  const statusValue = typeof raw === 'string'
    ? raw
    : objectValue.status
      || objectValue.response
      || objectValue.value
      || appointment.confirmationStatus
      || appointment.metadata?.confirmationStatus
      || appointment.raw?.confirmationStatus;

  const sentAt = objectValue.sentAt
    || objectValue.messageSentAt
    || appointment.confirmationSentAt
    || appointment.reminderSentAt
    || appointment.metadata?.confirmationSentAt
    || appointment.raw?.confirmationSentAt
    || appointment.raw?.reminderSentAt
    || null;

  const isPersistedAppointment = Boolean(appointment.id || appointment._id) && !appointment.__isVirtual;
  const status = normalizeAttendanceConfirmationStatus(statusValue)
    || (sentAt ? 'no_response' : null)
    || (isPersistedAppointment ? 'pending' : null);

  if (!status) return null;

  return {
    status,
    sentAt,
    respondedAt: objectValue.respondedAt
      || objectValue.responseAt
      || appointment.confirmationRespondedAt
      || appointment.raw?.confirmationRespondedAt
      || null,
    channel: objectValue.channel || 'whatsapp',
    responseText: objectValue.responseText || null,
    manualUpdatedAt: objectValue.manualUpdatedAt || null,
    manualUpdatedBy: objectValue.manualUpdatedBy || null,
  };
};

export const ATTENDANCE_CONFIRMATION_UI = {
  pending: {
    label: 'Pendente',
    icon: 'fa-hourglass-half',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  confirmed: {
    label: 'Confirmou',
    icon: 'fa-check',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  change_requested: {
    label: 'Solicitou alteração',
    icon: 'fa-calendar-alt',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  review_required: {
    label: 'Verificar resposta',
    icon: 'fa-eye',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  no_response: {
    label: 'Sem resposta',
    icon: 'fa-clock',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
};

