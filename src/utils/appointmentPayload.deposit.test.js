import { describe, expect, it } from 'vitest';
import { buildAppointmentPayload } from './appointmentPayload';

describe('buildAppointmentPayload - sinal recebido', () => {
    const base = {
        patientId: '507f1f77bcf86cd799439011',
        patientName: 'Paciente Teste',
        professionalId: '507f191e810c19729de860ea',
        specialty: 'neuroped',
        date: '2026-09-10',
        time: '14:00',
        billingType: 'particular',
        sessionValue: 500,
        paymentAmount: 500,
        paymentMethod: 'pix',
    };

    it('preserva valor total, sinal recebido e forma de pagamento na criacao', () => {
        const payload = buildAppointmentPayload({
            ...base,
            depositAmount: 50,
            depositPaymentMethod: 'pix',
        }, { mode: 'create' });

        expect(payload).toMatchObject({
            sessionValue: 500,
            depositAmount: 50,
            depositPaymentMethod: 'pix',
        });
    });

    it('nao envia sinal quando nao houve recebimento confirmado', () => {
        const payload = buildAppointmentPayload({ ...base, depositAmount: 0 }, { mode: 'create' });

        expect(payload).not.toHaveProperty('depositAmount');
        expect(payload).not.toHaveProperty('depositPaymentMethod');
        expect(payload.sessionValue).toBe(500);
    });

    it('permite registrar o primeiro sinal durante a edicao', () => {
        const payload = buildAppointmentPayload({
            ...base,
            depositAmount: 50,
            depositPaymentMethod: 'pix',
        }, { mode: 'update', id: 'appointment-1' });

        expect(payload.depositAmount).toBe(50);
        expect(payload.depositPaymentMethod).toBe('pix');
        expect(payload.sessionValue).toBe(500);
    });
});
