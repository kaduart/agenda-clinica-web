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
  evaluation: "bg-amber-100 text-amber-700",
  session: "bg-teal-100 text-teal-700",
  package_session: "bg-purple-100 text-purple-700",
  individual_session: "bg-indigo-100 text-indigo-700",
  meet: "bg-pink-100 text-pink-700",
  alignment: "bg-lime-100 text-lime-700",
  return: "bg-sky-100 text-sky-700",
  tongue_tie_test: "bg-fuchsia-100 text-fuchsia-700",
  neuropsych_evaluation: "bg-rose-100 text-rose-700",
  convenio_session: "bg-cyan-100 text-cyan-700",
  liminar_session: "bg-orange-100 text-orange-700",
  consultation: "bg-emerald-100 text-emerald-700",
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
