import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { QUICK_FILTERS, summarizeDay, getPatientName, getPatientPhone } from "../utils/daySummary";
import { sendViaExtension, generateReminderMessage } from "../services/whatsappExtension";
import { sendWhatsAppMessage } from "../services/baileysApi";
import { trackPostAppointmentStep } from "../services/appointmentsRepo";
import { loadSavedMessages, loadGoogleLink, applyVariables } from "./PostAppointmentModal";
import { getRowInsights, occupancyByProfessional, DEFAULT_DAILY_CAPACITY } from "../utils/insights";
import { useInsights } from "./InsightsContext";

// Intervalo entre envios em lote, para não disparar tudo de uma vez no mesmo número
const BULK_SEND_INTERVAL_MS = 2500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TILES = [
  { key: "agendados", tone: "text-fi-ink" },
  { key: "confirmaram", tone: "text-fi-accent" },
  { key: "semResposta", tone: "text-amber-700" },
  { key: "contato", tone: "text-red-700" },
  { key: "pre", tone: "text-violet-700" },
  { key: "livres", tone: "text-blue-700" },
  { key: "avaliacao", tone: "text-fi-ink" },
];

export default function DaySummary({ appointments, quickFilter, onQuickFilter, hasProfessionalFilter, isSingleDay, onPostAppointmentSent }) {
  const { index } = useInsights();
  const coolingPre = useMemo(
    () => (appointments || []).filter((a) => getRowInsights(a, index).preCooling).length,
    [appointments, index]
  );
  const atRisk = useMemo(
    () => (appointments || []).filter((a) => getRowInsights(a, index).missRisk).length,
    [appointments, index]
  );
  const occupancy = useMemo(() => (isSingleDay ? occupancyByProfessional(appointments) : []), [appointments, isSingleDay]);
  const [postProgress, setPostProgress] = useState(null);
  const [confirmingPost, setConfirmingPost] = useState(false);
  const { counts, newPre, professionalsCount } = useMemo(() => summarizeDay(appointments), [appointments]);
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null); // { done, total }

  // Lote só para atendimentos de hoje em diante (nunca reenvia para datas passadas)
  const pendingWithPhone = useMemo(() => {
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return (appointments || []).filter(
      (a) => QUICK_FILTERS.semResposta.match(a) && getPatientPhone(a) && String(a.date || "").slice(0, 10) >= todayISO
    );
  }, [appointments]);

  const subtitle = {
    agendados: atRisk ? `${atRisk} com risco de falta` : `${professionalsCount} profissiona${professionalsCount === 1 ? "l" : "is"}`,
    confirmaram: counts.agendados ? `${Math.round((counts.confirmaram / counts.agendados) * 100)}% do total` : "—",
    semResposta: counts.semResposta ? "enviar confirmação" : "tudo respondido",
    contato: counts.contato ? "pediram alteração" : "nenhum pedido",
    pre: coolingPre ? `${coolingPre} parado${coolingPre > 1 ? "s" : ""} +24h` : newPre ? `${newPre} novo${newPre > 1 ? "s" : ""}` : "para confirmar",
    livres: hasProfessionalFilter ? "para encaixe" : "escolha um profissional",
    avaliacao: "atendidos sem pedido",
  };

  // 7. Pós-atendimento em lote: "Como foi?" para quem foi atendido hoje e ainda não recebeu
  const postPending = useMemo(() => {
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return (appointments || []).filter(
      (a) =>
        !a.__isVirtual &&
        (a.operationalStatus === "completed" || a.operationalStatus === "confirmed") &&
        String(a.date || "").slice(0, 10) === todayISO &&
        !(a.postAppointmentSentAt || a.raw?.postAppointmentSentAt) &&
        getPatientPhone(a)
    );
  }, [appointments]);

  const runBulkPost = async () => {
    setConfirmingPost(false);
    const { message1 } = loadSavedMessages();
    const link = loadGoogleLink();
    const sentIds = [];
    setPostProgress({ done: 0, total: postPending.length });
    for (let i = 0; i < postPending.length; i += 1) {
      const a = postPending[i];
      const phone = getPatientPhone(a).replace(/\D/g, "");
      // Mesmo envio e mesmo registro do botão "Como foi?" da linha
      const result = await sendWhatsAppMessage(phone, applyVariables(message1, a, link));
      if (result?.success) {
        sentIds.push(a.id);
        trackPostAppointmentStep(a.id || a._id, "msg1").catch((e) => console.error("[DaySummary] Falha ao registrar pós-atendimento:", e));
      } else if (result?.needsReconnect || /conectado|QR|desconectado/.test(result?.error || "")) {
        window.dispatchEvent(new CustomEvent("open-whatsapp-connect"));
        toast.error(`WhatsApp desconectado. ${sentIds.length} de ${postPending.length} enviados.`);
        break;
      }
      setPostProgress({ done: i + 1, total: postPending.length });
      if (i < postPending.length - 1) await sleep(BULK_SEND_INTERVAL_MS);
    }
    setPostProgress(null);
    if (sentIds.length) {
      onPostAppointmentSent?.(sentIds);
      toast.success(`"Como foi?" enviado para ${sentIds.length} família${sentIds.length > 1 ? "s" : ""}.`);
    }
  };

  const runBulkSend = async () => {
    setConfirmingBulk(false);
    const list = pendingWithPhone;
    let ok = 0;
    setBulkProgress({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i += 1) {
      const a = list[i];
      const message = generateReminderMessage({ ...a, fullName: getPatientName(a) });
      // Mesmo envio do botão "Enviar lembrete" da linha (com rastreio da resposta de confirmação)
      const result = await sendViaExtension(getPatientPhone(a), message, {
        appointmentId: a.id || a._id,
        purpose: "attendance_confirmation",
      });
      if (result?.success) ok += 1;
      if (!result?.success && (result?.needsReconnect || /conectado|QR|desconectado/.test(result?.error || ""))) {
        window.dispatchEvent(new CustomEvent("open-whatsapp-connect"));
        toast.error(`WhatsApp desconectado. ${ok} de ${list.length} enviados; o restante não foi enviado.`);
        setBulkProgress(null);
        return;
      }
      setBulkProgress({ done: i + 1, total: list.length });
      if (i < list.length - 1) await sleep(BULK_SEND_INTERVAL_MS);
    }
    setBulkProgress(null);
    if (ok === list.length) toast.success(`Confirmação enviada para ${ok} paciente${ok > 1 ? "s" : ""}.`);
    else toast.warning(`${ok} de ${list.length} confirmações enviadas. Veja as linhas que ficaram sem resposta.`);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 bg-white border border-fi-line rounded-xl overflow-hidden" aria-label="Resumo">
        {TILES.map(({ key, tone }) => {
          const active = quickFilter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onQuickFilter(active ? null : key)}
              className={`text-left px-3 py-2 border-r border-b border-fi-line min-w-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fi-accent ${active ? "bg-fi-soft" : "hover:bg-fi-bg"}`}
              title={active ? "Clique para mostrar todos" : `Mostrar só: ${QUICK_FILTERS[key].label}`}
            >
              <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-fi-muted truncate">{QUICK_FILTERS[key].label}</span>
              <span className={`block font-head text-xl font-extrabold tabular-nums leading-tight ${tone}`}>{counts[key]}</span>
              <span className="block text-[11.5px] text-fi-muted truncate">{subtitle[key]}</span>
            </button>
          );
        })}
      </div>

      {(pendingWithPhone.length > 0 || bulkProgress) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900" role="status">
          <i className="fas fa-hourglass-half text-amber-600"></i>
          {bulkProgress ? (
            <span className="font-medium">Enviando confirmações… {bulkProgress.done} de {bulkProgress.total}</span>
          ) : (
            <span className="font-medium">
              {pendingWithPhone.length} paciente{pendingWithPhone.length > 1 ? "s" : ""} ainda não respondeu{pendingWithPhone.length > 1 ? "ram" : ""} a confirmação.
            </span>
          )}
          {!bulkProgress && !confirmingBulk && (
            <button
              type="button"
              onClick={() => setConfirmingBulk(true)}
              className="ml-auto h-8 px-3 rounded-lg bg-white border border-amber-300 font-semibold text-amber-900 hover:bg-amber-100"
            >
              <i className="fab fa-whatsapp mr-1.5"></i>Enviar confirmação para {pendingWithPhone.length}
            </button>
          )}
          {!bulkProgress && confirmingBulk && (
            <span className="ml-auto inline-flex items-center gap-2">
              <span>Enviar agora pelo WhatsApp?</span>
              <button type="button" onClick={runBulkSend} className="h-8 px-3 rounded-lg bg-fi-accent text-white font-semibold hover:bg-fi-deep">Sim, enviar</button>
              <button type="button" onClick={() => setConfirmingBulk(false)} className="h-8 px-3 rounded-lg font-semibold hover:bg-amber-100">Cancelar</button>
            </span>
          )}
        </div>
      )}

      {(postPending.length > 0 || postProgress) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-fi-soft border border-fi-accent/30 px-3 py-2 text-sm text-fi-deep" role="status">
          <i className="fas fa-star text-fi-accent"></i>
          {postProgress ? (
            <span className="font-medium">Enviando "Como foi?"… {postProgress.done} de {postProgress.total}</span>
          ) : (
            <span className="font-medium">{postPending.length} atendido{postPending.length > 1 ? "s" : ""} hoje ainda sem a mensagem "Como foi?" (primeiro passo da avaliação no Google).</span>
          )}
          {!postProgress && !confirmingPost && (
            <button type="button" onClick={() => setConfirmingPost(true)} className="ml-auto h-8 px-3 rounded-lg bg-white border border-fi-accent/40 font-semibold hover:bg-fi-bg">
              <i className="fab fa-whatsapp mr-1.5"></i>Enviar para {postPending.length}
            </button>
          )}
          {!postProgress && confirmingPost && (
            <span className="ml-auto inline-flex items-center gap-2">
              <span>Enviar agora?</span>
              <button type="button" onClick={runBulkPost} className="h-8 px-3 rounded-lg bg-fi-accent text-white font-semibold hover:bg-fi-deep">Sim, enviar</button>
              <button type="button" onClick={() => setConfirmingPost(false)} className="h-8 px-3 rounded-lg font-semibold hover:bg-white">Cancelar</button>
            </span>
          )}
        </div>
      )}

      {/* 5. Ocupação do dia por profissional (capacidade padrão de 17 atendimentos de 40 min) */}
      {occupancy.length > 0 && (
        <div className="bg-white border border-fi-line rounded-xl px-3 py-2">
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-fi-muted">Ocupação do dia</span>
            <span className="text-[11px] text-fi-muted">mais vazios primeiro · base {DEFAULT_DAILY_CAPACITY} horários</span>
          </div>
          <div className="flex gap-x-4 gap-y-2 overflow-x-auto pb-0.5">
            {occupancy.map((o) => (
              <div key={o.name} className="min-w-[150px] shrink-0">
                <div className="flex justify-between text-xs gap-2">
                  <span className="font-medium text-fi-ink truncate">{o.name}</span>
                  <span className="tabular-nums text-fi-muted">{o.count}/{DEFAULT_DAILY_CAPACITY}</span>
                </div>
                <div className="h-1.5 rounded-full bg-fi-bg mt-1 overflow-hidden">
                  <div className={`h-full rounded-full ${o.pct < 50 ? "bg-amber-500" : "bg-fi-accent"}`} style={{ width: `${o.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
