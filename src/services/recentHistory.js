import * as v2 from "../api/v2/agendaV2Client";
import { mapAppointmentListResponseDTO } from "../api/v2/appointment.response.dto";
import { formatDateLocal } from "../utils/date";

// Histórico curto (5 semanas para trás, 3 para frente) usado pela inteligência da agenda:
// risco de falta, fila de reposição e avulso recorrente.
// Uma busca só, com cache de 10 min, para não pesar a lista do dia.
const LOOKBACK_DAYS = 35;
const LOOKAHEAD_DAYS = 21;
const PAGE_SIZE = 500;
const MAX_PAGES = 4;
const CACHE_MS = 10 * 60 * 1000;

let cache = { at: 0, data: null, pending: null };

const shift = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDateLocal(d);
};

async function load() {
  const startDate = shift(-LOOKBACK_DAYS);
  const endDate = shift(LOOKAHEAD_DAYS);
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const raw = await v2.getCalendarData({ startDate, endDate, limit: PAGE_SIZE, page });
    const list = mapAppointmentListResponseDTO(raw || []);
    all.push(...list);
    if (list.length < PAGE_SIZE) break;
  }
  return all;
}

export function fetchRecentHistory({ force = false } = {}) {
  const fresh = cache.data && Date.now() - cache.at < CACHE_MS;
  if (fresh && !force) return Promise.resolve(cache.data);
  if (cache.pending) return cache.pending;
  cache.pending = load()
    .then((data) => {
      cache = { at: Date.now(), data, pending: null };
      return data;
    })
    .catch((err) => {
      cache.pending = null;
      throw err;
    });
  return cache.pending;
}
