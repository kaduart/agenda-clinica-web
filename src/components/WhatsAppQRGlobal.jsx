import { useState } from 'react';

// Estado global simples
let openModalFn = null;

export function openWhatsAppQRModal() {
  if (openModalFn) {
    openModalFn();
  }
}

export default function WhatsAppQRGlobal() {
  const [isOpen, setIsOpen] = useState(false);

  // Registra a função global
  if (typeof window !== 'undefined') {
    openModalFn = () => setIsOpen(true);
  }

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
              <h2 className="text-lg font-bold">WhatsApp</h2>
              <p className="text-emerald-100 text-sm">Envio de mensagens</p>
            </div>
          </div>
        </div>

        {/* Content - SÓ UMA OPÇÃO */}
        <div className="p-6 text-center">
          <div className="py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-cloud text-2xl text-blue-600"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              API Oficial do WhatsApp
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              ✅ Sistema configurado para enviar mensagens via API Oficial da Meta
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-left text-sm">
              <p className="font-medium text-gray-700 mb-2">Como funciona:</p>
              <ol className="text-gray-600 space-y-2 list-decimal list-inside">
                <li>O número WhatsApp Business já está conectado</li>
                <li>As mensagens são enviadas automaticamente via API</li>
                <li>Não precisa escanear QR code</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
