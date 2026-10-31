import { resolveAttendanceConfirmation } from "./attendanceConfirmation";
import { resolveSpecialtyKey } from "./specialty";
import { isCancelledAppointment, getPatientPhone } from "./daySummary";

// Inteligência comercial da agenda. Tudo calculado no navegador a partir da lista do dia
// + histórico curto (services/recentHistory). Nenhuma regra financeira é alterada aqui.

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const addDaysISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const pid = (a) => (a?.patientId || a?.patient?.id || a?.patient?._id || "").toString();
const isPackageAppt = (a) => !!(a.package || a.hasPackage || /package|pacote/i.test(String(a.serviceType || "")));
const isActive = (a) => !a.__isVirtual && !isCancelledAppointment(a);

// Índice por paciente a partir do histórico
export function buildPatientIndex(history = []) {
  const today = todayISO();
  const since = addDaysISO(-35);
  const idx = new Map();
  for (const a of history) {
    const id = pid(a);
    if (!id) continue;
    if (!idx.has(id)) idx.set(id, { missed: [], canceled: [], avulsas: 0, future: [] });
    const e = idx.get(id);
    const date = String(a.date || "").slice(0, 10);
    if (date < today && date >= since) {
      if (a.operationalStatus === "missed") e.missed.push(date);
      else if (isCancelledAppointment(a)) e.canceled.push(date);
      else if (a.billingType === "particular" && !isPackageAppt(a) && a.operationalStatus !== "pre_agendado") e.avulsas += 1;
    }
    if (date >= today && isActive(a)) e.future.push(a);
  }
  return idx;
}

const remainingSessions = (pkg) => {
  if (!pkg) return null;
  if (typeof pkg.remainingSessions === "number") return pkg.remainingSessions;
  if (typeof pkg.totalSessions === "number" && typeof pkg.sessionsDone === "number") return pkg.totalSessions - pkg.sessionsDone;
  return null;
};

const hoursSince = (iso) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 3600000);
};

export function getRowInsights(a, index) {
  if (!a || a.__isVirtual) return {};
  const out = {};
  const date = String(a.date || "").slice(0, 10);
  const today = todayISO();
  const entry = index?.get(pid(a));

  // 1. Risco de falta (só para o que ainda vai acontecer)
  if (isActive(a) && date >= today && a.operationalStatus !== "completed") {
    const reasons = [];
    const misses = (entry?.missed.length || 0) + (entry?.canceled.length || 0);
    if (entry?.missed.length >= 2) reasons.push(`faltou ${entry.missed.length}x nas últimas 5 semanas`);
    else if (misses >= 2) reasons.push(`faltou/cancelou ${misses}x nas últimas 5 semanas`);
    const conf = resolveAttendanceConfirmation(a);
    if (date <= addDaysISO(1) && conf?.status === "no_response") reasons.push("não respondeu a confirmação");
    if (date <= addDaysISO(1) && conf?.status === "change_requested") reasons.push("pediu alteração");
    if (reasons.length) out.missRisk = { level: reasons.length >= 2 || misses >= 3 ? "alto" : "médio", reasons };
  }

  // 3. Pacote acabando
  const rem = remainingSessions(a.package);
  if (isActive(a) && rem !== null && rem <= 1) out.packageEnding = { remaining: Math.max(rem, 0) };

  // 4. Pré-agendado esfriando
  if (isActive(a) && a.operationalStatus === "pre_agendado") {
    const created = a.raw?.createdAt || a.metadata?.createdAt;
    const lastContact = a.raw?.lastContactAt || a.metadata?.lastContactAt || a.raw?.updatedAt;
    const h = hoursSince(lastContact && a.attemptCount > 0 ? lastContact : created);
    if (h !== null && h >= 24) out.preCooling = { hours: h };
  }

  // 6. Avulso recorrente
  if (isActive(a) && a.billingType === "particular" && !isPackageAppt(a) && a.operationalStatus !== "pre_agendado") {
    const count = entry?.avulsas || 0;
    if (count >= 3) out.recurringAvulso = { count };
  }
  return out;
}

// 2. Quem pode ocupar um horário que vagou (cancelado ou livre)
export function findRefillCandidates(slot, history = [], dayList = [], index) {
  const spec = resolveSpecialtyKey(slot);
  const slotDate = String(slot.date || "").slice(0, 10);
  const slotPid = pid(slot);
  const today = todayISO();
  const seen = new Set([slotPid]);
  const out = [];
  const pool = [...dayList, ...history];

  // a) pré-agendados da mesma especialidade marcados para depois: dá para adiantar
  for (const a of pool) {
    const id = pid(a) || a.id;
    if (seen.has(id) || !isActive(a) || a.operationalStatus !== "pre_agendado") continue;
    if (resolveSpecialtyKey(a) !== spec || String(a.date).slice(0, 10) <= slotDate) continue;
    if (!getPatientPhone(a)) continue;
    seen.add(id);
    out.push({ appointment: a, reason: `pré-agendado para ${String(a.date).slice(8, 10)}/${String(a.date).slice(5, 7)}` });
  }
  // b) quem faltou/cancelou recentemente na mesma especialidade e está sem horário futuro
  for (const a of history) {
    const id = pid(a);
    if (!id || seen.has(id)) continue;
    const date = String(a.date || "").slice(0, 10);
    if (date >= today || resolveSpecialtyKey(a) !== spec) continue;
    if (a.operationalStatus !== "missed" && !isCancelledAppointment(a)) continue;
    if ((index?.get(id)?.future.length || 0) > 0 || !getPatientPhone(a)) continue;
    seen.add(id);
    out.push({ appointment: a, reason: `${a.operationalStatus === "missed" ? "faltou" : "cancelou"} em ${date.slice(8, 10)}/${date.slice(5, 7)}, sem horário marcado` });
  }
  return out.slice(0, 5);
}

// 5. Ocupação do dia por profissional (capacidade padrão: 08:00–18:40 em blocos de 40 min = 17)
export const DEFAULT_DAILY_CAPACITY = 17;
export function occupancyByProfessional(list = []) {
  const map = new Map();
  for (const a of list) {
    if (!isActive(a)) continue;
    const name = a.doctor?.fullName || (typeof a.professional === "string" ? a.professional : a.professional?.fullName) || "";
    if (!name) continue;
    map.set(name, (map.get(name) || 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count, pct: Math.min(100, Math.round((count / DEFAULT_DAILY_CAPACITY) * 100)) }))
    .sort((x, y) => x.pct - y.pct);
}
