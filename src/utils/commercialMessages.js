// Mensagens comerciais prontas (regras da clínica: valor antes do preço, horário genérico, 1 💚).

const saudacao = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
};

const firstName = (s) => (s || "").trim().split(" ")[0] || "";

const greeting = (a) => {
  const resp = firstName(a.responsible || a.patient?.guardianName);
  return `${saudacao()}${resp ? `, ${resp}` : ""}!`;
};

const patientFirst = (a) => firstName(a.patientName || a.patient?.fullName || a.patient?.name) || "o paciente";

// "amanhã à tarde", "quinta de manhã"... nunca o horário exato
export function genericWhen(dateISO, time) {
  const [y, m, d] = String(dateISO || "").split("-").map(Number);
  const hour = Number(String(time || "").split(":")[0]);
  const period = Number.isNaN(hour) ? "" : hour < 12 ? " de manhã" : " à tarde";
  if (!y) return "";
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return `hoje${period}`;
  if (diff === 1) return `amanhã${period}`;
  const weekday = target.toLocaleDateString("pt-BR", { weekday: "long" }).replace("-feira", "");
  return `${weekday}${period}`;
}

export const packageRenewalMessage = (a) =>
  `${greeting(a)} A próxima sessão de ${patientFirst(a)} é a última do pacote atual. ` +
  `Manter a frequência sem intervalo é o que garante a evolução e o mesmo horário fixo na agenda. ` +
  `A renovação segue em R$ 180 por sessão (pacote 1x/semana, cerca de R$ 720/mês). Posso deixar renovado? 💚`;

export const packageOfferMessage = (a) =>
  `${greeting(a)} Como ${patientFirst(a)} já está vindo toda semana, o pacote mensal garante o horário fixo e a continuidade do tratamento, ` +
  `que é o que mais faz diferença na evolução. No pacote 1x/semana a sessão sai por R$ 180 (cerca de R$ 720/mês), em vez de R$ 220 avulsa. Quer que eu já deixe reservado? 💚`;

export const refillOfferMessage = (candidate, slot) =>
  `${greeting(candidate)} Abriu uma vaga ${genericWhen(slot.date, slot.time)} para ${patientFirst(candidate)}` +
  `${slot.professional ? ` com ${typeof slot.professional === "string" ? slot.professional : slot.doctor?.fullName || ""}` : ""}. ` +
  `Quer aproveitar para adiantar o atendimento? Se fizer sentido, já reservo para vocês. 💚`;
