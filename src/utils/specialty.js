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
        const label = aptOrLabel.specialty;
        return (
            SPECIALTY_KEY_BY_LABEL[label] ||
            normalizeSpecialtyKey(label) ||
            "fonoaudiologia"
        );
    }

    // label string
    return (
        SPECIALTY_KEY_BY_LABEL[aptOrLabel] ||
        normalizeSpecialtyKey(aptOrLabel) ||
        "fonoaudiologia"
    );
};
