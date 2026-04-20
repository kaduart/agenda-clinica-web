/**
 * 🧬 PATIENT RESPONSE DTO (V2)
 *
 * Desacopla o frontend do schema backend.
 * Toda resposta da API passa por aqui antes de tocar a UI.
 */

export const extractPatientId = (raw) => {
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    return raw.id || raw._id || raw.patientId || '';
};

export const extractPatientName = (raw) => {
    if (!raw) return 'Paciente';
    if (typeof raw === 'string') return raw || 'Paciente';
    return raw.fullName || raw.name || raw.nome || raw.patientName || 'Paciente';
};

export const extractPatientPhone = (raw) => {
    if (!raw) return '';
    if (typeof raw === 'string') return '';
    return raw.phone || raw.phoneNumber || raw.telefone || raw.whatsapp || '';
};

export const extractPatientBirthDate = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'string') return null;
    return raw.dateOfBirth || raw.birthDate || raw.dataNascimento || null;
};

export const extractPatientEmail = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'string') return null;
    return raw.email || raw.mail || null;
};

/**
 * @param {any} raw — objeto patient vindo do backend (pode ser string ID, objeto populado, etc.)
 * @returns {PatientDTO}
 */
export const mapPatientResponseDTO = (raw) => {
    const id = extractPatientId(raw);
    const name = extractPatientName(raw);
    const phone = extractPatientPhone(raw);
    const birthDate = extractPatientBirthDate(raw);
    const email = extractPatientEmail(raw);

    return {
        id,
        name,
        fullName: name,         // alias para compatibilidade
        phone,
        birthDate,
        email,
        // Campos financeiros (quando disponíveis no backend)
        debt: Number(raw?.debt || raw?.balance?.current || raw?.totalPendingParticular || 0),
        totalPending: Number(raw?.totalPending || raw?.totalPendingAll || 0),
        particularPending: Number(raw?.particularPending || raw?.totalPendingParticular || 0),
        convenioPending: Number(raw?.convenioPending || raw?.totalPendingConvenio || 0),
        // Estatísticas
        totalAppointments: Number(raw?.totalAppointments || raw?.stats?.totalAppointments || 0),
        totalCompleted: Number(raw?.totalCompleted || raw?.stats?.totalCompleted || 0),
        totalCanceled: Number(raw?.totalCanceled || raw?.stats?.totalCanceled || 0),
        totalNoShow: Number(raw?.totalNoShow || raw?.stats?.totalNoShow || 0),
        totalPackages: Number(raw?.totalPackages || raw?.stats?.totalPackages || 0),
        raw
    };
};

export const mapPatientListResponseDTO = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    return rawList.map(mapPatientResponseDTO);
};
