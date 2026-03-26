
import api from "./api";
import io from 'socket.io-client';
import { formatDateLocal } from "../utils/date";

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

export const listenAppointmentsForMonth = (year, month, onData, specificDate = null) => {
    let startDate, endDate;
    
    // Se tiver data específica, busca apenas aquele dia
    if (specificDate) {
        startDate = specificDate;
        endDate = specificDate;
        console.log(`[fetchAppointments] Data específica: ${startDate}`);
    } else {
        // Busca o mês inteiro
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        startDate = formatDateLocal(firstDay);
        endDate = formatDateLocal(lastDay);
        console.log(`[fetchAppointments] Range mensal: ${startDate} → ${endDate}`);
    }

    // Função interna para buscar dados
    const fetchData = async () => {
        try {
            console.log(`[fetchAppointments] Buscando: ${startDate} a ${endDate}`);
            const response = await api.get('/api/appointments', {
                params: {
                    startDate,
                    endDate,
                    limit: 1000 // Garantir que venha tudo do mês
                }
            });

            // O backend retorna um array de calendarEvents já formatado
            // O frontend espera { id, ...campos }
            // O backend /api/appointments já retorna [{ id: "...", title: "...", start: "...", ... }]
            const list = response.data;
            console.log(`[fetchAppointments] Recebidos ${list.length} agendamentos:`, list.map(a => `${a.date} ${a.time} ${a.patientName}`));
            onData(list);
        } catch (error) {
            console.error('[fetchAppointments] Erro:', error);
            onData([]);
        }
    };

    // 1. Busca inicial
    fetchData();

    // 2. Configura Socket Listener para atualizações em tempo real
    const s = getSocket();

    const handleUpdate = (data) => {
        console.log('📡 Evento Socket recebido:', data);
        console.log('📡 Tipo de evento:', data?.type || 'desconhecido');
        console.log('📡 ID afetado:', data?._id || data?.id || 'não informado');
        // Estratégia simples: recarregar o mês inteiro em qualquer mudança
        // Isso garante consistência sem complexidade de merge no frontend
        console.log('🔄 Recarregando dados devido a evento socket...');
        fetchData();
    };

    s.on('appointmentCreated', handleUpdate);
    s.on('appointmentUpdated', handleUpdate);
    s.on('appointmentDeleted', handleUpdate);
    s.on('preagendamento:new', handleUpdate); // Se a agenda mostrar pré-agendamentos
    s.on('preagendamento:updated', handleUpdate);
    s.on('preagendamento:imported', handleUpdate);
    s.on('preagendamento:discarded', handleUpdate); // Quando descarta um pré-agendamento

    // Retorna função de limpeza
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
    // Mantido lógica local para feedback rápido, mas o backend valida também
    return (appointments || []).some((a) =>
        a.id !== editingId &&
        a.date === candidate.date &&
        a.time === candidate.time &&
        a.professional === candidate.professional &&
        !["canceled", "Cancelado"].includes(a.status || a.operationalStatus)
    );
};

// Helper para aguardar evento socket com timeout
const waitForSocketEvent = (eventName, targetId, timeoutMs = 5000) => {
    return new Promise((resolve) => {
        const s = getSocket();
        let timer;
        
        const handler = (data) => {
            // Verifica se é o evento correto para o ID que estamos esperando
            if (data._id === targetId || data.id === targetId) {
                clearTimeout(timer);
                s.off(eventName, handler);
                resolve({ success: true, data, source: 'socket' });
            }
        };
        
        s.on(eventName, handler);
        
        // Timeout de segurança - se socket não chegar, resolvemos com false
        timer = setTimeout(() => {
            s.off(eventName, handler);
            resolve({ success: false });
        }, timeoutMs);
    });
};

// FUNÇÃO AUXILIAR: Mapeia campos do frontend para o backend
// Frontend: serviceType='individual_session'/'package_session', sessionType='avaliacao'/'sessao'
// Backend:  serviceType='evaluation'/'session', sessionType='avaliacao'/'sessao'
const mapCrmToBackend = (crm) => {
    const serviceTypeBackend = crm?.serviceType === "package_session" ? "session" : "evaluation";
    const sessionTypeBackend = crm?.sessionType === "sessao" ? "sessao" : "avaliacao";
    
    console.log("📝 [mapCrmToBackend] Mapeando:");
    console.log("  serviceType:", crm?.serviceType, "→", serviceTypeBackend);
    console.log("  sessionType:", crm?.sessionType, "→", sessionTypeBackend);
    
    return {
        serviceType: serviceTypeBackend,
        sessionType: sessionTypeBackend,
        paymentMethod: crm?.paymentMethod || "pix",
        paymentAmount: Number(crm?.paymentAmount || 0),
        usePackage: Boolean(crm?.usePackage),
    };
};

// NOVA FUNÇÃO: Atualiza agendamento existente
export const updateAppointmentDirect = async (appointmentId, appointmentData) => {
    console.log("📝 [appointmentsRepo] updateAppointmentDirect - ID:", appointmentId);
    console.log("📝 [appointmentsRepo] updateAppointmentDirect - appointmentData.operationalStatus recebido:", appointmentData.operationalStatus);
    
    const crmBackend = mapCrmToBackend(appointmentData.crm);
    
    const payload = {
        _id: appointmentId,
        patientId: appointmentData.patientId,
        patientInfo: {
            fullName: appointmentData.patientName || appointmentData.patient,
            phone: appointmentData.phone,
            birthDate: appointmentData.birthDate,
            email: appointmentData.email
        },
        responsible: appointmentData.responsible,
        professionalName: appointmentData.professional,
        doctorId: appointmentData.professionalId,
        specialty: appointmentData.specialtyKey || appointmentData.specialty,
        date: appointmentData.date,
        time: appointmentData.time,
        operationalStatus: appointmentData.operationalStatus || "scheduled", // Fallback apenas se não informado
        observations: appointmentData.observations,
        
        // Dados de faturamento
        billingType: appointmentData.billingType || "particular",
        paymentStatus: appointmentData.paymentStatus || "pending",
        insuranceProvider: appointmentData.insuranceProvider || "",
        insuranceValue: Number(appointmentData.insuranceValue || 0),
        authorizationCode: appointmentData.authorizationCode || "",
        
        // CRM mapeado
        crm: crmBackend,
    };
    
    console.log("📝 [updateAppointmentDirect] Enviando:", JSON.stringify(payload.crm, null, 2));
    console.log("📝 [updateAppointmentDirect] Payload operationalStatus:", payload.operationalStatus);
    
    const response = await api.post('/api/agenda-externa/update', payload, {
        timeout: 30000
    });
    
    console.log('[updateAppointmentDirect] ✅ Sucesso:', response.data);
    return { mode: "update", id: appointmentId, data: response.data };
};

export const upsertAppointment = async ({ editingAppointment, appointmentData }) => {
    console.log("📝 [appointmentsRepo] upsertAppointment chamado");
    console.log("📝 [appointmentsRepo] editingAppointment:", JSON.stringify(editingAppointment, null, 2));
    console.log("📝 [appointmentsRepo] appointmentData.id:", appointmentData.id);
    console.log("📝 [appointmentsRepo] appointmentData.patientId:", appointmentData.patientId);
    console.log("📝 [appointmentsRepo] appointmentData.isNewPatient:", appointmentData.isNewPatient);
    console.log("📝 [appointmentsRepo] appointmentData.patientName:", appointmentData.patientName);
    
    const safeStatus = appointmentData.status === "Vaga" ? "Pendente" : appointmentData.status;
    
    // Verifica se é edição (tem ID válido do MongoDB - 24 chars hex)
    // IDs que começam com 'ext_' são gerados pelo frontend e não devem ser enviados
    const isEditing = editingAppointment?.id && !editingAppointment.id.startsWith('ext_');
    const appointmentId = isEditing ? editingAppointment.id : null;
    
    console.log("📝 [appointmentsRepo] isEditing:", isEditing);
    console.log("📝 [appointmentsRepo] appointmentId:", appointmentId);
    console.log("📝 [appointmentsRepo] editingAppointment?.id:", editingAppointment?.id);
    console.log("📝 [appointmentsRepo] editingAppointment?.id?.startsWith('ext_'):", editingAppointment?.id?.startsWith('ext_'));

    // NOVO: Se for edição, usa a função direta que evita problemas de conversão
    if (isEditing) {
        console.log("📝 [appointmentsRepo] Usando updateAppointmentDirect para edição");
        return updateAppointmentDirect(appointmentId, appointmentData);
    }

    // Payload para CRIAÇÃO (pré-agendamento)
    const payload = {
        // Dados do paciente
        patientId: appointmentData.patientId,  // ID do paciente se já existir
        isNewPatient: appointmentData.isNewPatient,  // Flag: true = criar novo paciente
        patientInfo: {
            fullName: appointmentData.patientName || appointmentData.patient,
            phone: appointmentData.phone,
            birthDate: appointmentData.birthDate,
            email: appointmentData.email
        },
        responsible: appointmentData.responsible,

        // Dados do agendamento
        professionalName: appointmentData.professional,
        doctorId: appointmentData.professionalId,  // ID do profissional se disponível
        specialty: appointmentData.specialtyKey || appointmentData.specialty,
        date: appointmentData.date,
        time: appointmentData.time,
        operationalStatus: appointmentData.operationalStatus || "scheduled",
        observations: appointmentData.observations,

        // Dados CRM mapeados
        crm: mapCrmToBackend(appointmentData.crm),
    };

    console.log("[upsertAppointment] Enviando para API...");
    console.log("[upsertAppointment] Payload completo:", JSON.stringify(payload, null, 2));
    
    // Criação -> Apenas cria o Pré-Agendamento (Pendente)
    console.log(`[upsertAppointment] Criando Pré-Agendamento...`);
    const preRes = await api.post('/api/agenda-externa/pre-agendar', payload);

    if (!preRes.data.success) {
        throw new Error(preRes.data.error || "Erro ao criar pré-agendamento");
    }

    const preId = preRes.data.preAgendamentoId;
    console.log(`[upsertAppointment] ✅ Pré-Agendamento criado com sucesso: ${preId}`);

    // Retorna o ID do pré-agendamento. O frontend deve lidar com isso (ex: mostrar na lista como pendente)
    return { mode: "create", id: preId, status: "pending_confirmation" };
};

// Mantendo deleteAppointment como alias para compatibilidade, mas o nome correto agora é cancelAppointment
export const cancelAppointment = async (id, reason = "Cancelado via Web App", options = {}) => {
    console.log(`[cancelAppointment] Cancelando via API: ${id}`);
    try {
        await api.patch(`/api/appointments/${id}/cancel`, {
            reason,
            confirmedAbsence: options.confirmedAbsence || false,
            notifyPatient: options.notifyPatient || false // Passando caso o backend suporte futuramente ou em middleware
        });
    } catch (error) {
        console.error('[cancelAppointment] Erro ao cancelar:', error);
        throw error;
    }
};

export const deleteAppointment = cancelAppointment; // Alias para retrocompatibilidade

// NOVO: Exclusão permanente (Hard Delete)
export const hardDeleteAppointment = async (id) => {
    console.log(`[hardDeleteAppointment] Excluindo permanentemente: ${id}`);
    try {
        await api.delete(`/api/appointments/${id}`);
    } catch (error) {
        console.error('[hardDeleteAppointment] Erro ao excluir:', error);
        throw error;
    }
};

// ===============================
// CICLOS (Mantidos como "stub" ou adaptados se necessário)
// Nesta migração, ciclos complexos podem precisar de revisão.
// Por enquanto, desabilitamos a geração em lote no frontend para evitar inconsistência,
// ou mantemos chamando upsert em loop (menos eficiente mas funcional).
// ===============================

export const createCycleId = () => `cyc_${Date.now()}`;

// Busca slots disponíveis Reais via API do CRM
// 🆕 Atualizado para suportar formato com metadados (available, reason, label)
export const fetchAvailableSlots = async (doctorId, date) => {
    try {
        const response = await api.get('/api/appointments/available-slots', {
            params: { doctorId, date }
        });
        // 🆕 Retorna array de objetos: [{ time, available, reason, label }, ...]
        // ou formato antigo: ["08:00", "08:40", ...]
        return response.data;
    } catch (error) {
        console.error('[fetchAvailableSlots] Erro:', error);
        return [];
    }
};

// Adaptação: fetch via API
export const fetchAppointmentsInRange = async (startDate, endDate) => {
    const response = await api.get('/api/appointments', {
        params: { startDate, endDate }
    });
    return response.data;
};

// Gerador de Ciclo: Adaptado para chamar upsertAppointment em loop
// (Solução temporária mas robusta para Fase 1)
export const generateCycleAppointments = async (baseAppointment, payload, opts = {}) => {
    console.warn("⚠️ Geração de ciclo via API (em loop) - pode ser lento");
    const { selectedSlots } = payload;
    const createdIds = [];
    const skipped = [];

    // Busca existentes para conflito
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

        // Prepara dados para criar
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


// Confirma um agendamento pré-agendado (Amanda/Agenda Externa)
export const confirmAppointment = async (preAgendamentoId) => {
    console.log(`[confirmAppointment] Confirmando PreAgendamento: ${preAgendamentoId}`);
    if (!preAgendamentoId) throw new Error("ID do pré-agendamento ausente.");

    try {
        const response = await api.post('/api/agenda-externa/confirmar-agendamento', {
            preAgendamentoId
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const confirmPresence = async (id) => {
    console.log(`[confirmPresence] Confirmando presença/manual para: ${id}`);
    try {
        const response = await api.patch(`/api/appointments/${id}/confirm`);
        return response.data;
    } catch (error) {
        console.error('[confirmPresence] Erro:', error);
        throw error;
    }
};

export const discardPreAppointment = async (id, reason) => {
    console.log(`[discardPreAppointment] Descartando: ${id}`);
    try {
        const response = await api.post(`/api/pre-agendamento/${id}/descartar`, { reason });
        return response.data;
    } catch (error) {
        console.error('[discardPreAppointment] Descartando error:', error);
        throw error;
    }
};
