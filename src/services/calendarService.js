import api from './api';

/**
 * 🗓️ Serviço de Calendário - API de Feriados
 * Substitui a lista hardcoded de feriados
 */

// Cache de feriados por ano (evita múltiplas requisições)
const holidaysCache = {};

/**
 * Busca feriados nacionais para um ano específico
 * @param {number} year - Ano para buscar feriados (padrão: ano atual)
 * @returns {Promise<Array>} Lista de feriados com {date, name, type}
 * 
 * Tipos:
 * - 'full': Feriado integral (ex: Natal)
 * - 'morning': Manhã livre, tarde bloqueada (Quarta-feira de Cinzas)
 * - 'afternoon': Tarde livre, manhã bloqueada
 */
export const getHolidays = async (year) => {
  const targetYear = year || new Date().getFullYear();
  
  // Retorna do cache se já buscou este ano
  if (holidaysCache[targetYear]) {
    return holidaysCache[targetYear];
  }
  
  try {
    const response = await api.get(`/api/calendar/holidays?year=${targetYear}`);
    
    if (response.data?.success) {
      const holidays = response.data.holidays;
      holidaysCache[targetYear] = holidays; // Armazena no cache
      return holidays;
    }
    
    return [];
  } catch (error) {
    console.error('[calendarService] Erro ao buscar feriados:', error);
    return [];
  }
};

/**
 * Converte array de feriados para objeto indexado por data
 * @param {Array} holidays - Array de feriados
 * @returns {Object} Record<data, {name, type}>
 */
export const holidaysToMap = (holidays) => {
  return holidays.reduce((map, holiday) => {
    map[holiday.date] = { name: holiday.name, type: holiday.type };
    return map;
  }, {});
};

/**
 * Verifica se uma data é feriado
 * @param {string} dateStr - Data no formato YYYY-MM-DD
 * @param {Object} holidaysMap - Mapa de feriados (de holidaysToMap)
 * @returns {boolean}
 */
export const isHoliday = (dateStr, holidaysMap) => {
  return !!holidaysMap[dateStr];
};

/**
 * Verifica se um horário específico está bloqueado por feriado
 * @param {string} dateStr - Data no formato YYYY-MM-DD
 * @param {string} time - Horário no formato HH:mm
 * @param {Object} holidaysMap - Mapa de feriados
 * @returns {Object|null} {name, blocked, note} ou null se não for feriado
 */
export const isTimeBlockedByHoliday = (dateStr, time, holidaysMap) => {
  const holiday = holidaysMap[dateStr];
  if (!holiday) return null;
  
  // Feriado integral - todos os horários bloqueados
  if (holiday.type === 'full') {
    return { 
      name: holiday.name, 
      blocked: true,
      note: null
    };
  }
  
  // Feriado parcial - verifica período
  const hour = parseInt(time?.split(':')[0] || '0', 10);
  
  if (holiday.type === 'morning') {
    // Manhã livre (antes das 12h), tarde bloqueada
    const isAfternoon = hour >= 12;
    return {
      name: holiday.name,
      blocked: isAfternoon,
      note: isAfternoon ? 'Tarde bloqueada (feriado parcial)' : 'Manhã livre'
    };
  }
  
  if (holiday.type === 'afternoon') {
    // Tarde livre (a partir das 12h), manhã bloqueada
    const isMorning = hour < 12;
    return {
      name: holiday.name,
      blocked: isMorning,
      note: isMorning ? 'Manhã bloqueada (feriado parcial)' : 'Tarde livre'
    };
  }
  
  return { name: holiday.name, blocked: true, note: null };
};

/**
 * Hook/React pattern: Carrega feriados no início da aplicação
 * @param {Function} setState - Função do useState para setar feriados
 * @param {number} year - Ano opcional
 */
export const loadHolidays = async (setState, year) => {
  const holidays = await getHolidays(year);
  const holidaysMap = holidaysToMap(holidays);
  setState(holidaysMap);
};

export default {
  getHolidays,
  holidaysToMap,
  isHoliday,
  isTimeBlockedByHoliday,
  loadHolidays
};
