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
        return "bg-emerald-200 text-emerald-900 border border-emerald-300";
      case "scheduled":
      case "pending":
      case "Pendente":
      case "Agendado":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "canceled":
      case "Cancelado":
        return "bg-red-100 text-red-800 border border-red-200";
      case "missed":
        return "bg-rose-100 text-rose-800 border border-rose-200";
      case "pre_agendado":
      case "Pré-Agendado":
        return "bg-pink-100 text-pink-800 border border-pink-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
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
  const rowAccent =
    appointment.status === "Cancelado" || appointment.status === "desistiu" || appointment.status === "descartado"
      ? "border-l-[6px] border-l-red-500 bg-red-50 hover:bg-red-100"
      : isLivre
        ? "border-l-[6px] border-l-emerald-500 bg-emerald-50 hover:bg-emerald-100"
        : isPre
          ? "border-l-[6px] border-l-indigo-500 bg-indigo-50 hover:bg-indigo-100"
          : `border-l-[6px] ${tone.border} ${tone.bg} ${tone.hover}`;

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
    <tr className={`border-b border-gray-200 transition-colors ${rowAccent}`}>
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900 flex items-center gap-2 break-words">
          <div className="flex items-center gap-1">
            {source && getSourceIcon(source)}
            <span>{patientName || "-"}</span>
          </div>

          {hasReminder && (
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-900">
              lembrete
            </span>
          )}

          {isPre && getPreStatusBadge(preStatus)}
          {isPre && appointment.attemptCount > 0 && (
            <span className="text-[10px] text-gray-500 flex items-center gap-1" title="Tentativas de contato">
              <i className="fas fa-phone-alt"></i> {appointment.attemptCount}
            </span>
          )}
        </div>

        {appointment.responsible && (
          <div className="text-xs text-gray-600 mt-1">{appointment.responsible}</div>
        )}
      </td>

      <td className="px-4 py-3">
        <div className="text-gray-900 font-bold text-base leading-tight">{appointment.time || "-"}</div>
        <div className="text-[11px] text-gray-400 mt-0.5 whitespace-nowrap">
          {(() => {
            const [y, m, d] = (appointment.date || "").split("-");
            if (!y || !m || !d) return "-";
            const date = new Date(Number(y), Number(m) - 1, Number(d));
            const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
            return `${weekday}, ${d}/${m}`;
          })()}
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="text-gray-900 font-medium break-words">
          {appointment.doctor?.fullName || appointment.professional?.fullName || appointment.professional?.name || (typeof appointment.professional === 'string' ? appointment.professional : null) || "-"}
        </div>
      </td>

      <td className="px-4 py-3">
        <div className={`font-semibold whitespace-nowrap text-sm ${tone.text || 'text-gray-900'}`}>{SPECIALTIES[specialtyKey]?.name || appointment.specialty || "-"}</div>
        {(() => {
          const st = resolveServiceType(appointment);
          if (!st) return null;
          const label = getServiceTypeLabel(st);
          const colorClass = getServiceTypeColorClass(st);
          return label ? (
            <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
              {label}
            </span>
          ) : null;
        })()}
      </td>

      <td className="px-4 py-3">
        <div className="text-sm text-gray-700 truncate" title={appointment.observations || ""}>
          {appointment.observations || "-"}
        </div>
      </td>

      <td className="px-4 py-3">
        <span className={`px-3 py-1 inline-flex text-xs font-extrabold rounded-full ${getStatusColor(appointment.operationalStatus)}`}>
          {isPre ? 'Pré-agendado' : (appointment.status || appointment.operationalStatus || "-")}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex gap-1 items-center flex-wrap justify-center">
          
          {/* 🟢 WhatsApp Confirmar */}
          {patientPhone && (isPre || appointment.operationalStatus === 'scheduled') && (
            <button
              type="button"
              className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg"
              onClick={() => handleWhatsAppSend('confirm')}
              title="Confirmar agendamento (WhatsApp)"
            >
              <i className="fab fa-whatsapp text-lg"></i>
            </button>
          )}
          
          {/* 🔔 WhatsApp Lembrete */}
          {patientPhone && (
            <button
              type="button"
              className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg disabled:opacity-50"
              onClick={() => handleWhatsAppSend('reminder')}
              disabled={sendingWhatsApp === 'reminder'}
              title="Lembrar consulta (WhatsApp)"
            >
              {sendingWhatsApp === 'reminder' ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-bell"></i>
              )}
            </button>
          )}
          
          {/* ✏️ Editar - Sempre */}
          <button
            type="button"
            className="p-2 text-gray-700 hover:text-gray-900 hover:bg-white/60 rounded-lg"
            onClick={() => onEdit(appointment)}
            title={appointment.__isVirtual ? "Agendar" : "Editar"}
          >
            <i className={`fas ${appointment.__isVirtual ? 'fa-calendar-plus text-emerald-600' : 'fa-edit'}`}></i>
          </button>

          {/* ⋮ Menu Mais */}
          {!appointment.__isVirtual && (
            <div className="relative">
              <button
                type="button"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                onClick={() => setShowMenu(!showMenu)}
                title="Mais opções"
              >
                <i className="fas fa-ellipsis-v"></i>
              </button>
              
              {showMenu && (
                <>
                  {/* Overlay para fechar ao clicar fora */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowMenu(false)}
                  ></div>
                  
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                    
                    {/* Cancelar */}
                    {appointment.status !== "Cancelado" && appointment.status !== "desistiu" && appointment.status !== "descartado" && (
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2"
                        onClick={() => {
                          onCancel?.(appointment);
                          setShowMenu(false);
                        }}
                      >
                        <i className="fas fa-ban text-amber-600"></i>
                        Cancelar (manter registro)
                      </button>
                    )}
                    
                    {/* Excluir - INATIVADO para evitar corrupção de pacotes e fraude de caixa */}
                    {/* <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-800 flex items-center gap-2"
                      onClick={() => {
                        onDelete(appointment.id);
                        setShowMenu(false);
                      }}
                    >
                      <i className="fas fa-trash text-red-600"></i>
                      Excluir permanentemente
                    </button> */}
                    
                    {/* Separador */}
                    <div className="border-t border-gray-100 my-1"></div>
                    
                    {/* Lembrete Interno */}
                    <button
                      type="button"
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                        hasReminder 
                          ? 'bg-yellow-50 text-yellow-900 hover:bg-yellow-100' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        onReminder?.(appointment);
                        setShowMenu(false);
                      }}
                    >
                      <i className={`fas fa-sticky-note ${hasReminder ? 'text-yellow-600' : 'text-gray-500'}`}></i>
                      {hasReminder ? 'Editar lembrete interno' : 'Adicionar lembrete interno'}
                    </button>
                    
                    {/* Gerar Ciclo */}
                    {!isLivre && appointment.status !== "Cancelado" && (
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-800 flex items-center gap-2"
                        onClick={() => {
                          onGenerateCycle?.(appointment);
                          setShowMenu(false);
                        }}
                      >
                        <i className="fas fa-repeat text-indigo-600"></i>
                        Gerar sessões do ciclo
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </td>
    </tr>
  );
}
