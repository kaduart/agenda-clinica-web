import { describe, expect, it } from 'vitest';
import { formatPhoneBR, onlyDigits, validatePhoneBR } from './phone';

describe('formatPhoneBR', () => {
    it('formata celular com 11 dígitos', () => {
        expect(formatPhoneBR('62991805470')).toBe('(62) 99180-5470');
    });

    it('formata fixo com 10 dígitos', () => {
        expect(formatPhoneBR('6233214455')).toBe('(62) 3321-4455');
    });

    it('formata parcialmente enquanto digita', () => {
        expect(formatPhoneBR('6')).toBe('6');
        expect(formatPhoneBR('62')).toBe('62');
        expect(formatPhoneBR('62991')).toBe('(62) 991');
        expect(formatPhoneBR('629918054')).toBe('(62) 9918-054');
    });

    it('descarta dígitos além de 11 e ignora o que já vem mascarado', () => {
        expect(formatPhoneBR('629918054701234')).toBe('(62) 99180-5470');
        expect(formatPhoneBR('(62) 99180-5470')).toBe('(62) 99180-5470');
    });
});

describe('validatePhoneBR', () => {
    it('aceita celular e fixo bem formados', () => {
        expect(validatePhoneBR('62991805470').valid).toBe(true);
        expect(validatePhoneBR('(62) 99180-5470').valid).toBe(true);
        expect(validatePhoneBR('6233214455').valid).toBe(true);
    });

    // Caso real: celular digitado com um dígito a menos era exibido como
    // "(62) 9920-1357" e passava, porque só se checava o comprimento mínimo.
    it('rejeita celular truncado com 10 dígitos começando em 9', () => {
        const result = validatePhoneBR('6299201357');

        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/incompleto/i);
    });

    it('rejeita 11 dígitos que não começam com 9 após o DDD', () => {
        expect(validatePhoneBR('62332144556').valid).toBe(false);
    });

    it('rejeita vazio, curto demais, longo demais e DDD inválido', () => {
        expect(validatePhoneBR('').valid).toBe(false);
        expect(validatePhoneBR('629918').valid).toBe(false);
        expect(validatePhoneBR('629918054701').valid).toBe(false);
        expect(validatePhoneBR('0199180547').valid).toBe(false);
    });

    // Cadastros antigos têm fixos legados em 6/7/8 — rejeitá-los quebraria dado real.
    it('não rejeita prefixo legado de fixo', () => {
        expect(validatePhoneBR('6284142102').valid).toBe(true);
    });
});

describe('onlyDigits', () => {
    it('extrai apenas dígitos e tolera nulo', () => {
        expect(onlyDigits('(62) 99180-5470')).toBe('62991805470');
        expect(onlyDigits(null)).toBe('');
    });
});
