import { exportToCRM } from "../services/crmExport";

export default function ExportButton({ appointment }) {
    const exportStatus = appointment.export?.status;

    if (exportStatus === "success") {
        return (
            <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
                <i className="fas fa-check-circle"></i>
                <span>Exportado</span>
                <span className="text-xs text-gray-400">
                    (ID: {appointment.export.crmAppointmentId?.slice(0, 8)}...)
                </span>
            </div>
        );
    }

    if (exportStatus === "exporting") {
        return (
            <button className="p-2 text-gray-400 cursor-not-allowed" disabled title="Exportando...">
                <i className="fas fa-spinner fa-spin"></i>
            </button>
        );
    }

    if (exportStatus === "error" || exportStatus === "conflict") {
        return (
            <button
                className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-100 rounded-lg"
                onClick={() => exportToCRM(appointment)}
                title={`Erro: ${appointment.export?.lastErrorMessage || "Falha"}. Clique para tentar novamente.`}
            >
                <i className="fas fa-exclamation-triangle"></i>
            </button>
        );
    }

    if (appointment.status === "Confirmado") {
        return (
            <button
                type="button"
                className="p-2 text-teal-700 hover:text-teal-900 hover:bg-teal-100 rounded-lg"
                onClick={() => exportToCRM(appointment)}
                title="Exportar para CRM"
            >
                <i className="fas fa-upload"></i>
            </button>
        );
    }

    return null;
}
