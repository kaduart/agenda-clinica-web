/**
 * @fileoverview Appointment Payload Builder (DTO)
 *
 * Regra de ouro: NUNCA espalhar dados crus (rawData) direto na API.
 * Todas as chamadas de create/update devem passar por aqui.
 *
 * Isso garante:
 * - patient nunca é enviado como string (somente patientId ObjectId)
 * - Campos de UI (patientName) são mapeados para patientInfo
 * - Payload é previsível e tipado implicitamente
 */

import { normalizeCrmBlock, normalizePatientInfo, normalizeSessionType } from "../api/v2/normalizers";

/**
 * Resolve o nome do paciente de forma segura, ignorando IDs ou lixo.
 */
function resolvePatientName(raw) {
    const name = raw.patientName || raw.patient || "";
    if (!name || name === "Paciente Desconhecido") return "";
    // Se por acidente vier um ObjectId como "patient", ignora
    if (/^[0-9a-f]{24}$/i.test(name)) return "";
    return name.trim();
}

/**
 * Constrói payload padronizado para API de agendamentos.
 * @param {object} raw - dados crus vindos de formulários, modais, etc.
 * @param {object} options
 * @param {string} options.mode - 'create' | 'update'
 * @param {string} [options.id] - id para update
 */
export function buildAppointmentPayload(raw, options = {}) {
    if (!raw || typeof raw !== "object") {
        throw new Error("[buildAppointmentPayload] rawData inválido");
    }

    const { mode = "create", id } = options;
    const crm = normalizeCrmBlock(raw.crm, raw.specialty);
    const patientName = resolvePatientName(raw);

    // --- Paciente ---
    const patientId = raw.patientId || raw.patient?._id || raw.patient?.id || null;
    const isNewPatient = !!raw.isNewPatient;

    const patientInfo = normalizePatientInfo({
        fullName: patientName,
        phone: raw.phone || raw.patientInfo?.phone || "",
        birthDate: raw.birthDate || raw.patientInfo?.birthDate || null,
        email: raw.email || raw.patientInfo?.email || null,
    });

    // --- Profissional ---
    const professionalName = raw.professionalName || raw.professional || "";
    const doctorId = raw.professionalId || raw.doctorId || "";

    // --- Especialidade / Serviço ---
    const specialty = normalizeSessionType(raw.specialty || raw.specialtyKey || crm.sessionType);

    // --- Datas ---
    const date = raw.date || "";
    const time = raw.time || "";
    const duration = Number(raw.duration) || 40;

    // --- Status ---
    const operationalStatus = raw.operationalStatus || "scheduled";

    // --- Observações ---
    const notes = raw.observations || raw.notes || "";

    // --- Financeiro ---
    const paymentStatus = raw.paymentStatus || "pending";
    const billingType = raw.billingType || "particular";
    const insuranceProvider = raw.insuranceProvider || "";
    const insuranceValue = Number(raw.insuranceValue) || 0;
    const authorizationCode = raw.authorizationCode || "";
    const sessionValue = Number(raw.sessionValue ?? raw.paymentAmount ?? crm.paymentAmount ?? 0);
    const paymentMethod = raw.paymentMethod || crm.paymentMethod || "pix";
    const paymentAmount = Number(raw.paymentAmount ?? crm.paymentAmount ?? 0);

    // --- Pacote ---
    const packageInfo = raw.package || null;

    // --- Responsável ---
    const responsible = raw.responsible || "";

    // --- CRM ---
    const crmBlock = {
        serviceType: crm.serviceType || raw.serviceType || "session",
        sessionType: crm.sessionType || raw.sessionType || specialty,
        paymentMethod: crm.paymentMethod || paymentMethod,
        paymentAmount: crm.paymentAmount ?? paymentAmount,
        usePackage: !!crm.usePackage,
    };

    // --- Flags visuais ---
    const visualFlag = raw.visualFlag || null;

    // --- Metadados ---
    const metadata = raw.metadata || { origin: { source: "web_app" } };

    // --- Monta payload base (SEMPRE explícito, NUNCA spread de raw) ---
    const payload = {
        patientId,
        isNewPatient,
        patientInfo,
        professionalName,
        doctorId,
        specialty,
        date,
        time,
        duration,
        operationalStatus,
        notes,
        serviceType: crmBlock.serviceType,
        sessionType: crmBlock.sessionType,
        paymentMethod: crmBlock.paymentMethod,
        paymentAmount: crmBlock.paymentAmount,
        sessionValue,
        crm: crmBlock,
        paymentStatus,
        billingType,
        insuranceProvider,
        insuranceValue,
        authorizationCode,
        package: packageInfo,
        responsible,
        visualFlag,
        metadata,
    };

    // --- Remarcação ---
    if (raw.rescheduleReason) {
        payload.rescheduleReason = raw.rescheduleReason;
    }

    // --- Campos específicos por modo ---
    if (mode === "update") {
        const updateId = id || raw.id || raw._id || "";
        payload._id = updateId;
        payload.id = updateId;   // compatibilidade com backends que esperam id (sem underscore)
    }

    // Remove campos undefined/null desnecessários (mas mantém null quando faz sentido)
    // Nota: não removemos null de patientId porque null é válido (paciente novo)
    Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
            delete payload[key];
        }
    });

    return payload;
}

/**
 * Sanitiza dados de pré-agendamento.
 * Mesma filosofia: nunca confiar no raw.
 */
export function buildPreAppointmentPayload(raw) {
    if (!raw || typeof raw !== "object") {
        throw new Error("[buildPreAppointmentPayload] rawData inválido");
    }

    const patientName = resolvePatientName(raw);
    const patientId = raw.patientId || null;

    return {
        patientId,
        isNewPatient: !!raw.isNewPatient,
        patientInfo: normalizePatientInfo({
            fullName: patientName,
            phone: raw.phone || "",
            birthDate: raw.birthDate || null,
            email: raw.email || null,
        }),
        professionalName: raw.professionalName || raw.professional || "",
        doctorId: raw.professionalId || raw.doctorId || "",
        specialty: normalizeSessionType(raw.specialty || raw.specialtyKey),
        preferredDate: raw.preferredDate || raw.date || "",
        preferredTime: raw.preferredTime || raw.time || "",
        notes: raw.observations || raw.notes || "",
        operationalStatus: "pre_agendado",
    };
}
