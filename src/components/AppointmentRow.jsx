import { useState } from "react";
import { SPECIALTIES } from "../config/specialties";
import { formatDateDisplay } from "../utils/date";
import { resolveSpecialtyKey } from "../utils/specialty";
import { sendViaExtension, generateConfirmationMessage, generateReminderMessage } from "../services/whatsappExtension";

export default function AppointmentRow({ appointment, onEdit, onDelete, onReminder, onGenerateCycle, onCancel }) {
  
  const [showMenu, setShowMenu] = useState(false);

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

  const patientName = appointment.patientName || appointment.patient?.fullName || appointment.patient || "";
  
  // 🔍 DEBUG COMPLETO DO AGENDAMENTO
  console.log('[AppointmentRow] ============================================');
  console.log('[AppointmentRow] AGENDAMENTO COMPLETO:', appointment);
  console.log('[AppointmentRow] ---------------------------------------------');
  console.log('[AppointmentRow] ID:', appointment._id || appointment.id);
  console.log('[AppointmentRow] Nome Paciente:', patientName);
  console.log('[AppointmentRow] ---------------------------------------------');
  console.log('[AppointmentRow] CANDIDATOS DE TELEFONE:');
  console.log('  1. appointment.phone:', appointment.phone);
  console.log('  2. appointment.patient?.phone:', appointment.patient?.phone);
  console.log('  3. appointment.patient?.phoneNumber:', appointment.patient?.phoneNumber);
  console.log('  4. appointment.patientPhone:', appointment.patientPhone);
  console.log('  5. appointment.contactPhone:', appointment.contactPhone);
  console.log('  6. appointment.whatsapp:', appointment.whatsapp);
  console.log('[AppointmentRow] ---------------------------------------------');
  console.log('[AppointmentRow] OBJETO PATIENT COMPLETO:', appointment.patient);
  console.log('[AppointmentRow] ============================================');
  
  // Pegar telefone do PACIENTE primeiro (não do appointment direto)
  // appointment.phone pode vir com número da clínica em integrações
  const patientPhone = appointment.patient?.phone ||
                       appointment.phone ||
                       "";
  
  const isLivre =
    (appointment.professional && String(appointment.professional).toLowerCase().includes("livre")) ||
    (patientName.toLowerCase().includes("livre")) ||
    (appointment.observations && String(appointment.observations).toLowerCase().includes("livre"));

  const rowToneBySpecialty = (key) => {
    switch (key) {
      case "fonoaudiologia":
        return { bg: "bg-teal-500", hover: "hover:bg-teal-600", border: "border-l-teal-700" };
      case "psicologia":
        return { bg: "bg-violet-500", hover: "hover:bg-violet-600", border: "border-l-violet-700" };
      case "psicomotricidade":
        return { bg: "bg-lime-500", hover: "hover:bg-lime-600", border: "border-l-lime-700" };
      case "psicopedagogia":
        return { bg: "bg-cyan-500", hover: "hover:bg-cyan-600", border: "border-l-cyan-700" };
      case "terapia_ocupacional":
        return { bg: "bg-amber-500", hover: "hover:bg-amber-600", border: "border-l-amber-700" };
      case "fisioterapia":
        return { bg: "bg-sky-500", hover: "hover:bg-sky-600", border: "border-l-sky-700" };
      case "tongue_tie_test":
        return { bg: "bg-fuchsia-500", hover: "hover:bg-fuchsia-600", border: "border-l-fuchsia-700" };
      case "neuropsych_evaluation":
        return { bg: "bg-rose-500", hover: "hover:bg-rose-600", border: "border-l-rose-700" };
      case "pediatria":
        return { bg: "bg-indigo-500", hover: "hover:bg-indigo-600", border: "border-l-indigo-700" };
      case "neuroped":
        return { bg: "bg-red-500", hover: "hover:bg-red-600", border: "border-l-red-700" };
      case "musicoterapia":
        return { bg: "bg-orange-500", hover: "hover:bg-orange-600", border: "border-l-orange-700" };
      default:
        return { bg: "bg-gray-400", hover: "hover:bg-gray-500", border: "border-l-gray-700" };
    }
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
      ? "border-l-[8px] border-l-red-600 bg-red-300 hover:bg-red-200"
      : isLivre
        ? "border-l-[8px] border-l-emerald-600 bg-emerald-100 hover:bg-emerald-200"
        : isPre
          ? "border-l-[8px] border-l-indigo-600 bg-indigo-50 hover:bg-indigo-100/60"
          : `border-l-[8px] ${tone.border} ${tone.bg} ${tone.hover}`;

  // Handler para enviar mensagem WhatsApp
  const handleWhatsAppSend = async (type) => {
    console.log('[WhatsApp] ============================================');
    console.log('[WhatsApp] TIPO:', type);
    console.log('[WhatsApp] patientPhone USADO:', patientPhone);
    console.log('[WhatsApp] patientPhone (clean):', patientPhone.replace(/\D/g, ''));
    console.log('[WhatsApp] Nome:', patientName);
    console.log('[WhatsApp] ============================================');
    if (!patientPhone) {
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg';
      toast.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i> Paciente sem telefone cadastrado';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      return;
    }

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
    
    console.log('[WhatsApp] Resultado:', result);
    
    // O modal já abre automaticamente no service se não conectado
    // Só mostra toast de sucesso ou erro
    const toast = document.createElement('div');
    if (result.success) {
      toast.className = `fixed bottom-4 right-4 ${type === 'confirm' ? 'bg-emerald-500' : 'bg-amber-500'} text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg`;
      toast.innerHTML = `<i class="fab fa-whatsapp mr-2"></i> ✅ ${type === 'confirm' ? 'Confirmado' : 'Lembrete'} enviado!`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } else if (!result.error?.includes('conectado') && !result.error?.includes('QR')) {
      // Só mostra erro se NÃO for erro de conexão (o modal já abre nesse caso)
      toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg';
      toast.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i> ${result.error || 'Erro ao enviar'}`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 6000);
    }
  };

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
        <div className="text-gray-900 whitespace-nowrap">{formatDateDisplay(appointment.date)}</div>
        <div className="text-sm text-gray-700 mt-1 font-bold">{appointment.time || "-"}</div>
      </td>

      <td className="px-4 py-3">
        <div className="text-gray-900 font-medium break-words">
          {appointment.doctor?.fullName || appointment.professional || "-"}
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="text-gray-900 font-semibold break-words">{appointment.specialty || "-"}</div>
      </td>

      <td className="px-4 py-3">
        <span className={`px-3 py-1 inline-flex text-xs font-extrabold rounded-full ${getStatusColor(appointment.operationalStatus)}`}>
          {isPre ? 'Pré-agendado' : (appointment.status || appointment.operationalStatus || "-")}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="text-sm text-gray-700 truncate" title={appointment.observations || ""}>
          {appointment.observations || "-"}
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="flex gap-1 items-center flex-wrap justify-center">
          
          {/* 🟢 WhatsApp Confirmar */}
          {patientPhone && (isPre || appointment.operationalStatus === 'scheduled') && (
            <button
              type="button"
              className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg"
              onClick={() => handleWhatsAppSend('confirm')}
              title="Confirmar via WhatsApp"
            >
              <i className="fab fa-whatsapp text-lg"></i>
            </button>
          )}
          
          {/* 🔔 WhatsApp Lembrete */}
          {patientPhone && (
            <button
              type="button"
              className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg"
              onClick={() => handleWhatsAppSend('reminder')}
              title="Enviar lembrete via WhatsApp"
            >
              <i className="fas fa-bell"></i>
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
                          console.log("🖱️ [AppointmentRow] Botão CANCELAR clicado:", appointment.id);
                          onCancel?.(appointment);
                          setShowMenu(false);
                        }}
                      >
                        <i className="fas fa-ban text-amber-600"></i>
                        Cancelar (manter registro)
                      </button>
                    )}
                    
                    {/* Excluir */}
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-800 flex items-center gap-2"
                      onClick={() => {
                        onDelete(appointment.id);
                        setShowMenu(false);
                      }}
                    >
                      <i className="fas fa-trash text-red-600"></i>
                      Excluir permanentemente
                    </button>
                    
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
