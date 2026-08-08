import { describe, expect, it } from 'vitest';
import { buildAppointmentPayload } from './appointmentPayload';

describe('buildAppointmentPayload — envelope clientFields', () => {
    it('preserva o envelope para o contrato allowlisted do backend', () => {
        const clientFields = {
            responsible: 'Raquel',
            preferredPeriod: 'tarde',
            futureSimpleField: 'atravessa o frontend sem nova whitelist',
        };

        const payload = buildAppointmentPayload({
            patientId: '507f1f77bcf86cd799439011',
            patientName: 'Paciente Teste',
            professionalId: '507f191e810c19729de860ea',
            specialty: 'fonoaudiologia',
            date: '2026-08-10',
            time: '14:00',
            clientFields,
        });

        expect(payload.clientFields).toEqual(clientFields);
    });

    it('não inventa envelope para integrações que ainda não o enviam', () => {
        const payload = buildAppointmentPayload({
            patientId: '507f1f77bcf86cd799439011',
            patientName: 'Paciente Teste',
            professionalId: '507f191e810c19729de860ea',
            specialty: 'fonoaudiologia',
            date: '2026-08-10',
            time: '14:00',
        });

        expect(payload).not.toHaveProperty('clientFields');
    });
});
