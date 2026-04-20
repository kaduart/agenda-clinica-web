
import io from 'socket.io-client';
import { formatDateLocal } from "../utils/date";
import * as v2 from "../api/v2/agendaV2Client";
import { mapAppointmentResponseDTO, mapAppointmentListResponseDTO } from "../api/v2/appointment.response.dto";
// mapV2Appointment mantido para compatibilidade legada — use mapAppointmentResponseDTO preferencialmente

// Gerenciamento de Socket
let socket;

const getSocket = () => {
    if (!socket) {
        socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            transports: ['websocket'],
            autoConnect: true,
        });

        socket.on('connect', () => {
            console.log('🔌 Socket conectado:', socket.id);
        });

        socket.on('connect_error', (error) => {
            console.error('⚠️ Erro de conexão Socket:', error);
        });
    }
    return socket;
};

// Hook para notificações globais (Toasts)
export const listenToNotifications = (onNotification) => {
    const s = getSocket();

    const handleNewPre = (data) => {
        onNotification({
            type: 'pre_appointment',
            title: 'Novo Interesse!',
            message: `${data.patientName} tem interesse em ${data.specialty}`,
            data
        });
    };

    s.on('preagendamento:new', handleNewPre);

    return () => {
        s.off('preagendamento:new', handleNewPre);
    };
};

// 🔥 UNIFICAÇÃO: patient populado é a única fonte de verdade
const resolvePatientName = (a) => {
    const p = a.patient;
    if (p && typeof p === 'object') return p.fullName || p.name || null;
    if (a.patientName && typeof a.patientName === 'string') return a.patientName;
    return 'Paciente Desconhecido';
};

// 🌐 Traduz status do backend (inglês/português) para português
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

// NOTA: O backend V2 unificado NÃO retorna mais estados transitórios internos
// (ex: 'converted') no GET /appointments. O frontend não precisa filtrar.

// Mesmo algoritmo do backend getSafeProfessionalName
const resolveProfessionalName = (a) => {
    const d = a.doctor;
    if (d && typeof d === 'object') return d.fullName || d.name || null;
    if (a.professionalName) return a.professionalName;
    if (a.professional && typeof a.professional === 'string') return a.professional;
    return 'Profissional Desconhecido';
};

// Mapeia resposta V2 → formato que a agenda espera
const mapV2Appointment = (a) => {
    const rawDate = typeof a.date === 'string' ? a.date : (a.date ? new Date(a.date).toISOString() : '');
    const dateStr = rawDate.substring(0, 10);

    const patientName = resolvePatientName(a);
    const professional = resolveProfessionalName(a);

    const patientId = (a.patient && typeof a.patient === 'object') ? a.patient._id?.toString() : (a.patient || null);
    const phone = a.patient?.phone || '';
    const birthDate = a.patient?.dateOfBirth || null;
    const email = a.patient?.email || null;

    return {
        id: a._id?.toString() || a.id,
        _id: a._id?.toString() || a.id,
        date: dateStr,
        time: a.time,
        patientName,
        patient: patientName,
        patientId,
        phone,
        birthDate,
        email,
        professional,
        professionalId: (a.doctor && typeof a.doctor === 'object') ? a.doctor._id?.toString() : (a.doctor || null),
        specialty: a.specialty || a.sessionType || '',
        operationalStatus: a.operationalStatus,
        status: translateStatus(a.operationalStatus),
        billingType: a.billingType || 'particular',
        insuranceProvider: a.insuranceProvider || '',
        observations: a.notes || a.observations || '',
        duration: a.duration || 40,
        visualFlag: a.visualFlag || null,
        paymentStatus: a.paymentStatus || null,
        metadata: a.metadata || null,
        crm: a.crm || null,
        serviceType: a.serviceType || null,
        sessionValue: a.sessionValue || 0,
        paymentMethod: a.paymentMethod || null,
        package: a.package || null,
        responsible: a.responsible || '',
        notes: a.notes || '',
        originalAppointmentId: a.originalAppointmentId || null,
        rescheduleReason: a.rescheduleReason || '',
        rescheduledAt: a.rescheduledAt || null,
        canceledAt: a.canceledAt || null,
        cancelReason: a.cancelReason || '',
    };
};

export const listenAppointmentsForMonth = (year, month, onData, specificDate = null) => {
    let startDate, endDate;

    if (specificDate) {
        startDate = specificDate;
        endDate = specificDate;
        console.log(`[fetchAppointments] Data específica: ${startDate}`);
    } else {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        startDate = formatDateLocal(firstDay);
        endDate = formatDateLocal(lastDay);
        console.log(`[fetchAppointments] Range mensal: ${startDate} → ${endDate}`);
    }

    const fetchData = async () => {
        try {
            console.log(`[fetchAppointments] Buscando V2 + pré-agendamentos: ${startDate} a ${endDate}`);
            const merged = await v2.getCalendarData({ startDate, endDate, limit: 500, page: 1 });
            const list = mapAppointmentListResponseDTO(merged || []);
            console.log(`[fetchAppointments] Recebidos ${list.length} agendamentos (merge V2 + pré-agendamentos)`);
            onData(list);
        } catch (error) {
            console.error('[fetchAppointments] Erro:', error);
            onData([]);
        }
    };

    fetchData();

    const s = getSocket();

    const handleUpdate = (data) => {
        console.log('📡 Evento Socket recebido:', data);
        console.log('📡 Tipo de evento:', data?.type || 'desconhecido');
        console.log('📡 ID afetado:', data?._id || data?.id || 'não informado');
        console.log('🔄 Recarregando dados devido a evento socket...');
        fetchData();
    };

    s.on('appointmentCreated', handleUpdate);
    s.on('appointmentUpdated', handleUpdate);
    s.on('appointmentDeleted', handleUpdate);
    s.on('preagendamento:new', handleUpdate);
    s.on('preagendamento:updated', handleUpdate);
    s.on('preagendamento:imported', handleUpdate);
    s.on('preagendamento:discarded', handleUpdate);

    return () => {
        s.off('appointmentCreated', handleUpdate);
        s.off('appointmentUpdated', handleUpdate);
        s.off('appointmentDeleted', handleUpdate);
        s.off('preagendamento:new', handleUpdate);
        s.off('preagendamento:updated', handleUpdate);
        s.off('preagendamento:imported', handleUpdate);
        s.off('preagendamento:discarded', handleUpdate);
    };
};

export const hasConflict = (appointments, candidate, editingId) => {
    return (appointments || []).some((a) =>
        a.id !== editingId &&
        a.date === candidate.date &&
        a.time === candidate.time &&
        a.professional === candidate.professional &&
        !["canceled", "Cancelado"].includes(a.status || a.operationalStatus)
    );
};

// Helper para aguardar evento socket com timeout (mantido para referência)
// const waitForSocketEvent = (eventName, targetId, timeoutMs = 5000) => { ... };

// ===========================================================
// 📅 CREATE / UPDATE APPOINTMENTS (ADAPTER V2)
// ===========================================================

export const updateAppointmentDirect = async (appointmentId, appointmentData) => {
    console.log("📝 [appointmentsRepo] updateAppointmentDirect - ID:", appointmentId);
    const data = await v2.updateAppointment(appointmentId, appointmentData);
    console.log('[updateAppointmentDirect] ✅ Sucesso:', data);
    return { mode: "update", id: appointmentId, data };
};

export const rescheduleAppointmentDirect = async (appointmentId, appointmentData) => {
    console.log("📝 [appointmentsRepo] rescheduleAppointmentDirect - ID original:", appointmentId);
    try {
        const data = await v2.rescheduleAppointment(appointmentId, appointmentData);
        console.log('[rescheduleAppointmentDirect] ✅ Sucesso:', data);
        // Backend pode retornar novo appointment com ID diferente (cadeia de remarcação)
        const newId = data?.data?.appointment?._id || data?.data?.appointment?.id || data?.data?._id || data?._id || appointmentId;
        return { mode: "reschedule", id: newId, originalId: appointmentId, data };
    } catch (err) {
        // Fallback: se backend ainda não tem endpoint /reschedule, usa update normal
        if (err.response?.status === 404) {
            console.warn("⚠️ [rescheduleAppointmentDirect] Endpoint /reschedule não encontrado. Fallback para update.");
            return updateAppointmentDirect(appointmentId, appointmentData);
        }
        throw err;
    }
};

export const upsertAppointment = async ({ editingAppointment, appointmentData }) => {
    console.log("📝 [appointmentsRepo] upsertAppointment chamado");
    
    const isEditing = editingAppointment?.id && !editingAppointment.id.startsWith('ext_');
    const appointmentId = isEditing ? editingAppointment.id : null;
    
    console.log("📝 [appointmentsRepo] isEditing:", isEditing);
    console.log("📝 [appointmentsRepo] appointmentId:", appointmentId);

    if (isEditing) {
        console.log("📝 [appointmentsRepo] Usando updateAppointmentDirect para edição");
        return updateAppointmentDirect(appointmentId, appointmentData);
    }

    console.log("[upsertAppointment] Criando appointment direto via API V2...");
    const res = await v2.createAppointment(appointmentData);

    const createdId = res?.data?._id || res?.data?.id || res?._id || res?.id;
    console.log(`[upsertAppointment] ✅ Appointment criado: ${createdId}`);

    return { mode: "create", id: createdId, status: res?.data?.operationalStatus || "pre_agendado" };
};

export const confirmAppointment = async (appointmentId, appointmentData) => {
    console.log("✅ [appointmentsRepo] confirmAppointment chamado:", appointmentId);
    const res = await v2.updateAppointment(appointmentId, {
        ...appointmentData,
        operationalStatus: "scheduled",
    });
    console.log(`[confirmAppointment] ✅ Confirmado: ${appointmentId}`);
    return { mode: "confirm", id: appointmentId, data: res };
};

export const cancelAppointment = async (id, reason = "Cancelado via Web App", options = {}) => {
    console.log(`[cancelAppointment] Cancelando via API V2: ${id}`);
    return v2.cancelAppointment(id, reason, options);
};

export const deleteAppointment = cancelAppointment;

export const hardDeleteAppointment = async (id) => {
    console.log(`[hardDeleteAppointment] Excluindo permanentemente: ${id}`);
    return v2.deleteAppointment(id);
};

export const createCycleId = () => `cyc_${Date.now()}`;

export const fetchAvailableSlots = async (doctorId, date) => {
    return v2.getAvailableSlots({ doctorId, date });
};

export const fetchAppointmentsInRange = async (startDate, endDate) => {
    const data = await v2.getCalendarData({ startDate, endDate, limit: 500, page: 1 });
    return mapAppointmentListResponseDTO(data || []);
};

export const generateCycleAppointments = async (baseAppointment, payload, opts = {}) => {
    console.warn("⚠️ Geração de ciclo via API (em loop) - pode ser lento");
    const { selectedSlots } = payload;
    const createdIds = [];
    const skipped = [];

    const startDate = payload.cycleStartDate;
    const endDate = payload.cycleEndDate;
    const existing = await fetchAppointmentsInRange(startDate, endDate);

    for (const slot of selectedSlots) {
        if (opts.skipConflicts) {
            const conflict = hasConflict(existing, {
                date: slot.date,
                time: slot.time,
                professional: baseAppointment.professional
            }, null);
            if (conflict) {
                skipped.push(slot);
                continue;
            }
        }

        const apptData = {
            ...baseAppointment,
            date: slot.date,
            time: slot.time,
            observations: (baseAppointment.observations || "") + `\n[Ciclo Automático]`
        };

        try {
            const res = await upsertAppointment({ appointmentData: apptData });
            createdIds.push(res.id);
        } catch (e) {
            console.error(`Erro ao criar item do ciclo ${slot.date}:`, e);
        }
    }

    return { createdCount: createdIds.length, createdIds, skipped };
};

export const cancelCycle = async (cycleId) => {
    console.warn("Cancelamento de ciclo em lote não implementado na V1 da API.");
};

export const deleteCycle = async (cycleId) => {
    console.warn("Deleção de ciclo em lote não implementado na V1 da API.");
};

// ===========================================================
// 🔁 SINCRONIZAÇÃO: Remove sessão do pacote ao excluir appointment
// ===========================================================
export const syncDeleteWithPackage = async (appointmentId, patientId) => {
    if (!patientId) return { synced: false, reason: 'no_patient_id' };
    try {
        const packagesRes = await v2.getPackages({ patientId, limit: 100 });
        const packages = packagesRes?.data?.packages || packagesRes?.packages || [];
        if (!packages.length) return { synced: false, reason: 'no_packages' };

        for (const pkg of packages) {
            const session = (pkg.sessions || []).find(s => s.appointmentId === appointmentId);
            if (session && session.sessionId) {
                console.log(`[syncDeleteWithPackage] Removendo sessão ${session.sessionId} do pacote ${pkg._id || pkg.packageId}`);
                try {
                    await v2.deletePackageSession(pkg._id || pkg.packageId, session.sessionId);
                    return { synced: true, packageId: pkg._id || pkg.packageId, sessionId: session.sessionId };
                } catch (deleteErr) {
                    console.warn(`[syncDeleteWithPackage] Falha ao deletar sessão, tentando cancelar:`, deleteErr.message);
                    try {
                        await v2.cancelPackageSession(pkg._id || pkg.packageId, session.sessionId);
                        return { synced: true, packageId: pkg._id || pkg.packageId, sessionId: session.sessionId, mode: 'cancel' };
                    } catch (cancelErr) {
                        console.error(`[syncDeleteWithPackage] Falha ao cancelar sessão:`, cancelErr.message);
                        return { synced: false, reason: 'delete_and_cancel_failed' };
                    }
                }
            }
        }
        return { synced: false, reason: 'session_not_found' };
    } catch (error) {
        console.error("[syncDeleteWithPackage] Erro:", error);
        return { synced: false, reason: 'error', error: error.message };
    }
};

// ===========================================================
// 🔄 RESTAURAR APPOINTMENT DE SESSÃO DE PACOTE
// ===========================================================
export const restoreAppointmentFromSession = async (sessionData) => {
    console.log("[restoreAppointmentFromSession] Restaurando appointment:", sessionData);
    return v2.recreateAppointmentFromSession(sessionData);
};

// ===========================================================
// 🛡️ PROTEÇÃO: Impede exclusão do primeiro ponto de um pacote
// ===========================================================
export const isFirstPackagePoint = async (appointmentId, patientId) => {
    if (!patientId) return false;
    try {
        const res = await v2.getAppointments({ patientId, limit: 500 });
        const patientAppointments = res?.data?.appointments || [];
        const packageAppointments = patientAppointments.filter(a => a.package);

        packageAppointments.sort((a, b) => {
            const dateA = new Date(`${a.date || a.preferredDate || '1970-01-01'}T${a.time || a.preferredTime || '00:00'}`);
            const dateB = new Date(`${b.date || b.preferredDate || '1970-01-01'}T${b.time || b.preferredTime || '00:00'}`);
            return dateA - dateB;
        });

        if (packageAppointments.length === 0) return false;
        const firstId = packageAppointments[0]._id?.toString() || packageAppointments[0].id;
        return firstId === appointmentId;
    } catch (error) {
        console.error("[isFirstPackagePoint] Erro ao verificar:", error);
        return false;
    }
};

// ===========================================================
// ✅ CONFIRMATIONS (ADAPTER V2)
// ===========================================================

export const confirmPresence = async (id) => {
    console.log(`[confirmPresence] Confirmando presença/manual para: ${id}`);
    return v2.confirmAppointmentPresence(id);
};
