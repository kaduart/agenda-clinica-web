import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { subscribe, answer } from "./confirmStore";
import { useIsMobile } from "./useIsMobile";

/**
 * Confirmação no estilo do app: diálogo central no computador e
 * gaveta de baixo (Vaul) no celular. Substitui window.confirm e o toast de confirmação.
 */
const VARIANTS = {
    red: { icon: "fa-triangle-exclamation", ring: "bg-red-50 text-red-600", btn: "bg-red-600 hover:bg-red-700" },
    teal: { icon: "fa-triangle-exclamation", ring: "bg-amber-50 text-amber-600", btn: "bg-fi-accent hover:bg-fi-deep" },
    blue: { icon: "fa-circle-info", ring: "bg-blue-50 text-blue-600", btn: "bg-blue-600 hover:bg-blue-700" },
    green: { icon: "fa-circle-check", ring: "bg-fi-soft text-fi-accent", btn: "bg-fi-accent hover:bg-fi-deep" },
    whatsapp: { icon: "fa-brands fa-whatsapp", ring: "bg-emerald-50 text-emerald-600", btn: "bg-emerald-600 hover:bg-emerald-700" },
};

function Body({ req, confirmRef }) {
    const v = VARIANTS[req.confirmColor] || VARIANTS.green;
    const iconClass = v.icon.startsWith("fa-brands") ? v.icon : `fas ${v.icon}`;
    return (
        <div className="flex gap-3.5">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${v.ring}`}>
                <i className={`${iconClass} text-base`} aria-hidden="true"></i>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[15px] font-semibold text-fi-ink leading-snug">{req.title || "Confirmar"}</p>
                {req.message && (
                    <p className="mt-1 text-sm text-fi-muted leading-relaxed whitespace-pre-line break-words max-h-[45vh] overflow-auto">{req.message}</p>
                )}
                <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <button type="button" onClick={() => answer(false)}
                        className="h-11 sm:h-9 px-4 rounded-lg border border-fi-line bg-white text-sm font-semibold text-fi-ink hover:bg-fi-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-fi-accent">
                        {req.cancelText || "Cancelar"}
                    </button>
                    <button type="button" ref={confirmRef} onClick={() => answer(true)}
                        className={`h-11 sm:h-9 px-4 rounded-lg text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fi-accent ${v.btn}`}>
                        {req.confirmText || "Confirmar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ConfirmHost() {
    const [req, setReq] = useState(null);
    const isMobile = useIsMobile();
    const confirmRef = useRef(null);

    useEffect(() => subscribe(setReq), []);

    useEffect(() => {
        if (!req || isMobile) return;
        confirmRef.current?.focus();
        const onKey = (e) => {
            if (e.key === "Escape") answer(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [req, isMobile]);

    if (isMobile) {
        return (
            <Drawer.Root open={!!req} onOpenChange={(o) => { if (!o) answer(false); }}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/40" />
                    <Drawer.Content className="fixed inset-x-0 bottom-0 z-[91] rounded-t-2xl bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none">
                        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-fi-line" aria-hidden="true" />
                        <Drawer.Title className="sr-only">{req?.title || "Confirmar"}</Drawer.Title>
                        <Drawer.Description className="sr-only">{req?.message || ""}</Drawer.Description>
                        {req && <Body req={req} confirmRef={confirmRef} />}
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        );
    }

    if (!req) return null;
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 animate-fadeIn"
            onMouseDown={(e) => { if (e.target === e.currentTarget) answer(false); }}>
            <div role="alertdialog" aria-modal="true" aria-label={req.title || "Confirmar"}
                className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_20px_60px_-15px_rgba(15,64,55,0.35)]">
                <Body req={req} confirmRef={confirmRef} />
            </div>
        </div>
    );
}
