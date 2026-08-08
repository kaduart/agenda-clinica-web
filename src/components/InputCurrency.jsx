/**
 * Campo de dinheiro no mesmo padrão do CRM (front/src/components/ui/InputCurrency.tsx).
 *
 * Por que não `type="number"`: o spinner permite incrementar de 0,01 em 0,01,
 * a roda do mouse altera o valor sem querer, e o separador decimal brasileiro
 * (vírgula) não é aceito de forma consistente entre navegadores.
 *
 * Aqui a digitação é só de dígitos, interpretados como centavos:
 *   "1"     → R$ 0,01
 *   "16000" → R$ 160,00
 *
 * Emite um evento sintético `{ target: { name, value: <number>, type: 'number' } }`,
 * compatível com o `handleChange` do modal — inclusive para nomes aninhados
 * como `crm.paymentAmount`.
 */
export default function InputCurrency({
    name,
    value,
    onChange,
    disabled = false,
    className = "",
    placeholder = "R$ 0,00",
    id,
}) {
    const safeValue = typeof value === "number" && !Number.isNaN(value) ? value : 0;

    const formattedValue = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(safeValue);

    const handleChange = (e) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        // Campo limpo precisa virar 0, não NaN — NaN se propagaria pro formData
        // e chegaria ao payload como valor inválido.
        const numericValue = rawValue ? parseFloat(rawValue) / 100 : 0;

        onChange({
            target: { name, value: numericValue, type: "number" },
        });
    };

    return (
        <input
            id={id || name}
            type="text"
            inputMode="numeric"
            name={name}
            value={formattedValue}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            className={className}
        />
    );
}
