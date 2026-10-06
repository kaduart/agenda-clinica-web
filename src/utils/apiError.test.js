import { describe, it, expect } from 'vitest';
import { apiErrorText } from './apiError';

const wrap = (data, message) => ({ response: { data }, message });

describe('apiErrorText', () => {
  it('envelope: prefere message ao error curto e acrescenta a ação', () => {
    expect(apiErrorText(wrap({ code: 'X', message: 'Horário ocupado', error: 'Conflito de agenda médica', action: 'Escolha outro.' })))
      .toBe('Horário ocupado\nEscolha outro.');
  });
  it('não repete a ação já contida na message', () => {
    expect(apiErrorText(wrap({ code: 'X', message: 'Falhou. Tente de novo.', action: 'Tente de novo.' }))).toBe('Falhou. Tente de novo.');
  });
  it('legado: error string, error objeto e message soltos', () => {
    expect(apiErrorText(wrap({ error: 'Paciente não encontrado' }))).toBe('Paciente não encontrado');
    expect(apiErrorText(wrap({ error: { code: 'A', message: 'Objeto' } }))).toBe('Objeto');
    expect(apiErrorText(wrap({ message: 'Só message' }))).toBe('Só message');
  });
  it('sem corpo: usa err.message e depois o fallback', () => {
    expect(apiErrorText({ message: 'Network Error' })).toBe('Network Error');
    expect(apiErrorText({}, 'Padrão')).toBe('Padrão');
  });
});
