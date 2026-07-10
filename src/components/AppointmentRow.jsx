import { useState } from "react";
import { SPECIALTIES } from "../config/specialties";
import { resolveSpecialtyKey } from "../utils/specialty";
import { resolveServiceType, getServiceTypeLabel, getServiceTypeColorClass } from "../utils/serviceType";
import {
  sendViaExtension,
  generateConfirmationMessage,
  generateReminderMessage,
  generateProfessionalNewAppointmentMessage,
  generateProfessionalReminderMessage
} from "../services/whatsappExtension";

export default function AppointmentRow({ appointment, onEdit, onReminder, onGenerateCycle, onCancel, onPostAppointment }) {
  
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
      case "completed":
      case "Concluído":
      case "concluido":
        return "bg-gray-600 text-white border border-gray-700";
      case "canceled":
      case "Cancelado":
        return "bg-gray-400 text-white border border-gray-500";
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



  const patientName = appointment.patientName || appointment.patient?.name || appointment.patient?.fullName || (typeof appointment.patient === 'string' ? appointment.patient : '') || "";
  
  
  // Pegar telefone do PACIENTE primeiro (não do appointment direto)
  // appointment.phone pode vir com número da clínica em integrações
  const patientPhone = appointment.patient?.phone ||
                       appointment.phone ||
                       appointment.patientPhone ||
                       "";
  
  const professionalPhone = appointment.doctor?.phoneNumber ||
                            appointment.professional?.phoneNumber ||
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
    const colorBase = s.textColor.replace("text-", "").replace(/-\d+$/, "");
    const hoverBg = s.lightBg.replace(/-\d+$/, '-200').replace("bg-", "hover:bg-");
    return {
      bg: s.lightBg,
      hover: hoverBg,
      border: `border-l-${colorBase}-600`,
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
  const isCompleted = appointment.operationalStatus === 'completed';
  const isConfirmed = appointment.operationalStatus === 'confirmed';
  // Pós-atendimento / avaliação Google pode ser enviado para confirmados ou concluídos
  const canSendPostAppointment = (isConfirmed || isCompleted) && !appointment.__isVirtual;
  const preStatus = appointment.metadata?.preAgendamentoStatus || appointment.status;
  const source = appointment.source || appointment.metadata?.origin?.source;

  const getSourceIcon = (src) => {
    switch (src) {
      case 'whatsapp':
      case 'bot':
      case 'amandaAI': return <i className="fas fa-robot text-indigo-500" title="AmandaAI / WhatsApp"></i>;
      case 'site': return <i className="fas fa-globe text-blue-500" title="Site"></i>;
      case 'telefone': return <i className="fas fa-phone text-green-500" title="Telefone"></i>;
      default: return <i className="fas fa-desktop text-gray-400" title="Agenda Externa"></i>;
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

  // Handler para enviar mensagem ao PROFISSIONAL
  const handleWhatsAppSendProfessional = async (type) => {
    if (!professionalPhone) {
      showToast('Profissional sem telefone cadastrado', 'error');
      return;
    }

    const internalType = type === 'notify' ? 'notify_prof' : 'reminder_prof';
    setSendingWhatsApp(internalType);

    const message = type === 'notify'
      ? generateProfessionalNewAppointmentMessage({
          ...appointment,
          patientName: patientName,
          professional: appointment.doctor?.fullName || appointment.professional
        })
      : generateProfessionalReminderMessage({
          ...appointment,
          patientName: patientName,
          professional: appointment.doctor?.fullName || appointment.professional
        });
    
    const result = await sendViaExtension(professionalPhone, message);
    
    setSendingWhatsApp(null);
    
    if (result.success) {
      showToast(`✅ ${type === 'notify' ? 'Notificação' : 'Lembrete'} enviado ao profissional!`, 'success');
      if (result.needsReconnect) {
        window.dispatchEvent(new CustomEvent('open-whatsapp-connect'));
        showToast('Mensagem enviada pela Meta API. Conecte o WhatsApp Web nativo para usar chip comum.', 'warning');
      }
    } else if (result.error?.includes('conectado') || result.error?.includes('QR') || result.error?.includes('desconectado') || result.needsReconnect) {
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

  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false);

  const canConfirmWhatsApp = patientPhone && (isPre || appointment.operationalStatus === 'scheduled');

  return (
    <div className={`flex items-stretch gap-3 px-4 py-3 rounded-xl border border-gray-200 border-l-[5px] transition-all shadow-sm ${rowAccent} ${isCancelled ? 'opacity-60 grayscale' : ''}`}>

      {/* Data/Hora + Profissional agrupados */}
      <div className="w-40 shrink-0 hidden sm:flex flex-col justify-center">
        <div className="text-gray-900 font-bold text-sm leading-tight tracking-tight flex items-center gap-1.5">
          <span>{appointment.time || "-"}</span>
          <span className="text-gray-300">|</span>
          <span className="text-xs text-gray-500 font-medium">
            {(() => {
              const [y, m, d] = (appointment.date || "").split("-");
              if (!y || !m || !d) return "";
              const date = new Date(Number(y), Number(m) - 1, Number(d));
              return `${date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}, ${d}/${m}`;
            })()}
          </span>
        </div>
        <div className="text-gray-600 text-xs truncate mt-1">
          {appointment.doctor?.fullName || appointment.professional?.fullName || appointment.professional?.name || (typeof appointment.professional === 'string' ? appointment.professional : null) || "-"}
        </div>
      </div>

      {/* Paciente */}
      <div className="flex-[1.2] min-w-0 flex items-center">
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 mt-0.5 w-5 text-center text-gray-400">{getSourceIcon(source)}</span>
          <div className="min-w-0">
            <div className={`font-semibold flex items-center gap-1.5 flex-wrap text-base leading-tight ${isCancelled ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              <span className="truncate">{patientName || "-"}</span>

              {isPre && getPreStatusBadge(preStatus)}
              {isPre && appointment.attemptCount > 0 && (
                <span className="text-[10px] text-gray-500 shrink-0"><i className="fas fa-phone-alt"></i> {appointment.attemptCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <span className="truncate">resp. {appointment.responsible || "-"}</span>
              {patientPhone && (
                <span className="text-gray-300 shrink-0">|</span>
              )}
              {patientPhone && (
                <a
                  href={`tel:${patientPhone}`}
                  className="text-blue-500 hover:text-blue-700 hover:underline truncate shrink-0"
                  onClick={e => e.stopPropagation()}
                >
                  {patientPhone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Área + Tipo agrupados */}
      <div className="w-36 shrink-0 flex flex-col justify-center">
        <div className={`font-semibold text-base ${tone.text || 'text-gray-900'}`}>{SPECIALTIES[specialtyKey]?.name || appointment.specialty || "-"}</div>
        {(() => {
          const st = resolveServiceType(appointment);
          if (!st) return null;
          const label = getServiceTypeLabel(st);
          const colorClass = getServiceTypeColorClass(st);
          return label ? <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${colorClass}`}>{label}</span> : null;
        })()}
      </div>

      {/* Anotações */}
      <div className="w-32 shrink-0 hidden xl:flex items-center">
        <div className="text-sm text-gray-600 truncate" title={appointment.observations || ""}>{appointment.observations || "-"}</div>
      </div>

      {/* Status */}
      <div className="w-28 shrink-0 text-center hidden md:flex items-center justify-center">
        <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full whitespace-nowrap ${getStatusColor(appointment.operationalStatus)}`}>
          {isPre ? 'Pré-agendado' : (appointment.status || appointment.operationalStatus || "-")}
        </span>
      </div>

      {/* Ações contextuais */}
      <div className="w-52 shrink-0 flex items-center justify-end">
        <div className="flex items-center gap-1">
          {/* Confirmado/Concluído: Avaliação Google / pós-atendimento em destaque */}
          {canSendPostAppointment && (() => {
            const m1 = !!appointment.postAppointmentSentAt;
            const m2 = !!appointment.reviewRequestSentAt;
            const bothSent = m1 && m2;
            const anySent = m1 || m2;
            const label = bothSent ? "Pós-atend. ✓" : m1 ? "Cuidado ✓" : m2 ? "Avaliação ✓" : "Pós-atend.";
            const tooltipLines = [
              m1 ? `Msg 1 enviada em ${new Date(appointment.postAppointmentSentAt).toLocaleString("pt-BR")}` : "Msg 1: não enviada",
              m2 ? `Msg 2 enviada em ${new Date(appointment.reviewRequestSentAt).toLocaleString("pt-BR")}` : "Msg 2: não enviada",
            ].join("\n");
            return (
              <button
                type="button"
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm ${
                  bothSent
                    ? "text-white bg-emerald-600 hover:bg-emerald-700"
                    : anySent
                      ? "text-white bg-teal-500 hover:bg-teal-600"
                      : patientPhone
                        ? "text-white bg-amber-500 hover:bg-amber-600"
                        : "text-amber-700 bg-amber-100 cursor-not-allowed opacity-70"
                }`}
                onClick={() => {
                  if (!patientPhone) { showToast('Paciente sem telefone cadastrado', 'error'); return; }
                  onPostAppointment?.(appointment);
                }}
                title={anySent ? tooltipLines : patientPhone ? "Enviar pós-atendimento" : "Paciente sem telefone cadastrado"}
              >
                <i className={`fas ${anySent ? "fa-check" : "fa-star"}`}></i>
                {label}
              </button>
            );
          })()}

          {/* WhatsApp: todas as mensagens (paciente + profissional) */}
          {(patientPhone || professionalPhone) && (
            <div className="relative">
              <button
                type="button"
                className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors"
                onClick={() => setShowWhatsAppMenu(!showWhatsAppMenu)}
                title="WhatsApp"
              >
                <i className="fab fa-whatsapp text-base"></i>
              </button>
              {showWhatsAppMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowWhatsAppMenu(false)}></div>
                  <div className="absolute right-0 top-full mt-1 w-60 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                    {/* PACIENTE */}
                    {(patientPhone) && (
                      <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Paciente
                      </div>
                    )}
                    {patientPhone && (
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 disabled:opacity-50"
                        onClick={() => { handleWhatsAppSend('confirm'); setShowWhatsAppMenu(false); }}
                        disabled={sendingWhatsApp === 'confirm'}
                      >
                        {sendingWhatsApp === 'confirm' ? <i className="fas fa-spinner fa-spin text-emerald-600"></i> : <i className="fab fa-whatsapp text-emerald-600"></i>} Confirmar agendamento
                      </button>
                    )}
                    {patientPhone && (
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 disabled:opacity-50"
                        onClick={() => { handleWhatsAppSend('reminder'); setShowWhatsAppMenu(false); }}
                        disabled={sendingWhatsApp === 'reminder'}
                      >
                        {sendingWhatsApp === 'reminder' ? <i className="fas fa-spinner fa-spin text-amber-600"></i> : <i className="fas fa-bell text-amber-600"></i>} Lembrete de atendimento
                      </button>
                    )}

                    {/* DIVISOR + PROFISSIONAL */}
                    {patientPhone && professionalPhone && (
                      <div className="border-t border-gray-100 my-1"></div>
                    )}
                    {professionalPhone && (
                      <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Profissional
                      </div>
                    )}
                    {professionalPhone && (
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-800 flex items-center gap-2 disabled:opacity-50"
                        onClick={() => { handleWhatsAppSendProfessional('notify'); setShowWhatsAppMenu(false); }}
                        disabled={sendingWhatsApp === 'notify_prof'}
                      >
                        {sendingWhatsApp === 'notify_prof' ? <i className="fas fa-spinner fa-spin text-blue-600"></i> : <i className="fas fa-user-md text-blue-600"></i>} Avisar agendamento
                      </button>
                    )}
                    {professionalPhone && (
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-800 flex items-center gap-2 disabled:opacity-50"
                        onClick={() => { handleWhatsAppSendProfessional('reminder'); setShowWhatsAppMenu(false); }}
                        disabled={sendingWhatsApp === 'reminder_prof'}
                      >
                        {sendingWhatsApp === 'reminder_prof' ? <i className="fas fa-spinner fa-spin text-blue-600"></i> : <i className="far fa-clock text-blue-600"></i>} Lembrar atendimento
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Cancelado: Reagendar em destaque */}
          {isCancelled && !appointment.__isVirtual && (
            <button
              type="button"
              className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-colors"
              onClick={() => onEdit(appointment)}
              title="Reagendar"
            >
              <i className="fas fa-calendar-plus text-sm"></i>
            </button>
          )}

          {/* Editar */}
          <button
            type="button"
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
            onClick={() => onEdit(appointment)}
            title={appointment.__isVirtual ? "Agendar" : "Editar"}
          >
            <i className={`fas ${appointment.__isVirtual ? 'fa-calendar-plus' : 'fa-edit'} text-sm`}></i>
          </button>

          {/* Menu de ações avançadas */}
          {!appointment.__isVirtual && (
            <div className="relative">
              <button type="button" className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => setShowMenu(!showMenu)} title="Mais opções">
                <i className="fas fa-ellipsis-v text-sm"></i>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                    <button type="button" className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-gray-700 hover:bg-gray-50" onClick={() => { onReminder?.(appointment); setShowMenu(false); }}>
                      <i className="fas fa-sticky-note text-gray-500"></i>
                      Adicionar lembrete
                    </button>
                    {!isLivre && !isCancelled && (
                      <button type="button" className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-800 flex items-center gap-2" onClick={() => { onGenerateCycle?.(appointment); setShowMenu(false); }}>
                        <i className="fas fa-repeat text-indigo-600"></i> Gerar sessões do ciclo
                      </button>
                    )}
                    {isCompleted && (
                      <button type="button" className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2" onClick={() => { onCancel?.(appointment); setShowMenu(false); }}>
                        <i className="fas fa-undo text-amber-600"></i> Reverter conclusão
                      </button>
                    )}
                    {canSendPostAppointment && (
                      <button type="button" className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-800 flex items-center gap-2" onClick={() => { onPostAppointment?.(appointment); setShowMenu(false); }}>
                        <i className="fas fa-star text-yellow-600"></i> Enviar avaliação
                      </button>
                    )}
                    {!isCompleted && !isCancelled && (
                      <button type="button" className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-2" onClick={() => { onCancel?.(appointment); setShowMenu(false); }}>
                        <i className="fas fa-ban text-rose-600"></i> Cancelar
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
