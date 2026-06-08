/**
 * Mapeamento de serviceType (enum do backend) para labels em português.
 * Deve estar sincronizado com o enum do modelo Specialty no backend:
 * ['evaluation', 'session', 'package_session', 'individual_session',
 *  'meet', 'alignment', 'return', 'tongue_tie_test',
 *  'neuropsych_evaluation', 'convenio_session', 'liminar_session', 'consultation']
 */
export const SERVICE_TYPE_LABELS = {
  evaluation: "Avaliação",
  session: "Sessão",
  package_session: "Pacote",
  individual_session: "Sessão Individual",
  joint_session: "Sessão Conjunta",
  meet: "Encontro",
  alignment: "Alinhamento",
  return: "Retorno",
  tongue_tie_test: "Teste da Linguinha",
  neuropsych_evaluation: "Avaliação Neuropsicológica",
  convenio_session: "Convênio",
  liminar_session: "Liminar",
  consultation: "Consulta",
};

/**
 * Cores por serviceType para os badges.
 */
export const SERVICE_TYPE_COLORS = {
  evaluation: "bg-amber-200 text-amber-900 font-semibold",
  session: "bg-teal-200 text-teal-900 font-semibold",
  package_session: "bg-purple-200 text-purple-900 font-semibold",
  individual_session: "bg-indigo-200 text-indigo-900 font-semibold",
  joint_session: "bg-violet-200 text-violet-900 font-semibold",
  meet: "bg-pink-200 text-pink-900 font-semibold",
  alignment: "bg-lime-200 text-lime-900 font-semibold",
  return: "bg-sky-200 text-sky-900 font-semibold",
  tongue_tie_test: "bg-fuchsia-200 text-fuchsia-900 font-semibold",
  neuropsych_evaluation: "bg-rose-200 text-rose-900 font-semibold",
  convenio_session: "bg-cyan-200 text-cyan-900 font-semibold",
  liminar_session: "bg-orange-200 text-orange-900 font-semibold",
  consultation: "bg-emerald-200 text-emerald-900 font-semibold",
};

/**
 * Retorna o label human-readable para um serviceType.
 */
export function getServiceTypeLabel(serviceType) {
  if (!serviceType) return null;
  return SERVICE_TYPE_LABELS[serviceType] || serviceType;
}

/**
 * Retorna a classe de cores Tailwind para o badge do serviceType.
 */
export function getServiceTypeColorClass(serviceType) {
  if (!serviceType) return "bg-gray-100 text-gray-700";
  return SERVICE_TYPE_COLORS[serviceType] || "bg-gray-100 text-gray-700";
}

/**
 * Resolve o serviceType de um agendamento, olhando tanto a raiz quanto crm.serviceType.
 */
export function resolveServiceType(appointment) {
  if (!appointment) return null;
  return appointment.serviceType || appointment.crm?.serviceType || null;
}

/**
 * Lista de serviceType válidos do backend.
 */
export const VALID_SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS);

/**
 * Mapeia um serviceType vindo do backend para o valor usado no frontend.
 * Preserva valores já válidos, mapeia legados e fallback seguro.
 */
export function mapBackendServiceType(backendServiceType, hasPackage = false) {
  if (!backendServiceType) return hasPackage ? "package_session" : "individual_session";

  // Se já é um valor válido do enum, preserva
  if (VALID_SERVICE_TYPES.includes(backendServiceType)) {
    return backendServiceType;
  }

  // Mapeamentos legados / aliases
  switch (backendServiceType) {
    case "return":
    case "retorno":
      return "return";
    case "sessao":
    case "session":
      return hasPackage ? "package_session" : "session";
    case "avaliacao":
    case "evaluation":
      return "evaluation";
    default:
      return hasPackage ? "package_session" : "individual_session";
  }
}
