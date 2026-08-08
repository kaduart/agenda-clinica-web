/**
 * 🚀 AGENDA V2 CLIENT ADAPTER
 * 
 * Única porta de entrada do frontend para o CRM.
 * Expõe os contratos canônicos do CRM. A criação de qualquer
 * agendamento usa /api/v2/appointments; `pre_agendado` é um estado
 * do Appointment, não uma entidade ou collection separada.
 */

import api from "../../services/api.js";
import {
    buildAppointmentPayload
} from "../../utils/appointmentPayload";

// ===============================
// 🔒 IDEMPOTENCY (ANTI DUP)
// ===============================
const getRequestId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

// ===============================
// 📅 APPOINTMENTS (V2 REAL)
// ===============================

export async function getAppointments(params = {}) {
    const response = await api.get("/api/v2/appointments", { params });
    return response.data;
}


export async function updateAppointment(id, rawData) {
    const payload = buildAppointmentPayload(rawData, { mode: "update", id });

    const response = await api.put(`/api/v2/appointments/${id}`, payload, {
        headers: { "x-client-request-id": getRequestId() },
        timeout: 30000
    });
    return response.data;
}

export async function adminEditAppointment(id, fields, adminReason) {
    const response = await api.patch(`/api/v2/appointments/${id}/admin-edit`, {
        ...fields,
        adminReason
    });
    return response.data;
}

export async function cancelAppointment(id, reason = "Cancelado via Web App", options = {}) {
    const response = await api.patch(`/api/v2/appointments/${id}/cancel`, {
        reason,
        confirmedAbsence: options.confirmedAbsence || false,
        notifyPatient: options.notifyPatient || false,
        forceCancel: options.forceCancel || false,
        reverseFinancial: options.reverseFinancial || false,
        ...(options.notes != null && { notes: options.notes }),
        ...(options.observations != null && { observations: options.observations }),
        ...(options.responsible != null && { responsible: options.responsible }),
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

export async function getAppointmentById(id) {
    const response = await api.get(`/api/v2/appointments/${id}`);
    return response.data;
}

export async function getAppointmentsByPatient(patientId, options = {}) {
    const { limit = 4, ...rest } = options;
    const response = await api.get("/api/v2/appointments", {
        params: { patientId, limit, ...rest }
    });
    return response.data;
}

export async function trackPostAppointmentStep(id, step) {
    const response = await api.patch(`/api/v2/appointments/${id}/post-appointment`, { step });
    return response.data;
}

export async function createAppointment(rawData) {
    const payload = buildAppointmentPayload(rawData, { mode: "create" });

    const response = await api.post("/api/v2/appointments", payload, {
        headers: { "x-client-request-id": getRequestId() },
        timeout: 30000
    });
    return response.data;
}

export async function rescheduleAppointment(id, rawData) {
    const payload = buildAppointmentPayload(rawData, { mode: "update", id });

    const response = await api.post(`/api/v2/appointments/${id}/reschedule`, payload, {
        headers: { "x-client-request-id": getRequestId() },
        timeout: 30000
    });
    return response.data;
}

// ===============================
// 📦 PACKAGES
// ===============================

export async function getPackages(params = {}) {
    const response = await api.get("/api/v2/packages", { params });
    return response.data;
}

export async function deletePackageSession(packageId, sessionId) {
    const response = await api.delete(`/api/v2/packages/${packageId}/sessions/${sessionId}`);
    return response.data;
}

export async function cancelPackageSession(packageId, sessionId, reason = "Cancelado via agenda") {
    const response = await api.patch(`/api/v2/packages/${packageId}/sessions/${sessionId}/cancel`, { reason });
    return response.data;
}

// ===============================
// 📆 CALENDAR DATA (appointments only)
// ===============================

export async function getCalendarData({ startDate, endDate, limit = 500, page = 1 }) {
    const appointmentsRes = await getAppointments({
        startDate,
        endDate,
        limit,
        page,
        includePreAgendamentos: true
    });
    // API legada pode retornar array direto ou { data: { appointments: [...] } }
    if (Array.isArray(appointmentsRes)) {
        return appointmentsRes;
    }
    return appointmentsRes?.data?.appointments || [];
}

// ===============================
// 👤 PATIENTS
// ===============================

export async function getPatients(params = {}) {
    const response = await api.get("/api/v2/patients", { params });
    return response.data;
}

export async function searchPatients(term, options = {}) {
    const response = await api.get("/api/v2/patients", {
        params: { search: term, limit: options.limit || 10, ...options }
    });
    const payload = response.data;
    if (Array.isArray(payload)) return payload;
    return payload?.data?.patients || [];
}

export async function updatePatient(id, data) {
    const response = await api.put(`/api/v2/patients/${id}`, data);
    return response.data;
}

// ===============================
// 👨‍⚕️ DOCTORS / PROFESSIONALS
// ===============================

export async function getActiveDoctors() {
    const response = await api.get("/api/v2/doctors/active");
    return response.data;
}

export async function createDoctor(payload) {
    const response = await api.post("/api/v2/doctors", payload);
    return response.data;
}

export async function deleteDoctor(id) {
    const response = await api.delete(`/api/v2/doctors/${id}`);
    return response.data;
}

// ===============================
// 🔔 REMINDERS
// ===============================

export async function getReminders(filters = {}) {
    const response = await api.get("/api/reminders", { params: filters });
    return response.data;
}

export async function getReminderById(id) {
    const response = await api.get(`/api/reminders/${id}`);
    return response.data;
}

export async function createReminder(payload) {
    const response = await api.post("/api/reminders", payload);
    return response.data;
}

export async function updateReminder(id, patch) {
    const response = await api.patch(`/api/reminders/${id}`, patch);
    return response.data;
}
