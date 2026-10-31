/**
 * Sessão da Agenda Externa: login com a mesma conta do ERP (admin ou secretária).
 * Substitui o token fixo (VITE_API_TOKEN) que ia dentro do código do site.
 */
const KEY = 'agendaSession_v1';

function decodeExp(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.exp ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}

export function getSession() {
    try {
        const s = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (!s?.token) return null;
        if (s.exp && Date.now() > s.exp) {
            localStorage.removeItem(KEY);
            return null;
        }
        return s;
    } catch {
        return null;
    }
}

export function getToken() {
    return getSession()?.token || null;
}

export function saveSession(token, user) {
    const s = { token, user, exp: decodeExp(token) };
    localStorage.setItem(KEY, JSON.stringify(s));
    return s;
}

export function clearSession(reason = 'logout') {
    try { localStorage.removeItem(KEY); } catch { /* sem storage */ }
    window.dispatchEvent(new CustomEvent('agenda-session-ended', { detail: { reason } }));
}
