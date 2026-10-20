import { describe, expect, it } from 'vitest';
import {
  normalizeAttendanceConfirmationStatus,
  resolveAttendanceConfirmation,
} from './attendanceConfirmation';

describe('attendanceConfirmation', () => {
  it.each([
    ['confirmed', 'confirmed'],
    ['Confirmado', 'confirmed'],
    ['cancelou', 'change_requested'],
    ['cancelled', 'change_requested'],
    ['solicitou alteração', 'change_requested'],
    ['verificar resposta', 'review_required'],
    ['sem resposta', 'no_response'],
    ['awaiting-response', 'no_response'],
    ['pending', 'pending'],
  ])('normaliza %s para %s', (input, expected) => {
    expect(normalizeAttendanceConfirmationStatus(input)).toBe(expected);
  });

  it('lê o contrato canônico', () => {
    expect(resolveAttendanceConfirmation({
      attendanceConfirmation: { status: 'confirmed', sentAt: '2026-10-19T12:00:00Z' },
    })).toMatchObject({ status: 'confirmed', sentAt: '2026-10-19T12:00:00Z' });
  });

  it('considera sem resposta somente depois que a mensagem foi enviada', () => {
    expect(resolveAttendanceConfirmation({ reminderSentAt: '2026-10-19T12:00:00Z' })?.status).toBe('no_response');
    expect(resolveAttendanceConfirmation({})).toBeNull();
  });

  it('usa pendente para agendamento persistido legado sem o campo', () => {
    expect(resolveAttendanceConfirmation({ id: 'appointment-1', operationalStatus: 'completed' })?.status).toBe('pending');
    expect(resolveAttendanceConfirmation({ id: 'free-slot', __isVirtual: true })).toBeNull();
  });
});

