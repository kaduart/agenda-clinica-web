/**
 * 🚀 Serviço de Integração com CRM - Versão MongoDB (sem Firebase)
 * 
 * Substitui o crmExport.js que usava Firebase
 * Agora usa API REST diretamente
 */

const EXPORT_TOKEN = "agenda_export_token_fono_inova_2025_secure_abc123";
const BACKEND_URL = "https://fono-inova-crm-back.onrender.com";

// Cache local simples (substitui o Firebase local)
const localCache = new Map();

const apiRequest = async (endpoint, options = {}) => {
    const url = `${BACKEND_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${EXPORT_TOKEN}`,
            ...options.headers
        },
        ...options
    };
    
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }
    
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    return data;
};

/**
 * Exporta agendamento confirmado para o CRM
 */
export const exportToCRM = async (appointment) => {
    try {
        // Verificar se já foi exportado
        const cacheKey = `export_${appointment.id}`;
        const cached = localCache.get(cacheKey);
        
        if (cached?.status === 'success' && !confirm("Já exportado. Deseja exportar novamente?")) {
            return { success: true, cached: true };
        }

        // Validações
        if (appointment.status !== "Confirmado") {
            alert("⚠️ Apenas agendamentos confirmados podem ser exportados.");
            return { success: false, error: 'Status não confirmado' };
        }

        const missing = [];
        if (!appointment.patient) missing.push("Nome do paciente");
        if (!appointment.phone) missing.push("Telefone");
        if (!appointment.birthDate) missing.push("Data de nascimento");
        if (!appointment.professional) missing.push("Profissional");

        if (missing.length) {
            alert("❌ Campos obrigatórios faltando:\n\n" + missing.join("\n"));
            return { success: false, error: 'Campos faltando' };
        }

        // Preparar payload
        const payload = {
            externalId: appointment.id,
            professionalName: appointment.professional,
            date: appointment.date,
            time: appointment.time,
            specialty: appointment.specialty || "Fonoaudiologia",
            patientInfo: {
                fullName: appointment.patient,
                phone: (appointment.phone || "").replace(/\D/g, ""),
                birthDate: appointment.birthDate,
                email: appointment.email || undefined,
            },
            responsible: appointment.responsible || undefined,
            observations: appointment.observations || undefined,
            crm: {
                serviceType: appointment.crm?.serviceType || "individual_session",
                sessionType: appointment.crm?.sessionType || "avaliacao",
                paymentMethod: appointment.crm?.paymentMethod || "pix",
                paymentAmount: Number(appointment.crm?.paymentAmount || 0),
                usePackage: !!appointment.crm?.usePackage,
                status: "scheduled",
            },
        };

        // Enviar para API
        const data = await apiRequest('/api/import-from-agenda', {
            method: 'POST',
            body: payload
        });

        // Salvar no cache local
        localCache.set(cacheKey, {
            status: 'success',
            crmPreAgendamentoId: data.preAgendamentoId,
            exportedAt: new Date().toISOString()
        });

        alert(`✅ Exportado com sucesso!\n\nPré-agendamento ID: ${data.preAgendamentoId}`);
        return { success: true, data };

    } catch (err) {
        console.error("❌ Erro ao exportar:", err);
        
        // Salvar erro no cache
        localCache.set(`export_${appointment.id}`, {
            status: 'error',
            error: err.message,
            attemptedAt: new Date().toISOString()
        });
        
        alert("❌ Erro ao exportar:\n\n" + err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Envia pré-agendamento automaticamente
 */
export const autoSendPreAgendamento = async (appointment) => {
    try {
        const payload = {
            externalId: appointment.id,
            professionalName: appointment.professional,
            date: appointment.date,
            time: appointment.time,
            specialty: appointment.specialty || "Fonoaudiologia",
            patientInfo: {
                fullName: appointment.patient,
                phone: (appointment.phone || "").replace(/\D/g, ""),
                birthDate: appointment.birthDate,
                email: appointment.email,
            },
            responsible: appointment.responsible,
            observations: appointment.observations,
            crm: {
                serviceType: appointment.crm?.serviceType || "individual_session",
                sessionType: appointment.crm?.sessionType || "evaluation",
                paymentMethod: appointment.crm?.paymentMethod || "pix",
                paymentAmount: Number(appointment.crm?.paymentAmount || 0),
            },
            source: 'agenda_externa'
        };

        const data = await apiRequest('/api/pre-agendamento/webhook', {
            method: 'POST',
            body: payload
        });

        // Cache local
        localCache.set(`pre_${appointment.id}`, {
            status: 'enviado',
            crmPreAgendamentoId: data.id,
            sentAt: new Date().toISOString()
        });

        return { success: true, data };

    } catch (err) {
        console.error("❌ Erro no pré-agendamento:", err);
        localCache.set(`pre_${appointment.id}`, {
            status: 'error',
            error: err.message
        });
        return { success: false, error: err.message };
    }
};

/**
 * Confirma agendamento no CRM
 */
export const confirmarAgendamento = async (appointment, dadosConfirmacao) => {
    try {
        const body = {
            externalId: appointment.id,
            doctorId: dadosConfirmacao.doctorId,
            date: dadosConfirmacao.date || appointment.date,
            time: dadosConfirmacao.time || appointment.time,
            sessionValue: dadosConfirmacao.sessionValue || appointment.crm?.paymentAmount || 200,
            serviceType: appointment.crm?.serviceType || "evaluation",
            paymentMethod: appointment.crm?.paymentMethod || "pix",
            notes: "Confirmado pela secretária",
        };

        const data = await apiRequest('/api/import-from-agenda/confirmar-por-external-id', {
            method: 'POST',
            body
        });

        // Atualizar cache
        localCache.set(`export_${appointment.id}`, {
            status: 'confirmed',
            crmAppointmentId: data.appointmentId,
            confirmedAt: new Date().toISOString()
        });

        return { success: true, data };

    } catch (err) {
        console.error("❌ Erro ao confirmar:", err);
        return { success: false, error: err.message };
    }
};

/**
 * Sincroniza cancelamento com o CRM
 */
export const syncCancelToCRM = async (appointment, reason = "Cancelado via agenda externa") => {
    const cacheKey = `syncCancel_${appointment.id}`;
    const hasPre = localCache.get(`pre_${appointment.id}`)?.status === 'enviado';
    const hasExport = localCache.get(`export_${appointment.id}`)?.status === 'success';

    if (!hasPre && !hasExport) {
        console.log("[syncCancelToCRM] Nunca foi exportado, ignorando");
        return { success: true, skipped: true };
    }

    try {
        localCache.set(cacheKey, { status: 'syncing' });

        const data = await apiRequest('/api/import-from-agenda/sync-cancel', {
            method: 'POST',
            body: {
                externalId: appointment.id,
                reason,
                confirmedAbsence: appointment.confirmedAbsence || false
            }
        });

        localCache.set(cacheKey, {
            status: 'success',
            syncedAt: new Date().toISOString()
        });

        return { success: true, data };

    } catch (err) {
        console.error("[syncCancelToCRM] Erro:", err);
        localCache.set(cacheKey, { status: 'error', error: err.message });
        return { success: false, error: err.message };
    }
};

/**
 * Sincroniza atualização com o CRM
 */
export const syncUpdateToCRM = async (appointment, updates) => {
    const hasPre = localCache.get(`pre_${appointment.id}`)?.status === 'enviado';
    const hasExport = localCache.get(`export_${appointment.id}`)?.status === 'success';

    if (!hasPre && !hasExport) {
        return { success: true, skipped: true };
    }

    try {
        const payload = {
            externalId: appointment.id,
            date: updates.date || appointment.date,
            time: updates.time || appointment.time,
            professionalName: updates.professional || appointment.professional,
            specialty: updates.specialty || appointment.specialty,
            observations: updates.observations || appointment.observations,
            patientInfo: updates.patientInfo || {
                fullName: appointment.patient,
                phone: (appointment.phone || "").replace(/\D/g, ""),
                birthDate: appointment.birthDate,
                email: appointment.email,
            },
            status: updates.status || appointment.status
        };

        Object.keys(payload).forEach(key => {
            if (payload[key] === undefined) delete payload[key];
        });

        const data = await apiRequest('/api/import-from-agenda/sync-update', {
            method: 'POST',
            body: payload
        });

        return { success: true, data };

    } catch (err) {
        console.error("[syncUpdateToCRM] Erro:", err);
        return { success: false, error: err.message };
    }
};

/**
 * Sincroniza exclusão com o CRM
 */
export const syncDeleteToCRM = async (appointmentId, reason = "Excluído via agenda externa") => {
    try {
        const data = await apiRequest('/api/import-from-agenda/sync-delete', {
            method: 'POST',
            body: { externalId: appointmentId, reason }
        });

        // Limpar cache
        localCache.delete(`pre_${appointmentId}`);
        localCache.delete(`export_${appointmentId}`);

        return data;

    } catch (err) {
        console.error("❌ ERRO NO DELETE:", err);
        throw err;
    }
};

/**
 * Wrapper inteligente de sincronização
 */
export const syncIfNeeded = async (oldAppointment, newAppointment) => {
    console.log("[syncIfNeeded] ==========================================");
    
    const changes = {};
    if (oldAppointment.date !== newAppointment.date) changes.date = newAppointment.date;
    if (oldAppointment.time !== newAppointment.time) changes.time = newAppointment.time;
    if (oldAppointment.professional !== newAppointment.professional) changes.professional = newAppointment.professional;
    if (oldAppointment.status !== newAppointment.status) changes.status = newAppointment.status;

    if (Object.keys(changes).length === 0) {
        return { success: true, skipped: true };
    }

    // Se mudou para Confirmado
    const mudouParaConfirmado = changes.status === "Confirmado" && oldAppointment.status !== "Confirmado";
    const aindaNaoFoiImportado = !localCache.get(`export_${newAppointment.id}`)?.crmAppointmentId;

    if (mudouParaConfirmado && aindaNaoFoiImportado) {
        // Se já tem pré-agendamento, confirma
        if (localCache.get(`pre_${newAppointment.id}`)?.crmPreAgendamentoId) {
            return confirmarAgendamento(newAppointment, {
                date: newAppointment.date,
                time: newAppointment.time,
                sessionValue: newAppointment.crm?.paymentAmount || 200
            });
        }
        
        // Se não tem, cria e confirma
        await autoSendPreAgendamento(newAppointment);
        await new Promise(r => setTimeout(r, 500));
        return confirmarAgendamento(newAppointment, {
            date: newAppointment.date,
            time: newAppointment.time,
            sessionValue: newAppointment.crm?.paymentAmount || 200
        });
    }

    // Outras mudanças
    return syncUpdateToCRM(oldAppointment, changes);
};

// Exportar cache para debug
export const getCache = () => Object.fromEntries(localCache);
export const clearCache = () => localCache.clear();
