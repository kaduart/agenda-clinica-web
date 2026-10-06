/**
 * Texto de erro da API para o usuário.
 *
 * O CRM responde erros no envelope padrão { success:false, code, message, error, action?, items? }
 * (ver back/docs/MENSAGERIA_PADRAO.md). `message` é o texto para a pessoa; `error` pode ser o texto
 * curto legado; em respostas antigas `error` era a única mensagem (string) ou um objeto { message }.
 */
export function apiErrorText(err, fallback = 'Erro na operação') {
  const data = err?.response?.data;
  if (data && typeof data === 'object') {
    const isEnvelope = typeof data.code === 'string' || typeof data.errorCode === 'string';
    const legacy = typeof data.error === 'string' ? data.error : data.error?.message;
    const base = (isEnvelope && typeof data.message === 'string' && data.message.trim())
      ? data.message
      : (legacy || data.message || null);
    if (base) {
      const action = typeof data.action === 'string' && data.action.trim() && !base.includes(data.action) ? data.action : '';
      return action ? `${base}\n${action}` : base;
    }
  }
  return err?.message || fallback;
}

export default apiErrorText;
