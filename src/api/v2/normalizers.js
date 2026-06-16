/**
 * 🧭 NORMALIZERS V2
 *
 * Garante que todo payload enviado ao CRM esteja no formato correto.
 * Única fonte de verdade para tradução frontend ↔ backend.
 */

import { VALID_SERVICE_TYPES } from "../../utils/serviceType";

// ─── PAYMENT METHOD ─────────────────────────────────────────
// Frontend envia inglês, CRM V2 espera português
const PAYMENT_METHOD_MAP = {
    'credit_card': 'cartao_credito',
    'debit_card': 'cartao_debito',
    'cash': 'dinheiro',
    'pix': 'pix',
    'bank_transfer': 'transferencia_bancaria',
    'other': 'outro'
};

export const normalizePaymentMethod = (value) => {
    if (!value) return 'pix';
    const normalized = value.toLowerCase().trim();
    return PAYMENT_METHOD_MAP[normalized] || normalized;
};

// ─── SESSION TYPE (ESPECIALIDADE) ───────────────────────────
// NUNCA pode ser 'sessao' ou 'avaliacao'.
// Sempre deve ser a especialidade clínica real.
const VALID_SPECIALTIES = [
    'fonoaudiologia',
    'terapia_ocupacional',
    'psicologia',
    'neuropsicologia',
    'fisioterapia',
    'pediatria',
    'neuroped',
    'psicomotricidade',
    'musicoterapia',
    'psicopedagogia',
    'tongue_tie_test',
    'neuropsych_evaluation'
];

const SERVICE_TO_SPECIALTY = {
    'evaluation': 'fonoaudiologia',        // fallback seguro
    'session': 'fonoaudiologia',
    'individual_session': 'fonoaudiologia',
    'package_session': 'fonoaudiologia',
    'avaliacao': 'fonoaudiologia',
    'sessao': 'fonoaudiologia',
    'fonoaudiologia': 'fonoaudiologia',
    'terapia_ocupacional': 'terapia_ocupacional',
    'psicologia': 'psicologia',
    'neuropsicologia': 'neuropsicologia',
    'fisioterapia': 'fisioterapia',
    'pediatria': 'pediatria',
    'neuroped': 'neuroped',
    'psicomotricidade': 'psicomotricidade',
    'musicoterapia': 'musicoterapia',
    'psicopedagogia': 'psicopedagogia',
    'tongue_tie_test': 'tongue_tie_test',
    'neuropsych_evaluation': 'neuropsych_evaluation'
};

export const normalizeSessionType = (value, fallback = 'fonoaudiologia') => {
    if (!value) return fallback;
    const normalized = value.toLowerCase().trim();
    
    if (VALID_SPECIALTIES.includes(normalized)) {
        return normalized;
    }
    
    return SERVICE_TO_SPECIALTY[normalized] || fallback;
};

// ─── SERVICE TYPE ────────────────────────────────────────────
// Regra: o que já é um valor válido do enum (VALID_SERVICE_TYPES) é
// SEMPRE preservado como veio — nunca reescrito. Só traduzimos aliases
// legados em pt-BR. 'evaluation' é fallback apenas para lixo/vazio.
export const normalizeServiceType = (value) => {
    if (!value) return 'evaluation';
    const normalized = String(value).toLowerCase().trim();

    // Já é um valor válido do backend → respeita como está
    if (VALID_SERVICE_TYPES.includes(normalized)) {
        return normalized;
    }

    // Aliases legados / pt-BR
    if (normalized === 'consulta') return 'consultation';
    if (normalized === 'retorno') return 'return';
    if (normalized === 'sessao_avulsa') return 'individual_session';
    if (normalized === 'sessao') return 'session';
    if (normalized === 'avaliacao') return 'evaluation';

    return 'evaluation';
};

// ─── CRM BLOCO COMPLETO ─────────────────────────────────────
export const normalizeCrmBlock = (crm = {}, specialtyFallback) => {
    const serviceType = normalizeServiceType(crm?.serviceType);
    const sessionType = normalizeSessionType(crm?.sessionType || specialtyFallback);
    const paymentMethod = normalizePaymentMethod(crm?.paymentMethod);
    
    return {
        serviceType,
        sessionType,
        paymentMethod,
        paymentAmount: Number(crm?.paymentAmount || 0),
        usePackage: Boolean(crm?.usePackage)
    };
};

// ─── PATIENT INFO ───────────────────────────────────────────
export const normalizePatientInfo = (patientInfo = {}) => ({
    fullName: patientInfo.fullName?.trim() || '',
    phone: (patientInfo.phone || '').replace(/\D/g, ''),
    birthDate: patientInfo.birthDate || null,
    email: patientInfo.email?.trim() || null
});

// ─── TELEFONE BRASIL ────────────────────────────────────────
export const normalizePhone = (phone) => {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
};
