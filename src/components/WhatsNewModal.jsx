import { useEffect } from "react";

// Guia "Novidades" para o comercial: abre sozinho uma vez por versão e depois pelo botão "?" do topo.
const SEEN_KEY = "agendaNovidadesVistas_v1";

const ITEMS = [
  {
    icon: "fa-chart-simple", tone: "bg-fi-soft text-fi-deep",
    title: "Resumo do dia",
    what: "Os quadrinhos no topo mostram agendados, quem confirmou, quem não respondeu, pré-agendados, horários livres e quem falta pedir avaliação.",
    how: "Clique em um número para ver só aqueles pacientes na lista. Clique de novo para voltar a ver todos.",
  },
  {
    icon: "fa-paper-plane", tone: "bg-amber-100 text-amber-800",
    title: "Confirmação em lote",
    what: "A faixa amarela mostra quantos pacientes de hoje em diante ainda não responderam a confirmação.",
    how: "Clique em \"Enviar confirmação para N\" e confirme. As mensagens saem uma por uma.",
  },
  {
    icon: "fa-triangle-exclamation", tone: "bg-red-100 text-red-800",
    title: "Risco de falta",
    what: "Selo vermelho no paciente que faltou ou cancelou 2 vezes ou mais nas últimas 5 semanas, ou que não respondeu a confirmação na véspera.",
    how: "Passe o mouse para ver o motivo. Vale ligar antes do horário.",
  },
  {
    icon: "fa-people-arrows", tone: "bg-emerald-100 text-emerald-800",
    title: "Quem encaixar",
    what: "Nas linhas canceladas e nos horários livres aparece o botão \"Quem encaixar\". Ele sugere pré-agendados da mesma área que dá para adiantar e quem faltou e está sem horário.",
    how: "Clique em \"Convidar\": a mensagem aparece para você conferir antes de enviar.",
  },
  {
    icon: "fa-box", tone: "bg-amber-100 text-amber-900",
    title: "Pacote acabando",
    what: "Selo \"Última do pacote\" quando o paciente está na última sessão.",
    how: "Clique em \"Renovar\" para enviar a mensagem de renovação já pronta.",
  },
  {
    icon: "fa-snowflake", tone: "bg-violet-100 text-violet-800",
    title: "Pré-agendado parado",
    what: "Selo \"Parado há 30h\" no pré-agendado que está há mais de 24h sem andamento. Fica vermelho depois de 2 dias.",
    how: "Priorize esses contatos: quanto antes a resposta, maior a chance de fechar.",
  },
  {
    icon: "fa-arrow-trend-up", tone: "bg-indigo-100 text-indigo-800",
    title: "Avulso recorrente",
    what: "Selo \"Avulso 3x\" em quem pagou sessão avulsa 3 vezes ou mais nas últimas 5 semanas.",
    how: "Clique em \"Oferecer pacote\" para enviar a oferta do pacote 1x/semana.",
  },
  {
    icon: "fa-gauge", tone: "bg-fi-soft text-fi-deep",
    title: "Ocupação do dia",
    what: "Barra por profissional (ex.: 7/17), começando pelos mais vazios. Em amarelo, abaixo da metade.",
    how: "Use para decidir em quem oferecer encaixe primeiro.",
  },
  {
    icon: "fa-star", tone: "bg-fi-soft text-fi-deep",
    title: "\"Como foi?\" em lote",
    what: "Faixa verde com quem foi atendido hoje e ainda não recebeu a mensagem \"Como foi?\", o primeiro passo para pedir avaliação no Google.",
    how: "Clique em \"Enviar para N\" e confirme.",
  },
  {
    icon: "fa-clock", tone: "bg-fi-soft text-fi-deep",
    title: "No agendamento",
    what: "Os horários livres do profissional aparecem como botões. O cartão do paciente mostra os últimos atendimentos e, no Financeiro, aparece a dica de pacote para quem vem pagando avulso.",
    how: "Toque no horário para escolher. Ainda dá para digitar outro horário se precisar.",
  },
];

// eslint-disable-next-line react-refresh/only-export-components
export function shouldAutoOpenWhatsNew() {
  try { return !localStorage.getItem(SEEN_KEY); } catch { return false; }
}

export default function WhatsNewModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  const close = () => {
    try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch { /* sem storage: abre de novo na próxima vez */ }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="novidades-titulo" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#0d9387] text-white px-5 py-4 flex items-start gap-3">
          <div className="flex-1">
            <h2 id="novidades-titulo" className="font-head text-lg font-bold">Novidades da agenda</h2>
            <p className="text-sm text-white/85">A agenda agora avisa onde tem oportunidade e risco. Veja em 1 minuto o que mudou.</p>
          </div>
          <button type="button" onClick={close} className="w-8 h-8 rounded-lg hover:bg-white/15" aria-label="Fechar"><i className="fas fa-times"></i></button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <ol className="space-y-3">
            {ITEMS.map((it) => (
              <li key={it.title} className="flex gap-3 rounded-xl border border-fi-line p-3">
                <span className={`w-9 h-9 shrink-0 rounded-lg inline-flex items-center justify-center ${it.tone}`}><i className={`fas ${it.icon}`}></i></span>
                <div className="min-w-0">
                  <h3 className="font-head text-sm font-bold text-fi-ink">{it.title}</h3>
                  <p className="text-sm text-fi-ink mt-0.5">{it.what}</p>
                  <p className="text-xs text-fi-deep mt-1"><i className="fas fa-hand-pointer mr-1"></i>{it.how}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-fi-muted mt-4">
            Nenhuma mensagem sai sozinha: o texto sempre aparece para você conferir antes de enviar. Filtros e cores das linhas continuam como antes.
          </p>
        </div>

        <div className="px-5 py-3 border-t border-fi-line bg-fi-bg flex items-center gap-2">
          <span className="text-xs text-fi-muted mr-auto">Para rever depois, clique no <b>?</b> no topo da agenda.</span>
          <button type="button" onClick={close} className="h-9 px-4 rounded-lg bg-fi-accent text-white text-sm font-semibold hover:bg-fi-deep">Entendi</button>
        </div>
      </div>
    </div>
  );
}
