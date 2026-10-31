import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useInsights } from "./InsightsContext";
import { getRowInsights, findRefillCandidates } from "../utils/insights";
import { getPatientName, getPatientPhone } from "../utils/daySummary";
import { packageRenewalMessage, packageOfferMessage, refillOfferMessage } from "../utils/commercialMessages";
import { sendViaExtension } from "../services/whatsappExtension";

// Envia uma mensagem comercial pelo mesmo canal dos botões de WhatsApp da linha.
// Mostra o texto antes de enviar: nada sai sem a recepção confirmar.
async function sendCommercial(phone, message, label) {
  if (!phone) {
    toast.error("Paciente sem telefone cadastrado");
    return false;
  }
  if (!window.confirm(`${label}\n\n${message}\n\nEnviar pelo WhatsApp?`)) return false;
  const result = await sendViaExtension(phone, message);
  if (result?.success) {
    toast.success("Mensagem enviada!");
    return true;
  }
  if (result?.needsReconnect || /conectado|QR|desconectado/.test(result?.error || "")) {
    window.dispatchEvent(new CustomEvent("open-whatsapp-connect"));
    toast.error("WhatsApp desconectado. Escaneie o QR code.");
  } else {
    toast.error(result?.error || "Erro ao enviar");
  }
  return false;
}

const chip = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap";

export function RowInsightChips({ appointment }) {
  const { index } = useInsights();
  const ins = useMemo(() => getRowInsights(appointment, index), [appointment, index]);
  const phone = getPatientPhone(appointment);
  if (!ins.missRisk && !ins.packageEnding && !ins.preCooling && !ins.recurringAvulso) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {ins.missRisk && (
        <span className={`${chip} ${ins.missRisk.level === "alto" ? "bg-red-600 text-white" : "bg-red-100 text-red-800"}`} title={`Risco de falta: ${ins.missRisk.reasons.join("; ")}. Vale ligar antes.`}>
          <i className="fas fa-triangle-exclamation text-[10px]"></i> Risco de falta
        </span>
      )}
      {ins.packageEnding && (
        <button
          type="button"
          className={`${chip} bg-amber-100 text-amber-900 hover:bg-amber-200`}
          title="Última sessão do pacote. Clique para enviar a mensagem de renovação."
          onClick={(e) => { e.stopPropagation(); sendCommercial(phone, packageRenewalMessage(appointment), "Renovação de pacote"); }}
        >
          <i className="fas fa-box text-[10px]"></i>
          {ins.packageEnding.remaining === 0 ? "Pacote acabou" : "Última do pacote"} · Renovar
        </button>
      )}
      {ins.preCooling && (
        <span className={`${chip} ${ins.preCooling.hours >= 48 ? "bg-red-100 text-red-800" : "bg-violet-100 text-violet-800"}`} title="Pré-agendado sem andamento. Quanto antes o contato, maior a chance de fechar.">
          <i className="fas fa-snowflake text-[10px]"></i> Parado há {ins.preCooling.hours >= 48 ? `${Math.floor(ins.preCooling.hours / 24)} dias` : `${ins.preCooling.hours}h`}
        </span>
      )}
      {ins.recurringAvulso && (
        <button
          type="button"
          className={`${chip} bg-indigo-100 text-indigo-800 hover:bg-indigo-200`}
          title={`${ins.recurringAvulso.count} sessões avulsas nas últimas 5 semanas. Clique para oferecer o pacote 1x/semana.`}
          onClick={(e) => { e.stopPropagation(); sendCommercial(phone, packageOfferMessage(appointment), "Oferta de pacote"); }}
        >
          <i className="fas fa-arrow-trend-up text-[10px]"></i> Avulso {ins.recurringAvulso.count}x · Oferecer pacote
        </button>
      )}
    </div>
  );
}

// 2. Fila de reposição: quem pode ocupar um horário cancelado ou livre
export function RefillButton({ slot }) {
  const { index, history, dayList } = useInsights();
  const [open, setOpen] = useState(false);
  const candidates = useMemo(
    () => (open ? findRefillCandidates(slot, history, dayList, index) : []),
    [open, slot, history, dayList, index]
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-semibold whitespace-nowrap"
        title="Sugere quem pode ocupar este horário"
        aria-expanded={open}
      >
        <i className="fas fa-people-arrows text-[11px]"></i> Quem encaixar
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)}></div>
          <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-xl border border-fi-line bg-white shadow-xl p-2 text-left" onClick={(e) => e.stopPropagation()}>
            <div className="px-2 pb-2 mb-1 border-b border-fi-line">
              <div className="text-sm font-semibold text-fi-ink">Quem pode ocupar este horário</div>
              <div className="text-[11px] text-fi-muted">Mesma especialidade · últimas 5 semanas</div>
            </div>
            {candidates.length === 0 ? (
              <p className="px-2 py-3 text-sm text-fi-muted">Ninguém sugerido agora. Confira a lista de espera no ERP.</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {candidates.map(({ appointment: c, reason }) => (
                  <li key={c.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-fi-bg">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-fi-ink truncate">{getPatientName(c) || "-"}</div>
                      <div className="text-[11px] text-fi-muted truncate">{reason}</div>
                    </div>
                    <button
                      type="button"
                      className="h-8 px-2.5 rounded-lg bg-fi-accent text-white text-xs font-semibold hover:bg-fi-deep shrink-0"
                      onClick={() => sendCommercial(getPatientPhone(c), refillOfferMessage(c, slot), `Convite para ${getPatientName(c)}`)}
                    >
                      <i className="fab fa-whatsapp mr-1"></i>Convidar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
