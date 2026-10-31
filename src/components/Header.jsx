import { useEffect, useState } from 'react';
import WhatsAppConnectModal from './WhatsAppConnectModal';
import WhatsNewModal, { shouldAutoOpenWhatsNew } from './WhatsNewModal';
import { getWhatsAppWebStatus } from '../api/v2/whatsappClient.js';
import { getSession, clearSession } from '../auth/session';

export default function Header({ view, setView, remindersPendingCount = 0, onOpenReminders }) {
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    // Guia de novidades: abre sozinho uma vez e depois pelo botão "?"
    const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(() => shouldAutoOpenWhatsNew());
    const [whatsAppStatus, setWhatsAppStatus] = useState({ ready: false, status: 'unknown' });

    useEffect(() => {
        const handler = () => setIsWhatsAppModalOpen(true);
        window.addEventListener('open-whatsapp-connect', handler);
        return () => window.removeEventListener('open-whatsapp-connect', handler);
    }, []);

    // Poll do status do WhatsApp (só alimenta a bolinha do cabeçalho): a cada 30s e somente com a
    // aba visível; ao voltar para a aba, atualiza na hora. O modal de conexão tem polling próprio.
    useEffect(() => {
        let inFlight = false;
        async function checkStatus() {
            if (document.hidden || inFlight) return;
            inFlight = true;
            try {
                const data = await getWhatsAppWebStatus({ timeout: 5000 });
                setWhatsAppStatus(data);
            } catch {
                setWhatsAppStatus({ ready: false, status: 'error' });
            } finally {
                inFlight = false;
            }
        }
        checkStatus();
        const interval = setInterval(checkStatus, 30000);
        const onVisible = () => { if (!document.hidden) checkStatus(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    const isConnected = whatsAppStatus.ready;
    const statusColor = isConnected ? 'bg-emerald-300' : 'bg-red-400';

    return (
        <header className="bg-[#0d9387] border-b border-[#0b7d73] px-3 sm:px-6 py-2.5">
            <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2.5 mr-auto min-w-0">
                    <img
                        className="w-9 h-9 object-contain shrink-0"
                        src="/images/cabeca-logo-verde-clara.png"
                        alt="Logo Clínica Fono Inova"
                    />
                    <div className="min-w-0">
                        <h1 className="font-head text-base font-bold leading-tight text-white">Agenda externa</h1>
                        <p className="text-xs text-white/75 leading-tight">Clínica Fono Inova</p>
                    </div>
                </div>

                {/* Lista / Semanal */}
                <div className="inline-flex rounded-xl bg-black/15 p-0.5" role="group" aria-label="Visualização">
                    <button
                        type="button"
                        aria-pressed={view === "list"}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${view === "list" ? "bg-white text-fi-deep shadow-sm" : "text-white/80 hover:text-white"}`}
                        onClick={() => setView("list")}
                    >
                        <i className="fas fa-list mr-1.5 text-xs"></i>Lista
                    </button>
                    {/* TODO: reativar quando CalendarView for implementado como calendário mensal real.
                         Atualmente CalendarView é uma cópia de WeeklyView, então o botão fica oculto para evitar confusão. */}
                    <button
                        type="button"
                        aria-pressed={view === "weekly"}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${view === "weekly" ? "bg-white text-fi-deep shadow-sm" : "text-white/80 hover:text-white"}`}
                        onClick={() => setView("weekly")}
                    >
                        <i className="fas fa-table-cells-large mr-1.5 text-xs"></i>Semanal
                    </button>
                </div>

                {/* WhatsApp: status em texto + bolinha */}
                <button
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    className="h-9 px-3 inline-flex items-center gap-2 rounded-xl bg-white/10 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                    title={isConnected ? 'WhatsApp conectado' : 'Conectar WhatsApp'}
                >
                    <span className={`h-2 w-2 rounded-full ${statusColor}`} aria-hidden="true"></span>
                    <i className="fab fa-whatsapp text-white"></i>
                    <span className="hidden sm:inline">{isConnected ? 'Conectado' : 'Conectar'}</span>
                </button>

                {/* Novidades / como usar */}
                <button
                    onClick={() => setIsWhatsNewOpen(true)}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors font-head font-bold"
                    title="Novidades da agenda"
                    aria-label="Novidades da agenda"
                >
                    ?
                </button>

                {/* Lembretes */}
                <button
                    onClick={onOpenReminders}
                    className="relative h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                    title="Ver lembretes"
                    aria-label={remindersPendingCount > 0 ? `Lembretes, ${remindersPendingCount} pendentes` : 'Lembretes'}
                >
                    <i className="fas fa-bell"></i>
                    {remindersPendingCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 border-2 border-[#0d9387] text-[10px] font-bold text-white inline-flex items-center justify-center">
                            {remindersPendingCount}
                        </span>
                    )}
                </button>

                {/* Quem está logado + sair */}
                <button
                    onClick={() => { if (window.confirm('Sair da agenda?')) clearSession('logout'); }}
                    className="h-9 px-3 inline-flex items-center gap-2 rounded-xl bg-white/10 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                    title="Sair da agenda"
                >
                    <i className="fas fa-right-from-bracket"></i>
                    <span className="hidden md:inline max-w-[10rem] truncate">{getSession()?.user?.name || getSession()?.user?.fullName || 'Sair'}</span>
                </button>
            </div>
            <WhatsNewModal open={isWhatsNewOpen} onClose={() => setIsWhatsNewOpen(false)} />
            <WhatsAppConnectModal
                isOpen={isWhatsAppModalOpen}
                onClose={() => setIsWhatsAppModalOpen(false)}
            />
        </header>
    );
}
