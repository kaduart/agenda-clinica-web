/**
 * 📅 APPOINTMENT RESPONSE DTO (V2)
 *
 * Desacopla o frontend do schema backend.
 * Toda resposta da API passa por aqui antes de tocar a UI.
 */

import { mapPatientResponseDTO, extractPatientName, extractPatientId } from './patient.response.dto';

export const extractDoctorId = (raw) => {
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    return raw.id || raw._id || raw.doctorId || raw.professionalId || '';
};

export const extractDoctorName = (raw) => {
    if (!raw) return 'Profissional';
    if (typeof raw === 'string') return raw || 'Profissional';
    return raw.fullName || raw.name || raw.nome || raw.professionalName || 'Profissional';
};

export const mapDoctorResponseDTO = (raw) => {
    const id = extractDoctorId(raw);
    const name = extractDoctorName(raw);
    return {
        id,
        name,
        fullName: name,
        specialty: raw?.specialty || raw?.sessionType || '',
        raw
    };
};

/**
 * @param {any} raw — objeto appointment vindo do backend
 * @returns {AppointmentDTO}
 */
export const mapAppointmentResponseDTO = (raw) => {
    if (!raw) return null;

    const rawDate = typeof raw.date === 'string' ? raw.date : (raw.date ? new Date(raw.date).toISOString() : '');
    const dateStr = rawDate.substring(0, 10);

    // Patient pode vir como objeto populado, string ID, ou via patientName/patientInfo
    const patientRaw = raw.patient || raw.patientInfo || { _id: raw.patientId, fullName: raw.patientName };
    const patient = mapPatientResponseDTO(patientRaw);

    // Doctor pode vir como objeto populado, string ID, ou via professionalName
    const doctorRaw = raw.doctor || raw.professional || { _id: raw.doctorId || raw.professionalId, fullName: raw.professionalName };
    const doctor = mapDoctorResponseDTO(doctorRaw);

    // Package
    const rawPackage = raw.package || null;
    const hasPackage = !!rawPackage || raw.serviceType === 'package_session';
    const packageObj = typeof rawPackage === 'object' && rawPackage !== null ? rawPackage : null;

    // Status de pagamento real (nunca confiar em paymentStatus solto)
    let paymentStatus = raw.payment?.status || raw.paymentStatus || 'unknown';
    if (paymentStatus === 'unknown' && hasPackage) {
        paymentStatus = 'package_paid';
    }

    return {
        id: raw._id?.toString() || raw.id || '',
        _id: raw._id?.toString() || raw.id || '',
        date: dateStr,
        time: raw.time || '',
        patient,
        patientName: patient.name,          // compatibilidade
        patientId: patient.id,              // compatibilidade
        phone: patient.phone || raw.phone || '',
        birthDate: patient.birthDate,
        email: patient.email,
        doctor,
        professional: doctor.name,          // compatibilidade
        professionalId: doctor.id,          // compatibilidade
        specialty: raw.specialty || raw.sessionType || '',
        operationalStatus: raw.operationalStatus || 'scheduled',
        status: translateStatus(raw.operationalStatus),
        billingType: raw.billingType || 'particular',
        insuranceProvider: raw.insuranceProvider || '',
        observations: raw.notes || raw.observations || '',
        duration: raw.duration || 40,
        visualFlag: raw.visualFlag || null,
        paymentStatus,
        payment: raw.payment || null,
        metadata: raw.metadata || null,
        crm: raw.crm || null,
        serviceType: raw.serviceType || null,
        sessionValue: raw.sessionValue || 0,
        paymentMethod: raw.paymentMethod || null,
        package: packageObj,
        hasPackage,
        responsible: raw.responsible || '',
        notes: raw.notes || '',
        originalAppointmentId: raw.originalAppointmentId || null,
        rescheduleReason: raw.rescheduleReason || '',
        rescheduledAt: raw.rescheduledAt || null,
        canceledAt: raw.canceledAt || null,
        cancelReason: raw.cancelReason || '',
        raw
    };
};

export const mapAppointmentListResponseDTO = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    return rawList.map(mapAppointmentResponseDTO).filter(Boolean);
};

// 🌐 Traduz status do backend para português
const translateStatus = (status) => {
    const statusMap = {
        'scheduled': 'Agendado',
        'agendado': 'Agendado',
        'confirmed': 'Confirmado',
        'pre_agendado': 'Pré-agendado',
        'pre_agendamento': 'Pré-agendamento',
        'canceled': 'Cancelado',
        'cancelado': 'Cancelado',
        'paid': 'Pago',
        'completed': 'Concluído',
        'missed': 'Faltou',
        'pending': 'Pendente',
        'processing_create': 'Processando',
        'processing_complete': 'Processando',
        'processing_cancel': 'Processando',
    };
    return statusMap[status] || status;
};
