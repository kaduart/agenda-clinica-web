import React, { useEffect, useState } from 'react';
import api from '../services/api.js';

export default function WhatsAppConnectModal({ isOpen, onClose }) {
  const [status, setStatus] = useState({ status: 'loading', ready: false, qrCode: null, qrTimestamp: null, error: null });
  const [loading, setLoading] = useState(false);
  const [qrAge, setQrAge] = useState(0);
  const [connectingAge, setConnectingAge] = useState(0);
  const abortControllerRef = React.useRef(null);

  async function fetchStatus() {
    // Cancela requisição anterior se ainda estiver pendente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await api.get('/api/whatsapp-web/status', {
        signal: abortControllerRef.current.signal,
        timeout: 8000, // timeout curto: se o backend congelou, falha rápido
      });
      console.log('[WA Modal] status recebido:', {
        status: response.data?.status,
        ready: response.data?.ready,
        temQR: !!response.data?.qrCode,
        updatedAt: response.data?.updatedAt,
        pid: response.data?.pid,
        uptime: response.data?.uptime,
      });
      setStatus(response.data);
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        // Requisição cancelada intencionalmente — ignora
        return;
      }
      console.error('[WhatsAppConnect] Erro ao buscar status:', err.message);
      setStatus(prev => ({ ...prev, status: 'error', error: 'Servidor offline ou sobrecarregado' }));
    }
  }

  async function handleReconnect() {
    setLoading(true);
    try {
      await api.post('/api/whatsapp-web/reconnect', null, { timeout: 15000 });
      await fetchStatus();
    } catch (err) {
      console.error('[WhatsAppConnect] Erro ao reconectar:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();
    // Intervalo MAIOR quando em QR/connecting (10s) para não sobrecarregar o backend
    const intervalMs = (status.status === 'qr' || status.status === 'connecting') ? 10000 : 3000;
    const interval = setInterval(fetchStatus, intervalMs);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, status.status]);

  // Contador de idade do QR code
  useEffect(() => {
    if (status.status !== 'qr' || !status.qrTimestamp) {
      setQrAge(0);
      return;
    }
    const interval = setInterval(() => {
      setQrAge(Math.floor((Date.now() - status.qrTimestamp) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status.status, status.qrTimestamp]);

  // Contador de tempo no status connecting (sync)
  useEffect(() => {
    if (status.status !== 'connecting') {
      setConnectingAge(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      setConnectingAge(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status.status]);

  if (!isOpen) return null;

  const statusConfig = {
    ready: { label: 'Conectado', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    qr: { label: status.qrCode ? 'Escaneie o QR Code' : 'Aguardando QR Code...', color: 'text-amber-600', bg: 'bg-amber-100' },
    connecting: { label: 'QR escaneado — conectando...', color: 'text-blue-600', bg: 'bg-blue-100' },
    initializing: { label: 'Inicializando...', color: 'text-blue-600', bg: 'bg-blue-100' },
    error: { label: 'Erro', color: 'text-red-600', bg: 'bg-red-100' },
    disconnected: { label: 'Desconectado', color: 'text-gray-600', bg: 'bg-gray-100' },
    loading: { label: 'Carregando...', color: 'text-gray-600', bg: 'bg-gray-100' },
  };

  const current = statusConfig[status.status] || statusConfig.loading;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            <i className="fab fa-whatsapp text-green-600 mr-2"></i>
            Conectar WhatsApp
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={`mb-4 p-3 rounded-xl ${current.bg} ${current.color} text-sm font-semibold text-center`}>
          {current.label}
          {status.error && <div className="text-xs mt-1 opacity-80">{status.error}</div>}
        </div>

        {status.status === 'connecting' && (
          <div className="flex flex-col items-center mb-4 py-6">
            <div className="relative mb-4">
              <i className="fas fa-circle-notch fa-spin text-blue-500 text-5xl"></i>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fab fa-whatsapp text-white text-2xl"></i>
              </div>
            </div>
            <p className="text-base font-semibold text-gray-800 text-center mb-1">
              Sincronizando WhatsApp...
            </p>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              {connectingAge < 30
                ? 'Autenticando sessão...'
                : connectingAge < 120
                ? 'Baixando dados da conta... isso pode levar alguns minutos no primeiro acesso.'
                : 'Finalizando sincronização... quase pronto! Não feche esta janela.'}
            </p>
            <div className="mt-4 w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, 10 + connectingAge * 0.3)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              {Math.floor(connectingAge / 60)}:{String(connectingAge % 60).padStart(2, '0')} processando
            </p>
          </div>
        )}

        {status.status === 'qr' && status.qrCode && (
          <div className="flex flex-col items-center mb-4">
            <p className="text-sm text-gray-600 mb-3 text-center">
              Abra o WhatsApp no celular e escaneie o QR code:
            </p>
            {qrAge > 35 && (
              <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-center">
                <p className="text-xs text-red-600 font-semibold">
                  ⚠️ Este QR code pode estar expirado ({qrAge}s)
                </p>
                <p className="text-xs text-red-500">
                  Clique em "Gerar novo QR" para atualizar
                </p>
              </div>
            )}
            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-200">
              <img
                src={status.qrCode}
                alt="QR Code WhatsApp"
                className="w-48 h-48"
                key={status.qrTimestamp || 'qr'}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho
            </p>
            {status.qrTimestamp && (
              <p className="text-xs text-gray-400 mt-1 text-center">
                Gerado há {qrAge}s • Atualiza automaticamente
              </p>
            )}
          </div>
        )}

        {status.ready && (
          <div className="text-center mb-4 p-4 bg-emerald-50 rounded-xl">
            <i className="fas fa-check-circle text-emerald-500 text-3xl mb-2"></i>
            <p className="text-emerald-700 font-medium">WhatsApp conectado!</p>
            <p className="text-sm text-emerald-600">Pronto para enviar mensagens.</p>
          </div>
        )}

        {/* Painel de diagnóstico */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Diagnóstico</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-600">Status:</div>
            <div className="font-mono text-gray-800">{status.status}</div>
            <div className="text-gray-600">PID:</div>
            <div className="font-mono text-gray-800">{status.pid || '—'}</div>
            <div className="text-gray-600">Uptime:</div>
            <div className="font-mono text-gray-800">{status.uptime ? `${Math.floor(status.uptime)}s` : '—'}</div>
            <div className="text-gray-600">Sessão:</div>
            <div className="font-mono">
              {status.sessionPersisted === true ? (
                <span className="text-emerald-600">✅ Persistida ({status.sessionFiles} arquivos)</span>
              ) : status.sessionPersisted === false ? (
                <span className="text-red-600">❌ Não persistida</span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          </div>
          {status.sessionPersisted === false && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
              ⚠️ A sessão não está sendo salva em disco. A cada restart do servidor, você precisará escanear o QR novamente. Configure um Render Disk em <code>.wwebjs_auth/</code>.
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleReconnect}
            disabled={loading}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
          >
            {loading ? (
              <i className="fas fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fas fa-sync-alt mr-2"></i>
            )}
            Gerar novo QR
          </button>
          <button
            onClick={fetchStatus}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
          >
            <i className="fas fa-refresh mr-2"></i>
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}
