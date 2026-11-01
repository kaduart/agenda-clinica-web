import { useEffect } from "react";

// Guia "Novidades" para o comercial: abre sozinho uma vez por versão e depois pelo botão "?" do topo.
const SEEN_KEY = "agendaNovidadesVistas_v3";

// Atalhos de teclado: funcionam na tela da agenda, fora de campos de texto e com nenhuma janela aberta.
const SHORTCUTS = [
  { keys: ["/"], what: "Ir para a busca de paciente", when: "A família liga e você precisa achar o paciente rápido. Aperte /, digite o nome e a lista filtra na hora." },
  { keys: ["N"], what: "Abrir um novo agendamento", when: "Fechou horário no telefone ou no WhatsApp: N já abre o formulário." },
  { keys: ["←", "→"], what: "Dia anterior / próximo dia", when: "Para olhar ontem, amanhã ou os próximos dias sem mexer no calendário." },
  { keys: ["H"], what: "Voltar para hoje", when: "Depois de navegar pelos dias, H volta direto para a agenda de hoje." },
];

const ITEMS = [
  {
    icon: "fa-magnifying-glass", tone: "bg-fi-soft text-fi-deep",
    title: "Use a busca no lugar do Ctrl+F",
    what: "Com o mês inteiro aberto, a lista só desenha as linhas que estão na tela, para não travar. Por isso o Ctrl+F do navegador não acha quem está mais abaixo.",
    how: "Aperte / (ou clique em Buscar paciente) e digite o nome.",
  },
  {
    icon: "fa-paper-plane", tone: "bg-emerald-100 text-emerald-800",
    title: "Salvar e enviar confirmação",
    what: "Na última etapa do agendamento tem a opção \"Enviar confirmação ao salvar\". A agenda lembra a sua escolha.",
    how: "Marque, salve, confira o texto que aparece e toque em Enviar pelo WhatsApp. Se escolher \"Agora não\", o agendamento fica salvo do mesmo jeito.",
  },
  {
    icon: "fa-table-cells-large", tone: "bg-fi-soft text-fi-deep",
    title: "Semanal: vagas da semana",
    what: "Cada profissional mostra as vagas de segunda a sexta, com o dia de hoje destacado e uma barrinha de ocupação (verde vago, amarelo ocupado, rosa interesse).",
    how: "Clique numa vaga para agendar. Clique no +N para ver todas as vagas daquele dia.",
  },
  {
    icon: "fa-mobile-screen", tone: "bg-fi-soft text-fi-deep",
    title: "Agendar pelo celular",
    what: "No celular, o agendamento abre de baixo para cima e ocupa a tela toda, com os botões sempre à vista.",
    how: "Toque em Novo agendamento e siga as 3 etapas normalmente.",
  },
  {
    icon: "fa-circle-check", tone: "bg-emerald-100 text-emerald-800",
    title: "Confirmações mais claras",
    what: "Antes de qualquer envio pelo WhatsApp aparece uma caixa com o texto e o botão de enviar. No celular ela sobe de baixo.",
    how: "Confira o texto e toque em Enviar, ou em Cancelar para não mandar nada.",
  },
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
            <p className="text-sm text-white/85">Atalhos para ganhar tempo e o que mudou na agenda. Leva 1 minuto.</p>
          </div>
          <button type="button" onClick={close} className="w-8 h-8 rounded-lg hover:bg-white/15" aria-label="Fechar"><i className="fas fa-times"></i></button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <section aria-labelledby="atalhos-titulo" className="mb-4 rounded-xl border border-fi-accent/30 bg-fi-soft/60 p-3">
            <h3 id="atalhos-titulo" className="font-head text-sm font-bold text-fi-ink flex items-center gap-2">
              <i className="fas fa-keyboard text-fi-accent" aria-hidden="true"></i> Atalhos de teclado (computador)
            </h3>
            <p className="text-xs text-fi-muted mt-0.5">Funcionam na tela da agenda, quando você não está digitando em um campo.</p>
            <ul className="mt-2.5 space-y-2">
              {SHORTCUTS.map((sc) => (
                <li key={sc.what} className="flex gap-3 items-start">
                  <span className="flex gap-1 shrink-0 w-[72px]">
                    {sc.keys.map((k) => (
                      <kbd key={k} className="min-w-[28px] h-7 px-1.5 inline-flex items-center justify-center rounded-md border border-fi-line border-b-2 bg-white text-sm font-bold text-fi-ink">{k}</kbd>
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-fi-ink">{sc.what}</span>
                    <span className="block text-xs text-fi-muted">{sc.when}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
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
