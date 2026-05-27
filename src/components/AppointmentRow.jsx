import { useState } from "react";
import { SPECIALTIES } from "../config/specialties";
import { formatDateDisplay } from "../utils/date";
// formatDateDisplay mantido para compatibilidade — não usado diretamente neste componente
import { resolveSpecialtyKey } from "../utils/specialty";
import { resolveServiceType, getServiceTypeLabel, getServiceTypeColorClass } from "../utils/serviceType";
import { sendViaExtension, generateConfirmationMessage, generateReminderMessage } from "../services/whatsappExtension";

export default function AppointmentRow({ appointment, onEdit, onDelete, onReminder, onGenerateCycle, onCancel }) {
  
  const [showMenu, setShowMenu] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(null); // 'confirm' | 'reminder' | null

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
      case "paid":
      case "Confirmado":
      case "Compareceu":
        return "bg-emerald-600 text-white border border-emerald-700";
      case "scheduled":
      case "pending":
      case "Pendente":
      case "Agendado":
        return "bg-blue-600 text-white border border-blue-700";
      case "canceled":
      case "Cancelado":
        return "bg-gray-500 text-white border border-gray-600";
      case "missed":
        return "bg-rose-600 text-white border border-rose-700";
      case "pre_agendado":
      case "Pré-Agendado":
        return "bg-violet-600 text-white border border-violet-700";
      default:
        return "bg-gray-500 text-white border border-gray-600";
    }
  };

  const specialtyKey = resolveSpecialtyKey(appointment);

  const hasReminder = !!(appointment.reminderText && !appointment.reminderDone);

  const patientName = appointment.patientName || appointment.patient?.name || appointment.patient?.fullName || (typeof appointment.patient === 'string' ? appointment.patient : '') || "";
  
  
  // Pegar telefone do PACIENTE primeiro (não do appointment direto)
  // appointment.phone pode vir com número da clínica em integrações
  const patientPhone = appointment.patient?.phone ||
                       appointment.phone ||
                       appointment.patientPhone ||
                       "";
  
  const isLivre =
    (appointment.professional && String(appointment.professional).toLowerCase().includes("livre")) ||
    (patientName.toLowerCase().includes("livre")) ||
    (appointment.observations && String(appointment.observations).toLowerCase().includes("livre"));

  const rowToneBySpecialty = (key) => {
    const s = SPECIALTIES[key];
    if (!s) {
      return { bg: "bg-white", hover: "hover:bg-gray-100", border: "border-l-gray-400", text: "text-gray-700" };
    }
    // Deriva a cor de borda a partir do textColor (ex: text-teal-700 → border-l-teal-500)
    const colorBase = s.textColor.replace("text-", "").replace("-700", "");
    return {
      bg: s.lightBg,
      hover: s.lightBg.replace("-50", "-100").replace("bg-", "hover:bg-"),
      border: `border-l-${colorBase}-500`,
      text: s.textColor,
    };
  };

  const isCancelled =
    appointment.status === "Cancelado" ||
    appointment.status === "canceled" ||
    appointment.status === "desistiu" ||
    appointment.status === "descartado" ||
    appointment.operationalStatus === "canceled" ||
    appointment.operationalStatus === "Cancelado";

  const isPre = appointment.operationalStatus === 'pre_agendado';
  const preStatus = appointment.metadata?.preAgendamentoStatus || appointment.status;
  const source = appointment.source || appointment.metadata?.origin?.source;

  const getSourceIcon = (src) => {
    switch (src) {
      case 'whatsapp':
      case 'bot':
      case 'amandaAI': return <i className="fas fa-robot text-indigo-500 mr-1" title="AmandaAI / WhatsApp"></i>;
      case 'site': return <i className="fas fa-globe text-blue-500 mr-1" title="Site"></i>;
      case 'telefone': return <i className="fas fa-phone text-green-500 mr-1" title="Telefone"></i>;
      default: return <i className="fas fa-desktop text-gray-400 mr-1" title="Agenda Externa"></i>;
    }
  };

  const getPreStatusBadge = (status) => {
    switch (status) {
      case 'novo': return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white animate-pulse">NOVO</span>;
      case 'em_analise': return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">EM ANÁLISE</span>;
      case 'contatado': return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500 text-white">CONTATADO</span>;
      case 'confirmado': return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-white">INTERESSE</span>;
      case 'desistiu':
      case 'descartado':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white">DESCARTADO</span>;
      default: return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500 text-white">INTERESSE</span>;
    }
  };

  const tone = rowToneBySpecialty(specialtyKey);
  const rowAccent = isCancelled
    ? "border-l-[6px] border-l-gray-400 bg-gray-100"
    : isLivre
      ? "border-l-[6px] border-l-emerald-600 bg-emerald-100 hover:bg-emerald-200"
      : isPre
        ? "border-l-[6px] border-l-violet-600 bg-violet-100 hover:bg-violet-200"
        : `border-l-[6px] ${tone.border} ${tone.bg.replace('-50', '-100')} ${tone.hover.replace('-100', '-200').replace('-50', '-100')}`;

  // Handler para enviar mensagem WhatsApp
  const handleWhatsAppSend = async (type) => {
    if (!patientPhone) {
      showToast('Paciente sem telefone cadastrado', 'error');
      return;
    }

    setSendingWhatsApp(type);

    const message = type === 'confirm' 
      ? generateConfirmationMessage({
          ...appointment,
          fullName: patientName,
          professional: appointment.professional || appointment.doctor?.fullName
        })
      : generateReminderMessage({
          ...appointment,
          fullName: patientName
        });
    
    const result = await sendViaExtension(patientPhone, message);
    
    setSendingWhatsApp(null);
    
    if (result.success) {
      showToast(`✅ ${type === 'confirm' ? 'Confirmado' : 'Lembrete'} enviado!`, 'success');
      // Se usou fallback (Meta API/VPS), avisa que precisa conectar o WhatsApp Web nativo
      if (result.needsReconnect) {
        window.dispatchEvent(new CustomEvent('open-whatsapp-connect'));
        showToast('Mensagem enviada pela Meta API. Conecte o WhatsApp Web nativo para usar chip comum.', 'warning');
      }
    } else if (result.error?.includes('conectado') || result.error?.includes('QR') || result.error?.includes('desconectado') || result.needsReconnect) {
      // Abre modal de conexão automaticamente
      window.dispatchEvent(new CustomEvent('open-whatsapp-connect'));
      showToast('WhatsApp desconectado. Escaneie o QR code.', 'error');
    } else {
      showToast(result.error || 'Erro ao enviar', 'error');
    }
  };

  function showToast(msg, variant = 'success') {
    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-500',
      error: 'bg-red-500',
      warning: 'bg-amber-500'
    };
    toast.className = `fixed bottom-4 right-4 ${colors[variant] || colors.success} text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg`;
    toast.innerHTML = `<i class="fab fa-whatsapp mr-2"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 border-l-[4px] transition-all shadow-sm ${rowAccent} ${isCancelled ? 'opacity-60 grayscale' : ''}`}>

      {/* Paciente */}
      <div className="flex-1 min-w-0">
        <div className={`font-semibold flex items-center gap-1.5 flex-wrap text-[15px] ${isCancelled ? 'line-through text-gray-500' : 'text-gray-900'}`}>
          {source && getSourceIcon(source)}
          <span className="truncate">{patientName || "-"}</span>
          {hasReminder && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-yellow-200 text-yellow-900 shrink-0">lembrete</span>
          )}
          {isPre && getPreStatusBadge(preStatus)}
          {isPre && appointment.attemptCount > 0 && (
            <span className="text-[10px] text-gray-500 shrink-0"><i className="fas fa-phone-alt"></i> {appointment.attemptCount}</span>
          )}
        </div>
        {appointment.responsible && (
          <div className="text-xs text-gray-500 mt-0.5 truncate">{appointment.responsible}</div>
        )}
      </div>

      {/* Hora */}
      <div className="w-14 shrink-0">
        <div className="text-gray-900 font-bold text-sm leading-tight">{appointment.time || "-"}</div>
        <div className="text-[10px] text-gray-400 whitespace-nowrap">
          {(() => {
            const [y, m, d] = (appointment.date || "").split("-");
            if (!y || !m || !d) return "";
            const date = new Date(Number(y), Number(m) - 1, Number(d));
            return `${date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}, ${d}/${m}`;
          })()}
        </div>
      </div>

      {/* Profissional */}
      <div className="w-36 shrink-0 hidden md:block">
        <div className="text-gray-800 font-medium text-sm truncate">
          {appointment.doctor?.fullName || appointment.professional?.fullName || appointment.professional?.name || (typeof appointment.professional === 'string' ? appointment.professional : null) || "-"}
        </div>
      </div>

      {/* Área */}
      <div className="w-28 shrink-0 hidden lg:block">
        <div className={`font-semibold text-sm ${tone.text || 'text-gray-900'}`}>{SPECIALTIES[specialtyKey]?.name || appointment.specialty || "-"}</div>
        {(() => {
          const st = resolveServiceType(appointment);
          if (!st) return null;
          const label = getServiceTypeLabel(st);
          const colorClass = getServiceTypeColorClass(st);
          return label ? <span className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>{label}</span> : null;
        })()}
      </div>

      {/* Anotações */}
      <div className="w-24 shrink-0 hidden xl:block">
        <div className="text-xs text-gray-600 truncate" title={appointment.observations || ""}>{appointment.observations || "-"}</div>
      </div>

      {/* Status */}
      <div className="w-24 shrink-0 text-center">
        <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-full ${getStatusColor(appointment.operationalStatus)}`}>
          {isPre ? 'Pré-agendado' : (appointment.status || appointment.operationalStatus || "-")}
        </span>
      </div>

      {/* Controles */}
      <div className="w-24 shrink-0">
        <div className="flex gap-0.5 items-center justify-end">
          {patientPhone && (isPre || appointment.operationalStatus === 'scheduled') && (
            <button type="button" className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg" onClick={() => handleWhatsAppSend('confirm')} title="Confirmar (WhatsApp)">
              <i className="fab fa-whatsapp text-base"></i>
            </button>
          )}
          {patientPhone && (
            <button type="button" className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg disabled:opacity-50" onClick={() => handleWhatsAppSend('reminder')} disabled={sendingWhatsApp === 'reminder'} title="Lembrete (WhatsApp)">
              {sendingWhatsApp === 'reminder' ? <i className="fas fa-spinner fa-spin text-sm"></i> : <i className="fas fa-bell text-sm"></i>}
            </button>
          )}
          <button type="button" className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white/60 rounded-lg" onClick={() => onEdit(appointment)} title={appointment.__isVirtual ? "Agendar" : "Editar"}>
            <i className={`fas ${appointment.__isVirtual ? 'fa-calendar-plus text-emerald-600' : 'fa-edit'} text-sm`}></i>
          </button>
          {!appointment.__isVirtual && (
            <div className="relative">
              <button type="button" className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg" onClick={() => setShowMenu(!showMenu)} title="Mais opções">
                <i className="fas fa-ellipsis-v text-sm"></i>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                    {appointment.status !== "Cancelado" && appointment.status !== "desistiu" && appointment.status !== "descartado" && (
                      <button type="button" className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2" onClick={() => { onCancel?.(appointment); setShowMenu(false); }}>
                        <i className="fas fa-ban text-amber-600"></i> Cancelar (manter registro)
                      </button>
                    )}
                    <div className="border-t border-gray-100 my-1"></div>
                    <button type="button" className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${hasReminder ? 'bg-yellow-50 text-yellow-900 hover:bg-yellow-100' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => { onReminder?.(appointment); setShowMenu(false); }}>
                      <i className={`fas fa-sticky-note ${hasReminder ? 'text-yellow-600' : 'text-gray-500'}`}></i>
                      {hasReminder ? 'Editar lembrete interno' : 'Adicionar lembrete interno'}
                    </button>
                    {!isLivre && appointment.status !== "Cancelado" && (
                      <button type="button" className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-800 flex items-center gap-2" onClick={() => { onGenerateCycle?.(appointment); setShowMenu(false); }}>
                        <i className="fas fa-repeat text-indigo-600"></i> Gerar sessões do ciclo
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
