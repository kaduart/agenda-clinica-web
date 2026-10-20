import { useState } from "react";
import { SPECIALTIES } from "../config/specialties";
import { resolveSpecialtyKey } from "../utils/specialty";
import { resolveServiceType, getServiceTypeLabel, getServiceTypeColorClass } from "../utils/serviceType";
import { ATTENDANCE_CONFIRMATION_UI, resolveAttendanceConfirmation } from "../utils/attendanceConfirmation";
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
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "scheduled":
      case "pending":
      case "Pendente":
      case "Agendado":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "completed":
      case "Concluído":
      case "concluido":
        return "bg-slate-100 text-slate-700 border border-slate-200";
      case "canceled":
      case "Cancelado":
        return "bg-gray-100 text-gray-600 border border-gray-200";
      case "missed":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      case "pre_agendado":
      case "Pré-Agendado":
        return "bg-violet-50 text-violet-700 border border-violet-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
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
      return { marker: "bg-gray-400", bg: "bg-white", text: "text-gray-700" };
    }
    return {
      marker: s.bgColor,
      bg: s.lightBg,
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
  const rowSurface = isCancelled
    ? "bg-gray-100 hover:ring-1 hover:ring-inset hover:ring-gray-300"
    : isLivre
      ? "bg-emerald-100 hover:ring-1 hover:ring-inset hover:ring-emerald-200"
      : isPre
        ? "bg-violet-100 hover:ring-1 hover:ring-inset hover:ring-violet-200"
        : `${tone.bg} hover:ring-1 hover:ring-inset hover:ring-black/5`;

  const rowMarker = isCancelled
    ? "bg-gray-400"
    : isPre
      ? "bg-violet-500"
      : tone.marker;

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
    
    const result = await sendViaExtension(patientPhone, message, {
      appointmentId: appointment.id || appointment._id,
      purpose: 'attendance_confirmation',
    });
    
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
  const hasOpenMenu = showMenu || showWhatsAppMenu;
  const attendanceConfirmation = resolveAttendanceConfirmation(appointment);
  const confirmationUi = attendanceConfirmation ? ATTENDANCE_CONFIRMATION_UI[attendanceConfirmation.status] : null;
  const confirmationTitle = confirmationUi
    ? `${confirmationUi.label}${attendanceConfirmation.respondedAt ? ` em ${new Date(attendanceConfirmation.respondedAt).toLocaleString('pt-BR')}` : ''}`
    : 'Confirmação ainda não enviada';

  return (
    <div className={`relative flex flex-wrap sm:flex-nowrap items-stretch gap-x-3 gap-y-2 px-4 py-2.5 transition-colors ${hasOpenMenu ? 'z-30' : 'z-0'} ${rowSurface}`}>

      <span className={`absolute left-0 top-3 bottom-3 w-px rounded-full ${rowMarker}`} aria-hidden="true"></span>

      {/* Data/Hora + Profissional agrupados */}
      <div className={`w-[4.75rem] sm:w-36 shrink-0 flex flex-col justify-center ${isCancelled ? 'text-gray-400' : ''}`}>
        <div className="text-gray-950 font-semibold text-base leading-tight tracking-tight tabular-nums flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
          <span>{appointment.time || "-"}</span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span className="text-xs text-gray-500 font-medium">
            {(() => {
              const [y, m, d] = (appointment.date || "").split("-");
              if (!y || !m || !d) return "";
              const date = new Date(Number(y), Number(m) - 1, Number(d));
              return `${date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}, ${d}/${m}`;
            })()}
          </span>
        </div>
        <div className="text-gray-500 text-[11px] sm:text-xs truncate mt-1" title={appointment.doctor?.fullName || appointment.professional?.fullName || appointment.professional?.name || ""}>
          {appointment.doctor?.fullName || appointment.professional?.fullName || appointment.professional?.name || (typeof appointment.professional === 'string' ? appointment.professional : null) || "-"}
        </div>
      </div>

      {/* Paciente */}
      <div className={`flex-[1.2] min-w-0 flex items-center ${isCancelled ? 'opacity-60' : ''}`}>
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 mt-0.5 w-5 text-center text-gray-400">{getSourceIcon(source)}</span>
          <div className="min-w-0">
            <div className={`font-semibold flex items-center gap-1.5 flex-wrap text-base leading-tight ${isCancelled ? 'text-gray-500' : 'text-gray-900'}`}>
              <span className={`truncate ${isCancelled ? 'line-through' : ''}`}>{patientName || "-"}</span>

              {confirmationUi ? (
                <span className={`md:hidden inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${confirmationUi.className}`} title={`Confirmação do paciente: ${confirmationTitle}`}>
                  <i className={`fas ${confirmationUi.icon}`} aria-hidden="true"></i>
                  {confirmationUi.label}
                </span>
              ) : (
                <span className="md:hidden shrink-0 text-[10px] font-medium text-gray-400" title="Confirmação não aplicável ou sem histórico">—</span>
              )}

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

      {/* Confirmação do paciente */}
      <div className="w-36 shrink-0 hidden md:flex items-center justify-center">
        {confirmationUi ? (
          <span className={`inline-flex max-w-full items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-semibold whitespace-nowrap ${confirmationUi.className}`} title={`Confirmação do paciente: ${confirmationTitle}`}>
            <i className={`fas ${confirmationUi.icon}`} aria-hidden="true"></i>
            {confirmationUi.label}
          </span>
        ) : (
          <span className="text-xs font-medium text-gray-400" title="Confirmação não aplicável ou sem histórico">—</span>
        )}
      </div>

      {/* Área + Tipo agrupados */}
      <div className={`w-32 shrink-0 hidden lg:flex flex-col justify-center min-w-0 ${isCancelled ? 'opacity-60' : ''}`}>
        <div className={`font-semibold text-base ${tone.text || 'text-gray-900'}`}>{SPECIALTIES[specialtyKey]?.name || appointment.specialty || "-"}</div>
        {(() => {
          const st = resolveServiceType(appointment);
          if (!st) return null;
          const label = getServiceTypeLabel(st);
          const colorClass = getServiceTypeColorClass(st);
          return label ? <span className={`mt-1 inline-flex w-fit max-w-full items-center px-2 py-0.5 rounded-md text-xs font-medium truncate ${colorClass}`} title={label}>{label}</span> : null;
        })()}
      </div>

      {/* Anotações */}
      <div className={`w-32 shrink-0 hidden xl:flex items-center ${isCancelled ? 'opacity-60' : ''}`}>
        <div className="text-sm text-gray-600 truncate" title={appointment.observations || ""}>{appointment.observations || "-"}</div>
      </div>

      {/* Status do atendimento */}
      <div className="w-28 shrink-0 text-center hidden md:flex items-center justify-center">
        <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(appointment.operationalStatus)}`}>
          {isPre ? 'Pré-agendado' : (appointment.status || appointment.operationalStatus || "-")}
        </span>
      </div>

      {/* Ações contextuais */}
      <div className="w-full sm:w-52 shrink-0 flex items-center justify-end border-t border-gray-100 pt-2 sm:border-0 sm:pt-0">
        <div className="flex items-center gap-1">
          {/* Confirmado/Concluído: Avaliação Google / pós-atendimento em destaque */}
          {canSendPostAppointment && (() => {
            const m1 = !!appointment.postAppointmentSentAt;
            const m2 = !!appointment.reviewRequestSentAt;
            const bothSent = m1 && m2;
            const anySent = m1 || m2;
            // Rótulo diz o PRÓXIMO passo: 1) perguntar como foi → 2) pedir avaliação no Google
            const label = bothSent ? "Avaliação enviada" : m1 ? "Pedir avaliação" : m2 ? "Avaliação enviada" : "Como foi?";
            const tooltipLines = [
              m1 ? `1) "Como foi?" enviada em ${new Date(appointment.postAppointmentSentAt).toLocaleString("pt-BR")}` : '1) "Como foi o atendimento?": não enviada',
              m2 ? `2) Pedido de avaliação no Google enviado em ${new Date(appointment.reviewRequestSentAt).toLocaleString("pt-BR")}` : "2) Pedido de avaliação no Google: não enviado",
            ].join("\n");
            return (
              <button
                type="button"
                className={`min-h-10 px-3 py-2 text-xs font-semibold whitespace-nowrap rounded-lg transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  bothSent
                    ? "text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 focus-visible:ring-emerald-400"
                    : anySent
                      ? "text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 focus-visible:ring-teal-400"
                      : patientPhone
                        ? "text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-100 focus-visible:ring-amber-400"
                        : "text-amber-700 bg-amber-100 cursor-not-allowed opacity-70"
                }`}
                onClick={() => {
                  if (!patientPhone) { showToast('Paciente sem telefone cadastrado', 'error'); return; }
                  onPostAppointment?.(appointment);
                }}
                title={anySent ? tooltipLines : patientPhone ? "Pós-atendimento: pergunte como foi e depois peça a avaliação no Google" : "Paciente sem telefone cadastrado"}
              >
                <i className={`fas ${bothSent || (m2 && !m1) ? "fa-check" : "fa-star"}`}></i>
                {label}
              </button>
            );
          })()}

          {/* WhatsApp: todas as mensagens (paciente + profissional) */}
          {(patientPhone || professionalPhone) && (
            <div className="relative z-30">
              <button
                type="button"
                className="w-10 h-10 inline-flex items-center justify-center text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowMenu(false);
                  setShowWhatsAppMenu((open) => !open);
                }}
                title="WhatsApp"
                aria-label="Abrir opções do WhatsApp"
              >
                <i className="fab fa-whatsapp text-base"></i>
              </button>
              {showWhatsAppMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowWhatsAppMenu(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_45px_-16px_rgba(15,23,42,0.35)] z-50 p-2" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 inline-flex items-center justify-center">
                          <i className="fab fa-whatsapp text-sm" aria-hidden="true"></i>
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 leading-tight">WhatsApp</div>
                          <div className="text-[11px] text-slate-500">Escolha quem deseja avisar</div>
                        </div>
                      </div>
                    </div>
                    {/* PACIENTE */}
                    {(patientPhone) && (
                      <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Paciente
                      </div>
                    )}
                    {patientPhone && (
                      <button
                        type="button"
                        className="w-full min-h-11 px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg flex items-center gap-3 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        onClick={() => { handleWhatsAppSend('confirm'); setShowWhatsAppMenu(false); }}
                        disabled={sendingWhatsApp === 'confirm'}
                      >
                        <span className="w-7 h-7 shrink-0 rounded-md bg-emerald-50 text-emerald-600 inline-flex items-center justify-center">
                          {sendingWhatsApp === 'confirm' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fab fa-whatsapp"></i>}
                        </span>
                        <span className="font-medium">Enviar confirmação</span>
                      </button>
                    )}
                    {patientPhone && (
                      <button
                        type="button"
                        className="w-full min-h-11 px-3 py-2 text-left text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-800 rounded-lg flex items-center gap-3 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        onClick={() => { handleWhatsAppSend('reminder'); setShowWhatsAppMenu(false); }}
                        disabled={sendingWhatsApp === 'reminder'}
                      >
                        <span className="w-7 h-7 shrink-0 rounded-md bg-amber-50 text-amber-600 inline-flex items-center justify-center">
                          {sendingWhatsApp === 'reminder' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-bell"></i>}
                        </span>
                        <span>
                          <span className="block font-medium">Enviar lembrete</span>
                          <span className="block text-[11px] text-slate-500">Um dia antes do atendimento</span>
                        </span>
                      </button>
                    )}

                    {/* DIVISOR + PROFISSIONAL */}
                    {patientPhone && professionalPhone && (
                      <div className="border-t border-slate-100 my-1"></div>
                    )}
                    {professionalPhone && (
                      <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Profissional
                      </div>
                    )}
                    {professionalPhone && (
                      <button
                        type="button"
                        className="w-full min-h-11 px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-lg flex items-center gap-3 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        onClick={() => { handleWhatsAppSendProfessional('notify'); setShowWhatsAppMenu(false); }}
                        disabled={sendingWhatsApp === 'notify_prof'}
                      >
                        <span className="w-7 h-7 shrink-0 rounded-md bg-blue-50 text-blue-600 inline-flex items-center justify-center">
                          {sendingWhatsApp === 'notify_prof' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-user-md"></i>}
                        </span>
                        <span className="font-medium">Avisar novo agendamento</span>
                      </button>
                    )}
                    {professionalPhone && (
                      <button
                        type="button"
                        className="w-full min-h-11 px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-lg flex items-center gap-3 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        onClick={() => { handleWhatsAppSendProfessional('reminder'); setShowWhatsAppMenu(false); }}
                        disabled={sendingWhatsApp === 'reminder_prof'}
                      >
                        <span className="w-7 h-7 shrink-0 rounded-md bg-blue-50 text-blue-600 inline-flex items-center justify-center">
                          {sendingWhatsApp === 'reminder_prof' ? <i className="fas fa-spinner fa-spin"></i> : <i className="far fa-clock"></i>}
                        </span>
                        <span className="font-medium">Lembrar do atendimento</span>
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
              className="w-10 h-10 inline-flex items-center justify-center text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              onClick={() => onEdit(appointment)}
              title="Reagendar"
              aria-label="Reagendar atendimento"
            >
              <i className="fas fa-calendar-plus text-sm"></i>
            </button>
          )}

          {/* Cancelar (atalho): abre o modal simples "quem solicitou + motivo" */}
          {!isLivre && !isCancelled && !isCompleted && !appointment.__isVirtual && onCancel && (
            <button
              type="button"
              className="w-10 h-10 inline-flex items-center justify-center text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              onClick={() => onCancel(appointment)}
              title="Cancelar agendamento"
              aria-label="Cancelar agendamento"
            >
              <i className="fas fa-ban text-sm" aria-hidden="true"></i>
            </button>
          )}

          {/* Editar */}
          <button
            type="button"
            className="w-10 h-10 inline-flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            onClick={() => onEdit(appointment)}
            title={appointment.__isVirtual ? "Agendar" : "Editar"}
            aria-label={appointment.__isVirtual ? "Agendar horário" : "Editar agendamento"}
          >
            <i className={`fas ${appointment.__isVirtual ? 'fa-calendar-plus' : 'fa-edit'} text-sm`}></i>
          </button>

          {/* Menu de ações avançadas */}
          {!appointment.__isVirtual && (
            <div className="relative z-30">
              <button type="button" className="w-10 h-10 inline-flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400" onClick={(event) => { event.stopPropagation(); setShowWhatsAppMenu(false); setShowMenu((open) => !open); }} title="Mais opções" aria-label="Abrir mais opções">
                <i className="fas fa-ellipsis-v text-sm"></i>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)}></div>
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
