import { describe, expect, it, vi } from 'vitest';

/**
 * Testa a lógica de sinal recebido do AppointmentModal SEM montar o React —
 * mesmo padrão de InputCurrency.test.jsx (este projeto não tem jsdom/
 * @testing-library configurado; introduzir isso pra 1 componente seria expandir
 * a infra de teste, fora do escopo desta entrega). As funções abaixo reproduzem
 * EXATAMENTE as expressões usadas em handleSubmit (AppointmentModal.jsx) —
 * ver comentário em cada bloco apontando a linha original.
 */

// Reproduz a validação de AppointmentModal.jsx:699 (sinal > valor total)
function validateDepositNotExceedingTotal(depositAmount, paymentAmount) {
    return Number(depositAmount) > Number(paymentAmount || 0);
}

// Reproduz AppointmentModal.jsx:705 (seção aberta mas valor <= 0)
function validateDepositGreaterThanZero(showDepositField, depositAmount) {
    if (!showDepositField) return true; // não se aplica
    return Number(depositAmount) > 0;
}

// Reproduz AppointmentModal.jsx:711 (forma de pagamento obrigatória quando há sinal novo)
function validateDepositPaymentMethodRequired(depositAmount, depositPaymentMethod, alreadyReceivedDeposit) {
    if (Number(depositAmount) <= 0) return true; // não se aplica
    if (Number(alreadyReceivedDeposit) > 0) return true; // já registrado, não é sinal novo
    return !!depositPaymentMethod;
}

// Reproduz o trecho de dataToSave (AppointmentModal.jsx:717-766) relevante ao sinal
function buildDataToSaveDepositFields(formData, appointment) {
    const isPreNew = true; // cenário testado: criação de pré-agendamento novo
    const alreadyReceivedDeposit = Number(appointment?.depositAmount || appointment?.raw?.depositAmount || 0);
    const base = {
        sessionValue: Number(formData.crm?.paymentAmount ?? formData.paymentAmount ?? 0),
        paymentAmount: Number(formData.crm?.paymentAmount ?? formData.paymentAmount ?? 0),
    };
    if (isPreNew && Number(formData.depositAmount) > 0 && !alreadyReceivedDeposit) {
        return {
            ...base,
            depositAmount: Number(formData.depositAmount),
            depositPaymentMethod: formData.depositPaymentMethod,
        };
    }
    return base;
}

describe('AppointmentModal — validações do sinal recebido', () => {
    it('rejeita sinal maior que o valor total da consulta', () => {
        expect(validateDepositNotExceedingTotal(600, 500)).toBe(true); // inválido
        expect(validateDepositNotExceedingTotal(50, 500)).toBe(false); // válido
        expect(validateDepositNotExceedingTotal(500, 500)).toBe(false); // igual é permitido (saldo 0)
    });

    it('exige sinal maior que zero quando a seção está aberta', () => {
        expect(validateDepositGreaterThanZero(true, 0)).toBe(false);
        expect(validateDepositGreaterThanZero(true, 50)).toBe(true);
        expect(validateDepositGreaterThanZero(false, 0)).toBe(true); // seção fechada, não se aplica
    });

    it('exige forma de pagamento quando há sinal novo (> 0) e ainda não registrado', () => {
        expect(validateDepositPaymentMethodRequired(50, '', 0)).toBe(false); // falta forma
        expect(validateDepositPaymentMethodRequired(50, 'pix', 0)).toBe(true);
        expect(validateDepositPaymentMethodRequired(0, '', 0)).toBe(true); // sem sinal, não se aplica
        expect(validateDepositPaymentMethodRequired(50, '', 50)).toBe(true); // sinal já registrado antes — edição não exige de novo
    });
});

describe('AppointmentModal — payload envia total, sinal e forma de pagamento', () => {
    it('modal envia sessionValue=500, depositAmount=50 e depositPaymentMethod=pix', () => {
        const formData = {
            crm: { paymentAmount: 500 },
            depositAmount: 50,
            depositPaymentMethod: 'pix',
        };
        const result = buildDataToSaveDepositFields(formData, null);

        expect(result).toEqual({
            sessionValue: 500,
            paymentAmount: 500,
            depositAmount: 50,
            depositPaymentMethod: 'pix',
        });
    });

    it('fluxo sem sinal permanece idêntico ao legado — nenhum campo de sinal no payload', () => {
        const formData = {
            crm: { paymentAmount: 500 },
            depositAmount: 0,
            depositPaymentMethod: '',
        };
        const result = buildDataToSaveDepositFields(formData, null);

        expect(result).toEqual({ sessionValue: 500, paymentAmount: 500 });
        expect(result).not.toHaveProperty('depositAmount');
        expect(result).not.toHaveProperty('depositPaymentMethod');
    });

    it('não reenvia depositAmount ao editar um pré-agendamento que já tem sinal registrado', () => {
        const formData = {
            crm: { paymentAmount: 600 }, // total foi editado
            depositAmount: 50,
            depositPaymentMethod: 'pix',
        };
        const appointment = { depositAmount: 50 }; // já tinha sinal de 50 antes desta edição
        const result = buildDataToSaveDepositFields(formData, appointment);

        expect(result).toEqual({ sessionValue: 600, paymentAmount: 600 });
        expect(result).not.toHaveProperty('depositAmount');
    });
});

describe('AppointmentModal — impede duplo envio durante o processamento (submitLockRef)', () => {
    // Reproduz o guard real: `if (isLoading || submitLockRef.current) return;`
    // no topo de handleSubmit (AppointmentModal.jsx:621), lock setado ANTES de
    // qualquer await (linha 635) e limpo só no finally (linha 786) — garante
    // que um segundo clique síncrono (antes do primeiro setIsLoading re-renderizar)
    // ainda é bloqueado, o que `isLoading` sozinho (estado assíncrono) não garante.
    function makeGuardedSubmit(onSave) {
        const submitLockRef = { current: false };
        let isLoading = false;

        return async function handleSubmit() {
            if (isLoading || submitLockRef.current) return 'blocked';
            submitLockRef.current = true;
            isLoading = true;
            try {
                await onSave();
                return 'submitted';
            } finally {
                submitLockRef.current = false;
                isLoading = false;
            }
        };
    }

    it('duplo clique síncrono só dispara onSave uma vez', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        const handleSubmit = makeGuardedSubmit(onSave);

        const [first, second] = await Promise.all([handleSubmit(), handleSubmit()]);

        expect(onSave).toHaveBeenCalledTimes(1);
        expect([first, second].sort()).toEqual(['blocked', 'submitted']);
    });

    it('depois de concluir, um novo envio é permitido (lock foi liberado)', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        const handleSubmit = makeGuardedSubmit(onSave);

        await handleSubmit();
        await handleSubmit();

        expect(onSave).toHaveBeenCalledTimes(2);
    });
});
