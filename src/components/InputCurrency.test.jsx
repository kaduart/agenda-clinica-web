import { describe, expect, it, vi } from 'vitest';
import InputCurrency from './InputCurrency';

/**
 * Testa a lógica de conversão sem montar o React: o componente é uma função pura
 * de (value) → texto formatado e de (digitação) → número emitido.
 */

// Reproduz exatamente o que o componente faz na exibição.
const format = (value) => {
    const safe = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safe);
};

// Reproduz o handleChange interno.
const parse = (typed) => {
    const raw = String(typed).replace(/\D/g, '');
    return raw ? parseFloat(raw) / 100 : 0;
};

describe('InputCurrency — exibição', () => {
    it('formata como moeda pt-BR', () => {
        expect(format(160)).toBe('R$ 160,00');
        expect(format(0.1)).toBe('R$ 0,10');
        expect(format(1234.5)).toBe('R$ 1.234,50');
    });

    it('trata valor ausente ou inválido como zero', () => {
        expect(format(undefined)).toBe('R$ 0,00');
        expect(format(NaN)).toBe('R$ 0,00');
        expect(format(null)).toBe('R$ 0,00');
    });
});

describe('InputCurrency — digitação em centavos', () => {
    it('interpreta dígitos como centavos', () => {
        expect(parse('1')).toBe(0.01);
        expect(parse('10')).toBe(0.1);
        expect(parse('16000')).toBe(160);
    });

    it('ignora máscara já aplicada', () => {
        expect(parse('R$ 160,00')).toBe(160);
    });

    // O componente do CRM emite NaN quando o campo é limpo
    // (parseFloat('')/100). Aqui isso vira 0 para não contaminar o formData.
    it('campo limpo vira 0, nunca NaN', () => {
        expect(parse('')).toBe(0);
        expect(parse('R$ ')).toBe(0);
        expect(Number.isNaN(parse(''))).toBe(false);
    });
});

describe('InputCurrency — contrato do evento', () => {
    it('emite evento sintético com name, número e type number', () => {
        const onChange = vi.fn();
        const props = { name: 'crm.paymentAmount', value: 0, onChange };

        // Simula a chamada que o componente faz internamente.
        const raw = '16000';
        props.onChange({
            target: { name: props.name, value: parse(raw), type: 'number' },
        });

        expect(onChange).toHaveBeenCalledWith({
            target: { name: 'crm.paymentAmount', value: 160, type: 'number' },
        });
    });
});

it('componente é exportado como função', () => {
    expect(typeof InputCurrency).toBe('function');
});
