import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = {};
vi.stubGlobal('localStorage', {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
});

const { socketAuth } = await import('./socketAuth');
const { saveSession } = await import('../auth/session');

describe('socketAuth (token no handshake do Socket.IO)', () => {
    beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

    it('manda o token da sessão', () => {
        saveSession('abc.def.ghi', { name: 'Secretaria' });
        const cb = vi.fn();
        socketAuth(cb);
        expect(cb).toHaveBeenCalledWith({ token: 'abc.def.ghi' });
    });

    it('sem sessão manda token vazio, sem quebrar', () => {
        const cb = vi.fn();
        socketAuth(cb);
        expect(cb).toHaveBeenCalledWith({ token: undefined });
    });
});
