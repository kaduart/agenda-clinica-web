import { SPECIALTIES } from "../config/specialties";
import { formatDateDisplay } from "../utils/date";
import { resolveSpecialtyKey } from "../utils/specialty";
import ExportButton from "./ExportButton";

export default function AppointmentRow({ appointment, onEdit, onDelete, onReminder }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "Confirmado":
        return "bg-emerald-200 text-emerald-900";
      case "Pendente":
        return "bg-amber-200 text-amber-900";
      case "Cancelado":
        return "bg-red-400 text-red-900";
      default:
        return "bg-gray-200 text-gray-900";
    }
  };

  const specialtyKey = resolveSpecialtyKey(appointment);
  const specialtyConfig = SPECIALTIES[specialtyKey];

  const hasReminder = !!(appointment.reminderText && !appointment.reminderDone);

  const isLivre =
    (appointment.professional && String(appointment.professional).toLowerCase().includes("livre")) ||
    (appointment.patient && String(appointment.patient).toLowerCase().includes("livre")) ||
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

  const tone = rowToneBySpecialty(specialtyKey);

  const rowAccent =
    appointment.status === "Cancelado"
      ? "border-l-[8px] border-l-red-600 bg-red-300 hover:bg-red-200"
      : isLivre
        ? "border-l-[8px] border-l-emerald-600 bg-emerald-100 hover:bg-emerald-200"
        : `border-l-[8px] ${tone.border} ${tone.bg} ${tone.hover}`;

  return (
    <tr className={`border-b border-gray-200 transition-colors ${rowAccent}`}>
      <td className="px- py-2">
        <div className="font-medium text-gray-900 flex items-center gap-2">
          <span>{appointment.patient || "-"}</span>

          {hasReminder && (
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-900">
              lembrete
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
        <div className="text-gray-900">{appointment.professional || "-"}</div>
      </td>

      <td className="px- py-2">
        <div className="text-gray-900 font-semibold">{appointment.specialty || "-"}</div>
      </td>

      <td className="px- py-2">
        <span className={`px-3 py-1 inline-flex text-xs font-extrabold rounded-full ${getStatusColor(appointment.status)}`}>
          {appointment.status || "-"}
        </span>
      </td>

      <td className="px- py-2">
        <div className="text-sm text-gray-700 max-w-xs truncate" title={appointment.observations || ""}>
          {appointment.observations || "-"}
        </div>
      </td>

      <td className="px- py-2">
        <div className="flex gap-2 items-center">
          <button
            type="button"
            className="p-2 text-gray-700 hover:text-gray-900 hover:bg-white/60 rounded-lg"
            onClick={() => onEdit(appointment)}
            title="Editar"
          >
            <i className="fas fa-edit"></i>
          </button>

          <button
            type="button"
            className="p-2 text-gray-700 hover:text-red-800 hover:bg-red-200/60 rounded-lg"
            onClick={() => onDelete(appointment.id)}
            title="Excluir"
          >
            <i className="fas fa-trash"></i>
          </button>

          {/* ✅ Sininho (abre modal de lembrete no App) */}
          <button
            type="button"
            className={`p-2 rounded-lg ${
              hasReminder
                ? "bg-yellow-300 text-yellow-900 hover:bg-yellow-400"
                : "text-gray-700 hover:text-gray-900 hover:bg-white/60"
            }`}
            onClick={() => onReminder?.(appointment)}
            title={hasReminder ? "Editar lembrete" : "Adicionar lembrete"}
          >
            <i className="fas fa-bell"></i>
          </button>

          <ExportButton appointment={appointment} />
        </div>
      </td>
    </tr>
  );
}
