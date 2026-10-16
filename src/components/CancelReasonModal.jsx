import React from "react";

// Mesmo padrão do modal "Cancelar agendamento" do CRM (CancelAppointmentDialog):
// cabeçalho com ícone vermelho, resumo do agendamento, "quem solicitou" obrigatório
// e SEM opção marcada por padrão, motivo obrigatório, botão vermelho só habilitado
// quando tudo está preenchido. É o dado que alimenta CRM → Agenda → Cancelamentos.
const REQUESTERS = [
    { value: "patient", label: "Paciente/responsável", icon: "fa-user", hint: "Família ou o próprio paciente pediu" },
    { value: "professional", label: "Profissional", icon: "fa-user-md", hint: "O terapeuta não poderá atender" },
    { value: "clinic", label: "Clínica", icon: "fa-building", hint: "Erro de agenda, sala ou estrutura" },
];

const formatDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = String(iso).slice(0, 10).split("-");
    return y && m && d ? `${d}/${m}/${y}` : String(iso);
};

function Summary({ appointment }) {
    if (!appointment) return null;
    const patient =
        appointment.patientName ||
        appointment.patient?.fullName ||
        appointment.patient?.name ||
        (typeof appointment.patient === "string" ? appointment.patient : "");
    const professional =
        (typeof appointment.professional === "string" && appointment.professional) ||
        appointment.doctor?.fullName ||
        appointment.professional?.fullName ||
        "";
    const when = [formatDate(appointment.date), appointment.time].filter(Boolean).join(" às ");
    if (!patient && !when) return null;
    return (
        <div className="mt-4 rounded-lg bg-gray-50 px-3 py-3 text-sm">
            {patient && <p className="font-semibold text-gray-900">{patient}</p>}
            <p className="text-gray-600">{[when, professional].filter(Boolean).join(" · ")}</p>
        </div>
    );
}

export default function CancelReasonModal({ defaultValue = "", appointment = null, title = "Cancelar agendamento", onCancel, onConfirm }) {
    const [reason, setReason] = React.useState(defaultValue);
    const [requester, setRequester] = React.useState(null);
    const reasonRef = React.useRef(null);
    const firstOptionRef = React.useRef(null);

    React.useEffect(() => {
        firstOptionRef.current?.focus();
        const handleEscape = (event) => {
            if (event.key === "Escape") onCancel();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onCancel]);

    const missing = [
        ...(!requester ? ["quem solicitou"] : []),
        ...(!reason.trim() ? ["o motivo"] : []),
    ];
    const hint = missing.length ? `Falta informar ${missing.join(" e ")}.` : "";

    const handleSubmit = (event) => {
        event.preventDefault();
        if (hint) return;
        onConfirm({ reason: reason.trim(), cancelRequester: requester });
    };

    const onRadioKeyDown = (event, index) => {
        const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
        if (!direction) return;
        event.preventDefault();
        const next = (index + direction + REQUESTERS.length) % REQUESTERS.length;
        setRequester(REQUESTERS[next].value);
        event.currentTarget.parentElement?.querySelectorAll('[role="radio"]')[next]?.focus();
    };

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6 animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-reason-title"
        >
            <form
                onSubmit={handleSubmit}
                className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white text-left shadow-2xl"
            >
                <header className="shrink-0 px-5 pt-5 sm:px-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                                <i className="fas fa-times-circle" aria-hidden="true" />
                            </span>
                            <h2 id="cancel-reason-title" className="text-lg font-semibold leading-tight tracking-tight text-gray-900">
                                {title}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onCancel}
                            aria-label="Fechar janela"
                            className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200/60 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                        >
                            <i className="fas fa-times" aria-hidden="true" />
                        </button>
                    </div>
                    <Summary appointment={appointment} />
                </header>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm sm:px-6">
                    <div>
                        <p id="cancel-requester-label" className="mb-1.5 text-sm font-medium text-gray-800">
                            Quem solicitou o cancelamento? <span className="text-red-600">*</span>
                        </p>
                        <div role="radiogroup" aria-labelledby="cancel-requester-label" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {REQUESTERS.map((opt, i) => {
                                const selected = requester === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        ref={i === 0 ? firstOptionRef : undefined}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        title={opt.hint}
                                        tabIndex={selected || (!requester && i === 0) ? 0 : -1}
                                        onClick={() => setRequester(opt.value)}
                                        onKeyDown={(e) => onRadioKeyDown(e, i)}
                                        className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                            selected
                                                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                                                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                                        }`}
                                    >
                                        <i className={`fas ${opt.icon} text-sm ${selected ? "text-emerald-700" : "text-gray-500"}`} aria-hidden="true" />
                                        <span className="flex-1 text-left">{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="cancel-reason" className="mb-2 block font-medium text-gray-800">
                            Motivo do cancelamento <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            ref={reasonRef}
                            id="cancel-reason"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            rows={2}
                            placeholder="Descreva o que aconteceu..."
                            className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-900 caret-emerald-700 placeholder:text-gray-500 transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                    </div>
                </div>

                <footer className="shrink-0 border-t border-gray-200 bg-gray-50/70 px-5 py-4 sm:px-6">
                    <div className="grid grid-cols-[auto_1fr] items-center gap-2 sm:flex sm:justify-end">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                        >
                            Voltar
                        </button>
                        <span title={hint || undefined} className="min-w-0">
                            <button
                                type="submit"
                                disabled={!!hint}
                                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold leading-tight text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 sm:px-4"
                            >
                                <i className="fas fa-times-circle shrink-0" aria-hidden="true" />
                                Confirmar cancelamento
                            </button>
                        </span>
                    </div>
                </footer>
            </form>
        </div>
    );
}
