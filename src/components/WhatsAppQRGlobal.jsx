import { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';

// 🟢 Baileys - WhatsApp não-oficial (sem Puppeteer)
// Substitui o whatsapp-web.js que não funciona no Render

// Estado global simples
let openModalFn = null;

export function openWhatsAppQRModal() {
  if (openModalFn) {
    openModalFn();
  }
}

export default function WhatsAppQRGlobal() {
  const [isOpen, setIsOpen] = useState(false);
  const [qrImage, setQrImage] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const lastQRRef = useRef(null);

  // Registra a função global
  useEffect(() => {
    openModalFn = () => setIsOpen(true);
    return () => {
      openModalFn = null;
    };
  }, []);

  const checkStatus = async () => {
    try {
      // 🟢 Usando Baileys (sem Puppeteer) - funciona no Render
      const response = await api.get('/api/baileys/status');
      const { status, hasQR, qrCodeBase64, connected } = response.data?.data || {};
      
      // Se já conectado
      if (connected || status === 'connected') {
        setIsReady(true);
        setQrImage(null);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setTimeout(() => {
          setIsOpen(false);
          setIsReady(false);
        }, 2000);
        return;
      }
      
      // Se tem QR code
      if (hasQR && qrCodeBase64 && qrCodeBase64 !== lastQRRef.current) {
        lastQRRef.current = qrCodeBase64;
        setQrImage(qrCodeBase64);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Erro ao verificar status:', err);
      setLoading(false);
    }
  };

  // Conectar ao abrir o modal
  const handleConnect = async () => {
    setLoading(true);
    try {
      await api.post('/api/baileys/connect');
      // Aguarda um pouco pro QR code ser gerado
      setTimeout(checkStatus, 2000);
    } catch (err) {
      console.error('Erro ao conectar:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      lastQRRef.current = null;
      return;
    }

    setIsReady(false);
    setQrImage(null);
    lastQRRef.current = null;
    setLoading(true);
    
    // Inicia conexão automaticamente
    handleConnect();
    
    // Polling de status
    intervalRef.current = setInterval(checkStatus, 5000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-4 text-white relative">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
          <div className="flex items-center gap-3">
            <i className="fab fa-whatsapp text-2xl"></i>
            <div>
              <h2 className="text-lg font-bold">Conectar WhatsApp</h2>
              <p className="text-emerald-100 text-sm">Escaneie o QR code para enviar mensagens</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          {loading ? (
            <div className="py-8">
              <i className="fas fa-spinner fa-spin text-3xl text-emerald-600 mb-3"></i>
              <p className="text-gray-600">Carregando QR code...</p>
            </div>
          ) : isReady ? (
            <div className="py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-check text-2xl text-green-600"></i>
              </div>
              <h3 className="text-lg font-semibold text-green-700 mb-2">WhatsApp Conectado!</h3>
              <p className="text-gray-600 text-sm">Você já pode enviar mensagens.</p>
            </div>
          ) : qrImage ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-200 inline-block">
                <img 
                  src={qrImage} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64"
                />
              </div>
              
              <div className="text-left space-y-3 bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-700">Como conectar:</p>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Menu ⋮ → "Aparelhos conectados"</li>
                  <li>Toque em "Conectar um aparelho"</li>
                  <li>Escaneie o QR code acima</li>
                </ol>
              </div>
              
              <p className="text-xs text-gray-500">
                Aguardando escaneamento... (atualiza a cada 10s)
              </p>
            </div>
          ) : (
            <div className="py-8">
              <i className="fas fa-spinner fa-spin text-3xl text-emerald-600 mb-3"></i>
              <p className="text-gray-600">Gerando QR code...</p>
              <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
