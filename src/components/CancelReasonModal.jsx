import React from "react";

export default function CancelReasonModal({ defaultValue = "", onCancel, onConfirm }) {
    const [reason, setReason] = React.useState(defaultValue);
    const [error, setError] = React.useState("");
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();

        const handleEscape = (event) => {
            if (event.key === "Escape") onCancel();
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onCancel]);

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedReason = reason.trim();

        if (!trimmedReason) {
            setError("Informe o motivo do cancelamento.");
            inputRef.current?.focus();
            return;
        }

        onConfirm(trimmedReason);
    };

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-reason-title"
            aria-describedby="cancel-reason-description"
        >
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-start gap-3 border-b border-gray-200 px-6 py-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                        <i className="fas fa-ban" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 id="cancel-reason-title" className="text-lg font-bold text-gray-900">
                            Cancelar agendamento
                        </h2>
                        <p id="cancel-reason-description" className="mt-1 text-sm text-gray-600">
                            Registre o motivo para manter o histórico do atendimento.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        aria-label="Fechar modal"
                    >
                        <i className="fas fa-times" aria-hidden="true" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-5">
                        <label htmlFor="cancel-reason" className="mb-2 block text-sm font-bold text-gray-700">
                            Motivo do cancelamento <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            ref={inputRef}
                            id="cancel-reason"
                            value={reason}
                            onChange={(event) => {
                                setReason(event.target.value);
                                if (error) setError("");
                            }}
                            rows={4}
                            className={`w-full resize-none rounded-xl border px-4 py-3 text-gray-900 outline-none transition focus:ring-2 ${
                                error
                                    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                                    : "border-gray-300 focus:border-teal-500 focus:ring-teal-100"
                            }`}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? "cancel-reason-error" : undefined}
                        />
                        {error && (
                            <p id="cancel-reason-error" className="mt-2 text-sm font-medium text-red-600" role="alert">
                                {error}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            Voltar
                        </button>
                        <button
                            type="submit"
                            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                        >
                            Confirmar cancelamento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
