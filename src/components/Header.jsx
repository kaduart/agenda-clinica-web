import { useEffect, useState } from 'react';
import WhatsAppConnectModal from './WhatsAppConnectModal';
import api from '../services/api.js';

export default function Header({ view, setView, remindersPendingCount = 0, onOpenReminders }) {
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsAppStatus, setWhatsAppStatus] = useState({ ready: false, status: 'unknown' });

    useEffect(() => {
        const handler = () => setIsWhatsAppModalOpen(true);
        window.addEventListener('open-whatsapp-connect', handler);
        return () => window.removeEventListener('open-whatsapp-connect', handler);
    }, []);

    // Poll status do WhatsApp a cada 10s
    useEffect(() => {
        async function checkStatus() {
            try {
                const res = await api.get('/api/whatsapp-web/status', { timeout: 5000 });
                setWhatsAppStatus(res.data);
            } catch {
                setWhatsAppStatus({ ready: false, status: 'error' });
            }
        }
        checkStatus();
        const interval = setInterval(checkStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    const isConnected = whatsAppStatus.ready;
    const statusColor = isConnected ? 'bg-emerald-400' : 'bg-red-400';

    return (
        <header className="bg-teal-600 border-b border-gray-200 py-4 px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <img
                        className="w-14 h-14 object-contain"
                        src="/images/cabeca-logo-verde-clara.png"
                        alt="Logo Clínica Fono Inova"
                    />

                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-white">
                            Agenda Clínica Fono Inova
                        </h1>

                        <p className="text-sm text-white/80">
                            Controle de agendamentos
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Botão de Lembretes no Header */}
                    <button
                        onClick={onOpenReminders}
                        className="relative group p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300"
                        title="Ver lembretes"
                    >
                        <i className="fas fa-bell text-white text-xl"></i>
                        {remindersPendingCount > 0 && (
                            <>
                                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-teal-600 text-[10px] font-bold text-white items-center justify-center">
                                        {remindersPendingCount}
                                    </span>
                                </span>
                            </>
                        )}
                    </button>

                    {/* Botão WhatsApp Connect */}
                    <button
                        onClick={() => setIsWhatsAppModalOpen(true)}
                        className="relative group p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300"
                        title={isConnected ? 'WhatsApp conectado' : 'Conectar WhatsApp'}
                    >
                        <i className={`fab fa-whatsapp text-xl ${isConnected ? 'text-emerald-300' : 'text-white'}`}></i>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${statusColor}`}></span>
                        </span>
                    </button>

                    <div className="h-8 w-px bg-white/20 mx-1"></div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${view === "list"
                                ? "bg-white text-teal-700 shadow"
                                : "bg-teal-700/50 text-white hover:bg-teal-700/70"
                                }`}
                            onClick={() => setView("list")}
                        >
                            <i className="fas fa-list mr-2"></i> Lista
                        </button>

                        <button
                            type="button"
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${view === "calendar"
                                ? "bg-white text-teal-700 shadow"
                                : "bg-teal-700/50 text-white hover:bg-teal-700/70"
                                }`}
                            onClick={() => setView("calendar")}
                        >
                            <i className="far fa-calendar-alt mr-2"></i> Calendário
                        </button>

                        <button
                            type="button"
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${view === "weekly"
                                ? "bg-white text-teal-700 shadow"
                                : "bg-teal-700/50 text-white hover:bg-teal-700/70"
                                }`}
                            onClick={() => setView("weekly")}
                        >
                            <i className="fas fa-table-cells-large mr-2"></i> Semanal
                        </button>
                    </div>
                </div>
            </div>

            <WhatsAppConnectModal
                isOpen={isWhatsAppModalOpen}
                onClose={() => setIsWhatsAppModalOpen(false)}
            />
        </header>
    );
}
