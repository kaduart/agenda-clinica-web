import {
    normalizePaymentMethod,
    normalizeSessionType,
    normalizeServiceType,
    normalizeCrmBlock
} from './src/api/v2/normalizers.js';

const tests = [
    { fn: normalizePaymentMethod, input: 'credit_card', expected: 'cartao_credito' },
    { fn: normalizePaymentMethod, input: 'debit_card', expected: 'cartao_debito' },
    { fn: normalizePaymentMethod, input: 'cash', expected: 'dinheiro' },
    { fn: normalizePaymentMethod, input: 'pix', expected: 'pix' },
    { fn: normalizeSessionType, input: 'sessao', expected: 'fonoaudiologia' },
    { fn: normalizeSessionType, input: 'avaliacao', expected: 'fonoaudiologia' },
    { fn: normalizeSessionType, input: 'terapia_ocupacional', expected: 'terapia_ocupacional' },
    { fn: normalizeServiceType, input: 'package_session', expected: 'session' },
    { fn: normalizeServiceType, input: 'individual_session', expected: 'evaluation' },
    { fn: normalizeCrmBlock, input: { crm: { serviceType: 'package_session', sessionType: 'sessao', paymentMethod: 'credit_card' }, specialty: 'fonoaudiologia' }, expected: { serviceType: 'session', sessionType: 'fonoaudiologia', paymentMethod: 'cartao_credito', paymentAmount: 0, usePackage: false } },
];

let passed = 0;
let failed = 0;

for (const t of tests) {
    const result = t.fn.name === 'normalizeCrmBlock'
        ? normalizeCrmBlock(t.input.crm, t.input.specialty)
        : t.fn(t.input);
    
    const ok = JSON.stringify(result) === JSON.stringify(t.expected);
    if (ok) {
        passed++;
        console.log(`✅ ${t.fn.name}(${t.input}) → ${JSON.stringify(result)}`);
    } else {
        failed++;
        console.log(`❌ ${t.fn.name}(${t.input})`);
        console.log(`   expected: ${JSON.stringify(t.expected)}`);
        console.log(`   got:      ${JSON.stringify(result)}`);
    }
}

console.log(`\n${passed} passed, ${failed} failed`);
