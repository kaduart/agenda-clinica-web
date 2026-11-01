import { useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { confirmToast } from "../utils/confirmToast";
import { toast } from "../utils/toast";
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
  { key: "agendados", tone: "text-fi-ink", dot: "bg-fi-muted" },
  { key: "confirmaram", tone: "text-fi-accent", dot: "bg-fi-accent" },
  { key: "semResposta", tone: "text-amber-700", dot: "bg-amber-500" },
  { key: "contato", tone: "text-red-700", dot: "bg-red-500" },
  { key: "pre", tone: "text-violet-700", dot: "bg-violet-500" },
  { key: "livres", tone: "text-blue-700", dot: "bg-blue-500" },
  { key: "avaliacao", tone: "text-fi-ink", dot: "bg-yellow-400" },
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
  const { counts, newPre, professionalsCount } = useMemo(() => summarizeDay(appointments), [appointments]);
  const [animRef] = useAutoAnimate({ duration: 180 });
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

  const askBulkSend = async () => {
    const ok = await confirmToast(
      `Vamos mandar o lembrete de confirmação para ${pendingWithPhone.length} paciente${pendingWithPhone.length > 1 ? "s" : ""}, um a cada ${(BULK_SEND_INTERVAL_MS / 1000).toLocaleString("pt-BR")} s. Só entram atendimentos de hoje em diante.`,
      { title: "Enviar confirmações pelo WhatsApp?", confirmText: `Enviar para ${pendingWithPhone.length}`, confirmColor: "whatsapp" }
    );
    if (ok) runBulkSend();
  };

  const askBulkPost = async () => {
    const ok = await confirmToast(
      `A mensagem "Como foi?" vai para ${postPending.length} família${postPending.length > 1 ? "s" : ""} atendida${postPending.length > 1 ? "s" : ""} hoje. É o primeiro passo do pedido de avaliação no Google.`,
      { title: "Enviar \"Como foi?\" agora?", confirmText: `Enviar para ${postPending.length}`, confirmColor: "whatsapp" }
    );
    if (ok) runBulkPost();
  };

  return (
    <div ref={animRef} className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-px bg-fi-line border border-fi-line rounded-xl overflow-hidden" aria-label="Resumo do dia">
        {TILES.map(({ key, tone, dot }) => {
          const active = quickFilter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onQuickFilter(active ? null : key)}
              className={`relative text-left px-3.5 pt-2.5 pb-2 min-w-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fi-accent ${active ? "bg-fi-soft" : "bg-white hover:bg-fi-bg"}`}
              title={active ? "Clique para mostrar todos" : `Mostrar só: ${QUICK_FILTERS[key].label}`}
            >
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-fi-muted truncate">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden="true"></span>
                {QUICK_FILTERS[key].label}
              </span>
              <span className={`block font-head text-[26px] font-bold tabular-nums leading-tight tracking-tight ${tone}`}>
                <NumberFlow value={counts[key] || 0} locales="pt-BR" />
              </span>
              <span className="block text-[11.5px] text-fi-muted truncate">{subtitle[key]}</span>
              {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-fi-accent" aria-hidden="true"></span>}
            </button>
          );
        })}
      </div>

      {(pendingWithPhone.length > 0 || bulkProgress) && (
        <ActionStrip
          tone="amber"
          icon="fas fa-hourglass-half"
          progress={bulkProgress}
          progressLabel="Enviando confirmações"
          text={`${pendingWithPhone.length} paciente${pendingWithPhone.length > 1 ? "s" : ""} ainda não respondeu${pendingWithPhone.length > 1 ? "ram" : ""} a confirmação.`}
          actionLabel={`Enviar confirmação para ${pendingWithPhone.length}`}
          onAction={askBulkSend}
        />
      )}

      {(postPending.length > 0 || postProgress) && (
        <ActionStrip
          tone="teal"
          icon="fas fa-star"
          progress={postProgress}
          progressLabel={'Enviando "Como foi?"'}
          text={`${postPending.length} atendido${postPending.length > 1 ? "s" : ""} hoje ainda sem a mensagem "Como foi?" (primeiro passo da avaliação no Google).`}
          actionLabel={`Enviar para ${postPending.length}`}
          onAction={askBulkPost}
        />
      )}

      {/* 5. Ocupação do dia por profissional (capacidade padrão de 17 atendimentos de 40 min) */}
      {occupancy.length > 0 && (
        <div className="bg-white border border-fi-line rounded-xl px-3.5 py-2.5">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <span className="text-[12px] font-semibold text-fi-ink">Ocupação do dia</span>
            <span className="text-[11px] text-fi-muted">Mais vazios primeiro, base de {DEFAULT_DAILY_CAPACITY} horários</span>
          </div>
          <div className="flex gap-x-5 gap-y-2 overflow-x-auto pb-0.5">
            {occupancy.map((o) => (
              <div key={o.name} className="min-w-[160px] shrink-0">
                <div className="flex justify-between text-xs gap-2">
                  <span className="font-medium text-fi-ink truncate">{o.name}</span>
                  <span className="tabular-nums text-fi-muted">{o.count}/{DEFAULT_DAILY_CAPACITY}</span>
                </div>
                <div className="flex gap-[2px] mt-1.5" aria-label={`${o.count} de ${DEFAULT_DAILY_CAPACITY} horários ocupados`}>
                  {Array.from({ length: DEFAULT_DAILY_CAPACITY }).map((_, i) => (
                    <span key={i} className={`h-2 flex-1 rounded-[2px] ${i < o.count ? (o.pct < 50 ? "bg-amber-400" : "bg-fi-accent") : "bg-fi-bg"}`}></span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const STRIP_TONES = {
  amber: { box: "bg-amber-50 border-amber-200 text-amber-900", icon: "text-amber-600", btn: "border-amber-300 hover:bg-amber-100 text-amber-900", bar: "bg-amber-500", track: "bg-amber-100" },
  teal: { box: "bg-fi-soft border-fi-accent/30 text-fi-deep", icon: "text-fi-accent", btn: "border-fi-accent/40 hover:bg-fi-bg text-fi-deep", bar: "bg-fi-accent", track: "bg-white" },
};

function ActionStrip({ tone, icon, progress, progressLabel, text, actionLabel, onAction }) {
  const t = STRIP_TONES[tone];
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3.5 py-2 text-sm ${t.box}`} role="status">
      <i className={`${icon} ${t.icon}`} aria-hidden="true"></i>
      {progress ? (
        <div className="flex-1 min-w-[200px]">
          <span className="font-medium">
            {progressLabel}… <NumberFlow value={progress.done} /> de {progress.total}
          </span>
          <div className={`mt-1 h-1.5 rounded-full overflow-hidden ${t.track}`}>
            <div className={`h-full rounded-full transition-[width] duration-500 ${t.bar}`} style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}></div>
          </div>
        </div>
      ) : (
        <span className="font-medium flex-1 min-w-[200px]">{text}</span>
      )}
      {!progress && (
        <button type="button" onClick={onAction} className={`h-9 px-3.5 rounded-lg bg-white border font-semibold ${t.btn}`}>
          <i className="fab fa-whatsapp mr-1.5" aria-hidden="true"></i>{actionLabel}
        </button>
      )}
    </div>
  );
}
