import { SPECIALTY_KEY_BY_LABEL } from "../config/specialties";

export const normalizeSpecialtyKey = (value) =>
    (value || "")
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_");

export const resolveSpecialtyKey = (aptOrLabel) => {
    if (!aptOrLabel) return "fonoaudiologia";

    // appointment object
    if (typeof aptOrLabel === "object") {
        if (aptOrLabel.specialtyKey) return aptOrLabel.specialtyKey;

        // 1️⃣ Prioriza a especialidade do AGENDAMENTO (specialty)
        const appointmentSpecialty = aptOrLabel.specialty;
        if (appointmentSpecialty) {
            const resolved =
                SPECIALTY_KEY_BY_LABEL[appointmentSpecialty] ||
                normalizeSpecialtyKey(appointmentSpecialty);
            if (resolved) return resolved;
        }

        // 2️⃣ Fallback: especialidade do médico/profissional
        if (aptOrLabel.doctor?.specialty) {
            const doctorSpecialty = aptOrLabel.doctor.specialty;
            return (
                SPECIALTY_KEY_BY_LABEL[doctorSpecialty] ||
                normalizeSpecialtyKey(doctorSpecialty) ||
                "fonoaudiologia"
            );
        }

        return "fonoaudiologia";
    }

    // label string
    return (
        SPECIALTY_KEY_BY_LABEL[aptOrLabel] ||
        normalizeSpecialtyKey(aptOrLabel) ||
        "fonoaudiologia"
    );
};
