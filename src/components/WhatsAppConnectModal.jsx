import React, { useEffect, useState } from 'react';
import api from '../services/api.js';

export default function WhatsAppConnectModal({ isOpen, onClose }) {
  const [status, setStatus] = useState({ status: 'loading', ready: false, qrCode: null, error: null });
  const [loading, setLoading] = useState(false);

  async function fetchStatus() {
    try {
      const response = await api.get('/api/whatsapp-web/status');
      setStatus(response.data);
    } catch (err) {
      console.error('[WhatsAppConnect] Erro ao buscar status:', err.message);
      setStatus(prev => ({ ...prev, status: 'error', error: 'Servidor offline' }));
    }
  }

  async function handleReconnect() {
    setLoading(true);
    try {
      await api.post('/api/whatsapp-web/reconnect');
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
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const statusConfig = {
    ready: { label: 'Conectado', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    qr: { label: 'Aguardando QR Code', color: 'text-amber-600', bg: 'bg-amber-100' },
    initializing: { label: 'Inicializando', color: 'text-blue-600', bg: 'bg-blue-100' },
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

        {status.status === 'qr' && status.qrCode && (
          <div className="flex flex-col items-center mb-4">
            <p className="text-sm text-gray-600 mb-3 text-center">
              Abra o WhatsApp no celular e escaneie o QR code:
            </p>
            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-200">
              <img src={status.qrCode} alt="QR Code WhatsApp" className="w-48 h-48" />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho
            </p>
          </div>
        )}

        {status.ready && (
          <div className="text-center mb-4 p-4 bg-emerald-50 rounded-xl">
            <i className="fas fa-check-circle text-emerald-500 text-3xl mb-2"></i>
            <p className="text-emerald-700 font-medium">WhatsApp conectado!</p>
            <p className="text-sm text-emerald-600">Pronto para enviar mensagens.</p>
          </div>
        )}

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
