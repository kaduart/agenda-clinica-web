// Máscara de telefone BR — aceita fixo (10 dígitos) e celular (11 dígitos)

export const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

/**
 * Formata para exibição: (62) 9918-0547 / (62) 99180-5470
 * Formata parcialmente enquanto o usuário digita.
 */
export const formatPhoneBR = (value) => {
    const digits = onlyDigits(value).slice(0, 11);

    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

/**
 * Valida telefone BR.
 *
 * O caso que motivou isto: celular com um dígito faltando fica com 10 dígitos e
 * passa a ser exibido no formato de fixo — "(62) 9920-1357". Só checar o
 * comprimento mínimo aceitava esse número quebrado.
 *
 * Regra do 9º dígito: celular tem 9 dígitos após o DDD e sempre começa com 9.
 * Logo, 10 dígitos começando com 9 é celular truncado, não um fixo válido.
 *
 * Prefixo de fixo não é validado de propósito — cadastros antigos têm números
 * legados iniciados em 6/7/8, e rejeitá-los quebraria dado existente.
 *
 * @returns {{ valid: boolean, reason: string|null }}
 */
export const validatePhoneBR = (value) => {
    const digits = onlyDigits(value);

    if (!digits) {
        return { valid: false, reason: "Telefone é obrigatório" };
    }
    if (digits.length < 10) {
        return { valid: false, reason: "Telefone incompleto — informe DDD + número" };
    }
    if (digits.length > 11) {
        return { valid: false, reason: "Telefone com dígitos demais" };
    }
    if (Number(digits.slice(0, 2)) < 11) {
        return { valid: false, reason: "DDD inválido" };
    }

    const afterDdd = digits[2];

    if (digits.length === 10 && afterDdd === "9") {
        return { valid: false, reason: "Celular incompleto: falta 1 dígito (celular tem 9 após o DDD)" };
    }
    if (digits.length === 11 && afterDdd !== "9") {
        return { valid: false, reason: "Celular com 11 dígitos deve começar com 9 após o DDD" };
    }

    return { valid: true, reason: null };
};
