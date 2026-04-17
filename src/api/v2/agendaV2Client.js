/**
 * 🚀 AGENDA V2 CLIENT ADAPTER
 * 
 * Única porta de entrada do frontend para o CRM.
 * Expõe API V2 limpa, mas internamente chama os endpoints
 * que existem hoje em produção (com fallback seguro).
 * 
 * Quando backend criar /api/v2/pre-appointments,
 * basta trocar a URL interna — zero mudança no resto do frontend.
 */

import api from "../../services/api.js";
import {
    normalizeCrmBlock,
    normalizePatientInfo,
    normalizePhone,
    normalizeSessionType
} from "./normalizers";

// ===============================
// 🔒 IDEMPOTENCY (ANTI DUP)
// ===============================
const getRequestId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

// ===============================
// 📅 PRE-APPOINTMENTS
// ===============================
// Nota: backend ainda não tem /api/v2/pre-appointments.
// Usamos os endpoints legados existentes, mas normalizados.

export async function createPreAppointment(rawData) {
    const crm = normalizeCrmBlock(rawData.crm, rawData.specialty);
    const patientInfo = normalizePatientInfo(rawData.patientInfo);
    const payload = {
        patientId: rawData.patientId || null,
        patientInfo,
        preferredDate: rawData.date,
        preferredTime: rawData.time,
        specialty: normalizeSessionType(rawData.specialty || crm.sessionType),
        notes: rawData.observations || "",
        professionalName: rawData.professionalName || rawData.professional || "",
        doctorId: rawData.doctorId || rawData.professionalId || ""
    };

    const response = await api.post("/api/v2/pre-appointments", payload, {
        headers: { "x-client-request-id": getRequestId() }
    });
    return response.data;
}

export async function listPreAppointments(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.specialty) params.append("specialty", filters.specialty);
    if (filters.preferredDate) {
        params.append("from", filters.preferredDate);
        params.append("to", filters.preferredDate);
    }
    if (filters.phone) params.append("phone", filters.phone);
    const response = await api.get(`/api/v2/pre-appointments?${params.toString()}`);
    return response.data?.data || [];
}

export async function confirmPreAppointment(id, rawData) {
    const crm = normalizeCrmBlock(rawData?.crm, rawData?.specialty);
    const payload = {
        doctorId: rawData?.doctorId || rawData?.professionalId,
        date: rawData?.date,
        time: rawData?.time,
        sessionValue: Number(rawData?.sessionValue ?? rawData?.crm?.paymentAmount ?? 0),
        paymentMethod: crm.paymentMethod,
        serviceType: crm.serviceType,
        notes: rawData?.notes || rawData?.observations || "",
        // Dados do paciente (obrigatórios quando o backend precisa criar novo paciente)
        patientId: rawData?.patientId || null,
        isNewPatient: rawData?.isNewPatient || false,
        patientName: rawData?.patientName || rawData?.patient || null,
        birthDate: rawData?.birthDate || null,
        phone: rawData?.phone || null,
        email: rawData?.email || null,
        responsible: rawData?.responsible || null,
        crm
    };

    const response = await api.post(`/api/v2/pre-appointments/${id}/confirm`, payload, {
        headers: { "x-client-request-id": getRequestId() }
    });
    return response.data;
}

export async function updatePreAppointment(id, rawData) {
    const response = await api.patch(`/api/v2/pre-appointments/${id}`, rawData);
    return response.data;
}

export async function discardPreAppointment(id, reason) {
    const response = await api.post(`/api/v2/pre-appointments/${id}/discard`, { reason });
    return response.data;
}

export async function cancelPreAppointment(id) {
    const response = await api.post(`/api/v2/pre-appointments/${id}/cancel`);
    return response.data;
}

// ===============================
// 📅 APPOINTMENTS (V2 REAL)
// ===============================

export async function getAppointments(params = {}) {
    const response = await api.get("/api/v2/appointments", { params });
    return response.data;
}

export async function updateAppointment(id, rawData) {
    const crm = normalizeCrmBlock(rawData.crm, rawData.specialty);

    // 🔥 UNIFICAÇÃO: usa patient populado como fonte única de nome
    const resolvedName = (() => {
        const name = rawData.patientName || rawData.patient || '';
        return (name && name !== 'Paciente Desconhecido' && !/^[0-9a-f]{24}$/i.test(name)) ? name : '';
    })();

    const payload = {
        ...rawData,
        _id: id,
        patientInfo: normalizePatientInfo({
            fullName: resolvedName,
            phone: rawData.phone || '',
            birthDate: rawData.birthDate || null,
            email: rawData.email || null,
        }),
        professionalName: rawData.professionalName || rawData.professional || "",
        doctorId: rawData.professionalId || rawData.doctorId || "",
        specialty: normalizeSessionType(rawData.specialty || crm.sessionType),
        serviceType: crm.serviceType,
        sessionType: crm.sessionType,
        paymentMethod: crm.paymentMethod,
        paymentAmount: crm.paymentAmount,
        sessionValue: crm.paymentAmount,
        crm,
    };

    const response = await api.put(`/api/v2/appointments/${id}`, payload, {
        headers: { "x-client-request-id": getRequestId() },
        timeout: 30000
    });
    return response.data;
}

export async function cancelAppointment(id, reason = "Cancelado via Web App", options = {}) {
    const response = await api.patch(`/api/v2/appointments/${id}/cancel`, {
        reason,
        confirmedAbsence: options.confirmedAbsence || false,
        notifyPatient: options.notifyPatient || false
    });
    return response.data;
}

export async function deleteAppointment(id) {
    const response = await api.delete(`/api/v2/appointments/${id}`);
    return response.data;
}

export async function confirmAppointmentPresence(id) {
    const response = await api.patch(`/api/v2/appointments/${id}/confirm`);
    return response.data;
}

export async function getAvailableSlots({ doctorId, date }) {
    const response = await api.get("/api/v2/appointments/available-slots", {
        params: { doctorId, date }
    });
    return response.data;
}

// ===============================
// 📆 CALENDAR DATA (appointments only)
// ===============================

export async function getCalendarData({ startDate, endDate, limit = 500, page = 1 }) {
    const appointmentsRes = await getAppointments({ startDate, endDate, limit, page });
    return appointmentsRes?.data?.appointments || [];
}

// ===============================
// 🗓️ WEEKLY AVAILABILITY
// ===============================

export async function getWeeklyAvailability({ startDate, specialty, days = 7 }) {
    const params = new URLSearchParams({ startDate, specialty, days: String(days) });
    const response = await api.get(`/api/v2/appointments/weekly-availability?${params.toString()}`);
    return response.data;
}
