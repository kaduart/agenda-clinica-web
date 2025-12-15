import { SPECIALTIES } from "../config/specialties";
import { resolveSpecialtyKey } from "../utils/specialty";
import { formatDateLocal } from "../utils/date";

export default function SpecialtyDashboard({ appointments, activeSpecialty }) {
  const filtered =
    activeSpecialty === "todas"
      ? appointments
      : appointments.filter((apt) => resolveSpecialtyKey(apt) === activeSpecialty);

  const today = formatDateLocal(new Date());
  const createdToday = filtered.filter((a) => {
    if (!a.createdAt) return false;
    return formatDateLocal(new Date(a.createdAt)) === today;
  }).length;

  const metrics = {
    total: filtered.length,
    confirmados: filtered.filter((a) => a.status === "Confirmado").length,
    pendentes: filtered.filter((a) => a.status === "Pendente").length,
    prontosCRM: filtered.filter((a) => a.status === "Confirmado").length,
    criadosHoje: createdToday,
  };

  const specialty = SPECIALTIES[activeSpecialty];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <div className={`${specialty.metricColor} rounded-xl p-4 border border-gray-200 shadow-sm`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Total</p>
            <p className={`text-xl font-bold ${specialty.textColor}`}>{metrics.total}</p>
          </div>
          <i className={`fas fa-calendar-check text-xl ${specialty.textColor} opacity-70`}></i>
        </div>
      </div>

      <div className="bg-emerald-50 rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Confirmados</p>
            <p className="text-xl font-bold text-emerald-700">{metrics.confirmados}</p>
          </div>
          <i className="fas fa-check-circle text-xl text-emerald-600 opacity-70"></i>
        </div>
      </div>

      <div className="bg-amber-50 rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Pendentes</p>
            <p className="text-xl font-bold text-amber-700">{metrics.pendentes}</p>
          </div>
          <i className="fas fa-clock text-xl text-amber-600 opacity-70"></i>
        </div>
      </div>

      <div className="bg-orange-50 rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Hoje</p>
            <p className="text-xl font-bold text-orange-700">{metrics.criadosHoje}</p>
          </div>
          <i className="fas fa-calendar-day text-xl text-orange-600 opacity-70"></i>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">→ CRM</p>
            <p className="text-xl font-bold text-blue-700">{metrics.prontosCRM}</p>
          </div>
          <i className="fas fa-upload text-xl text-blue-600 opacity-70"></i>
        </div>
      </div>
    </div>
  );
}
