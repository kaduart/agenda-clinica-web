import { getToken } from '../auth/session';

/**
 * Envia o token de quem entrou na agenda no handshake do Socket.IO.
 * Função (e não objeto) para o socket.io-client ler o token de novo a cada
 * reconexão: depois de um novo login, a reconexão já sai com o token novo.
 * O back (config/socketAuth.js) lê `handshake.auth.token`; em modo "enforce"
 * conexão sem token é recusada.
 */
export function socketAuth(cb) {
    cb({ token: getToken() || undefined });
}
