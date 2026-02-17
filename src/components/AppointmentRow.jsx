import { SPECIALTIES } from "../config/specialties";
import { formatDateDisplay } from "../utils/date";
import { resolveSpecialtyKey } from "../utils/specialty";
import ExportButton from "./ExportButton";

export default function AppointmentRow({ appointment, onEdit, onDelete, onReminder, onGenerateCycle, onConfirm, onCancel }) {

  // ...

  const getStatusColor = (status) => {
    // Suporte tanto para o friendly status quanto para o technical status
    switch (status) {
      case "confirmed":
      case "paid":
      case "scheduled": // Agendado/Confirmado a pedido do usuário
      case "Confirmado":
        return "bg-emerald-200 text-emerald-900";
      case "pending":
      case "Pendente":
        return "bg-amber-200 text-amber-900";
      case "canceled":
      case "Cancelado":
        return "bg-red-400 text-red-900";
      case "missed":
        return "bg-red-100 text-red-800 border border-red-200";
      case "pre-scheduled":
        return "bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse";
      default:
        return "bg-gray-200 text-gray-900";
    }
  };

  const specialtyKey = resolveSpecialtyKey(appointment);
  const specialtyConfig = SPECIALTIES[specialtyKey];

  const hasReminder = !!(appointment.reminderText && !appointment.reminderDone);

  const patientName = appointment.patientName || appointment.patient?.fullName || appointment.patient || "";
  const isLivre =
    (appointment.professional && String(appointment.professional).toLowerCase().includes("livre")) ||
    (patientName.toLowerCase().includes("livre")) ||
    (appointment.observations && String(appointment.observations).toLowerCase().includes("livre"));

  const rowToneBySpecialty = (key) => {
    switch (key) {
      case "fonoaudiologia":
        return { bg: "bg-sky-300", hover: "hover:bg-sky-400", border: "border-l-sky-700" };
      case "psicologia":
        return { bg: "bg-violet-300", hover: "hover:bg-violet-400", border: "border-l-violet-700" };
      case "terapia_ocupacional":
        return { bg: "bg-amber-300", hover: "hover:bg-amber-400", border: "border-l-amber-700" };
      case "fisioterapia":
        return { bg: "bg-teal-300", hover: "hover:bg-teal-400", border: "border-l-teal-700" };
      default:
        return { bg: "bg-gray-50", hover: "hover:bg-gray-100", border: "border-l-gray-300" };
    }
  };

  const isPre = !!appointment.__isPreAgendamento;
  const preStatus = appointment.status; // novo, em_analise, contatado, etc.
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

  // Cores da borda lateral com base no status ou especialidade
  const tone = rowToneBySpecialty(specialtyKey);
  const rowAccent =
    appointment.status === "Cancelado" || appointment.status === "desistiu" || appointment.status === "descartado"
      ? "border-l-[8px] border-l-red-600 bg-red-300 hover:bg-red-200"
      : isLivre
        ? "border-l-[8px] border-l-emerald-600 bg-emerald-100 hover:bg-emerald-200"
        : isPre
          ? "border-l-[8px] border-l-indigo-600 bg-indigo-50 hover:bg-indigo-100/60"
          : `border-l-[8px] ${tone.border} ${tone.bg} ${tone.hover}`;

  return (
    <tr className={`border-b border-gray-200 transition-colors ${rowAccent}`}>
      <td className="px- py-2">
        <div className="font-medium text-gray-900 flex items-center gap-2">
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

      <td className="px- py-2">
        <div className="text-gray-900">{formatDateDisplay(appointment.date)}</div>
        <div className="text-sm text-gray-700 mt-1 font-bold">{appointment.time || "-"}</div>
      </td>

      <td className="px- py-2">
        <div className="text-gray-900 font-medium">
          {appointment.doctor?.fullName || appointment.professional || "-"}
        </div>
      </td>

      <td className="px- py-2">
        <div className="text-gray-900 font-semibold">{appointment.specialty || "-"}</div>
      </td>

      <td className="px- py-2">
        <span className={`px-3 py-1 inline-flex text-xs font-extrabold rounded-full ${getStatusColor(appointment.operationalStatus || appointment.status)}`}>
          {appointment.status || appointment.operationalStatus || "-"}
        </span>
      </td>

      <td className="px- py-2">
        <div className="text-sm text-gray-700 max-w-xs truncate" title={appointment.observations || ""}>
          {appointment.observations || "-"}
        </div>
      </td>

      <td className="px- py-2">
        <div className="flex gap-2 items-center">
          {/* Botão de Confirmar para Pré-Agendados */}
          {appointment.operationalStatus === 'pre-scheduled' && (
            <button
              type="button"
              className="p-2 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 rounded-lg animate-pulse"
              onClick={() => onConfirm?.(appointment)}
              title="Confirmar Agendamento"
            >
              <i className="fas fa-check-double"></i>
            </button>
          )}

          <button
            type="button"
            className="p-2 text-gray-700 hover:text-gray-900 hover:bg-white/60 rounded-lg"
            onClick={() => onEdit(appointment)}
            title={appointment.__isVirtual ? "Agendar" : appointment.__isPreAgendamento ? "Confirmar Agendamento" : "Editar"}
          >
            <i className={`fas ${appointment.__isVirtual
              ? 'fa-calendar-plus text-emerald-600'
              : appointment.__isPreAgendamento
                ? 'fa-check-circle text-indigo-600'
                : 'fa-edit'
              }`}></i>
          </button>

          {!appointment.__isVirtual && appointment.status !== "Cancelado" && appointment.status !== "desistiu" && appointment.status !== "descartado" && (
            <>
              {/* Botão de Cancelar (Soft Delete) - AGORA EM TODAS AS HIPÓTESES */}
              <button
                type="button"
                className="p-2 text-gray-700 hover:text-amber-800 hover:bg-amber-200/60 rounded-lg"
                onClick={() => onCancel?.(appointment)}
                title="Cancelar (Manter registro)"
              >
                <i className="fas fa-ban"></i>
              </button>

              <button
                type="button"
                className="p-2 text-gray-700 hover:text-red-800 hover:bg-red-200/60 rounded-lg"
                onClick={() => onDelete(appointment.id)}
                title="Excluir Permanentemente"
              >
                <i className="fas fa-trash"></i>
              </button>

              <button
                type="button"
                className={`p-2 rounded-lg ${hasReminder
                  ? "bg-yellow-300 text-yellow-900 hover:bg-yellow-400"
                  : "text-gray-700 hover:text-gray-900 hover:bg-white/60"
                  }`}
                onClick={() => onReminder?.(appointment)}
                title={hasReminder ? "Editar lembrete" : "Adicionar lembrete"}
              >
                <i className="fas fa-bell"></i>
              </button>

              <ExportButton appointment={appointment} />

              {!isLivre && appointment.status !== "Cancelado" && (
                <button
                  type="button"
                  className="p-2 text-gray-700 hover:text-indigo-900 hover:bg-indigo-200/60 rounded-lg"
                  onClick={() => onGenerateCycle?.(appointment)}
                  title="Gerar sessões do ciclo"
                >
                  <i className="fas fa-repeat"></i>
                </button>
              )}
            </>
          )}


        </div>
      </td>
    </tr>
  );
}
