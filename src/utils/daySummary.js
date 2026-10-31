import { resolveAttendanceConfirmation } from "./attendanceConfirmation";

// Classificação usada pelo resumo do dia (DaySummary) e pelos filtros rápidos da lista.
// Tudo calculado a partir da lista já carregada: nenhuma chamada extra ao backend.

export const getPatientName = (a = {}) =>
  a.patientName || a.patient?.name || a.patient?.fullName || (typeof a.patient === "string" ? a.patient : "") || "";

// Mesmo critério do AppointmentRow: telefone do paciente antes do telefone do agendamento
export const getPatientPhone = (a = {}) => a.patient?.phone || a.phone || a.patientPhone || "";

export const isCancelledAppointment = (a = {}) =>
  a.status === "Cancelado" ||
  a.status === "canceled" ||
  a.status === "desistiu" ||
  a.status === "descartado" ||
  a.operationalStatus === "canceled" ||
  a.operationalStatus === "Cancelado";

const confirmationStatus = (a) => resolveAttendanceConfirmation(a)?.status || null;

const isActive = (a) => !a.__isVirtual && !isCancelledAppointment(a);

export const QUICK_FILTERS = {
  agendados: {
    label: "Agendados",
    match: (a) => isActive(a),
  },
  confirmaram: {
    label: "Confirmaram",
    match: (a) => isActive(a) && confirmationStatus(a) === "confirmed",
  },
  semResposta: {
    label: "Sem resposta",
    // Ainda vai acontecer (agendado ou pré) e a família não respondeu
    match: (a) =>
      isActive(a) &&
      (a.operationalStatus === "scheduled" || a.operationalStatus === "pre_agendado") &&
      [null, "pending", "no_response"].includes(confirmationStatus(a)),
  },
  contato: {
    label: "Falar com a família",
    match: (a) => isActive(a) && ["change_requested", "review_required"].includes(confirmationStatus(a)),
  },
  pre: {
    label: "Pré-agendados",
    match: (a) => isActive(a) && a.operationalStatus === "pre_agendado",
  },
  livres: {
    label: "Horários livres",
    match: (a) => !!a.__isVirtual,
  },
  avaliacao: {
    label: "Pedir avaliação",
    match: (a) =>
      !a.__isVirtual &&
      (a.operationalStatus === "completed" || a.operationalStatus === "confirmed") &&
      !a.reviewRequestSentAt,
  },
};

export function summarizeDay(list = []) {
  const counts = {};
  for (const key of Object.keys(QUICK_FILTERS)) counts[key] = 0;
  let newPre = 0;
  const professionals = new Set();
  for (const a of list) {
    for (const [key, f] of Object.entries(QUICK_FILTERS)) {
      if (f.match(a)) counts[key] += 1;
    }
    if (QUICK_FILTERS.pre.match(a) && (a.metadata?.preAgendamentoStatus || a.status) === "novo") newPre += 1;
    if (isActive(a)) {
      const p = a.doctor?.fullName || a.professional?.fullName || (typeof a.professional === "string" ? a.professional : "");
      if (p) professionals.add(p);
    }
  }
  return { counts, newPre, professionalsCount: professionals.size };
}

export const applyQuickFilter = (list, key) => {
  const f = QUICK_FILTERS[key];
  return f ? list.filter(f.match) : list;
};
