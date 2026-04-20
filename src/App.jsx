
// src/App.jsx
import React, { useEffect, useMemo } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Firebase removido - Agora usamos API + Socket.io

import AppointmentTable from "./components/AppointmentTable";
import FiltersPanel from "./components/FiltersPanel";
import Header from "./components/Header";
import SpecialtyDashboard from "./components/SpecialtyDashboard";
import SpecialtyTabs from "./components/SpecialtyTabs";
import ProfessionalsAvailability from "./components/ProfessionalsAvailability";

import CalendarView from "./components/CalendarView";
import WeeklyView from "./components/WeeklyView";

import AppointmentModal from "./components/AppointmentModal";
import ProfessionalsModal from "./components/ProfessionalsModal";

import {
  hasConflict,
  listenAppointmentsForMonth,
  listenToNotifications,
  upsertAppointment,
  updateAppointmentDirect,
  cancelAppointment,
  hardDeleteAppointment,
  fetchAvailableSlots,
  generateCycleAppointments,
} from "./services/appointmentsRepo";

import { approvePreAppointment, discardPreAppointment, cancelPreAppointment, updatePreAppointment, fetchPreAppointments } from "./services/preAppointmentsRepo";

import {
  addProfessional,
  deleteProfessionalByName,
  listenProfessionals
} from "./services/professionalsRepo";
import { fetchPatients } from "./services/patientsRepo";

import { confirmToast } from "./utils/confirmToast";
import { formatDateLocal, getWeeksInMonth } from "./utils/date";
import { sortAppointmentsByDateTimeAsc } from "./utils/sort";
import { resolveSpecialtyKey } from "./utils/specialty";
import { SPECIALTIES } from "./config/specialties";

import ReminderModal from "./components/ReminderModal";
import RemindersListModal from "./components/RemindersListModal";
import WhatsAppQRGlobal from "./components/WhatsAppQRGlobal";

// crmExport removido pois a sincronização agora é automática no repo
// import { ... } from "./services/crmExport"; 

import { cancelReminder, listenReminders, markReminderDone, snoozeReminderDays } from "./services/remindersRepo";
import "./styles/app.css";
console.log("🚀🚀🚀 APP.JSX CARREGADO - VERSÃO MIGRADA API!");

export default function App() {
  console.log("📱 [App.jsx] Componente App montando - VERSÃO API!");

  const [view, setView] = React.useState("list");
  const [appointments, setAppointments] = React.useState([]);
  const [preAppointments, setPreAppointments] = React.useState([]);
  const [professionals, setProfessionals] = React.useState([]);
  const [patients, setPatients] = React.useState([]);
  const [patientsError, setPatientsError] = React.useState(null);

  const today = new Date();
  const todayFormatted = formatDateLocal(today);
  const todayDayOfWeek = (today.getDay() === 0 ? 7 : today.getDay()).toString();

  // Recupera data salva do localStorage ou usa hoje
  const getSavedDate = () => {
    try {
      const saved = localStorage.getItem('agendaFilterDate');
      const savedDay = localStorage.getItem('agendaFilterDay');
      if (saved) {
        // Verifica se a data salva é válida (não está muito no passado - mais de 30 dias)
        const savedDate = new Date(saved);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        if (savedDate >= thirtyDaysAgo) {
          return { date: saved, day: savedDay || todayDayOfWeek };
        }
      }
    } catch (e) {
      console.error("[App.jsx] Erro ao ler localStorage:", e);
    }
    return { date: todayFormatted, day: todayDayOfWeek };
  };
  
  const savedFilters = getSavedDate();

  const [activeSpecialty, setActiveSpecialty] = React.useState("todas");
  const [isAvailabilityExpanded, setIsAvailabilityExpanded] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear());

  const [filters, setFilters] = React.useState({
    filterDate: savedFilters.date,
    filterProfessional: "",
    filterStatus: "",
    filterDay: savedFilters.day,
    filterWeek: null,
  });
  
  // Salva a data no localStorage quando mudar
  React.useEffect(() => {
    try {
      if (filters.filterDate) {
        localStorage.setItem('agendaFilterDate', filters.filterDate);
        localStorage.setItem('agendaFilterDay', filters.filterDay || todayDayOfWeek);
        console.log("💾 [App.jsx] Data salva no localStorage:", filters.filterDate);
      }
    } catch (e) {
      console.error("[App.jsx] Erro ao salvar localStorage:", e);
    }
  }, [filters.filterDate, filters.filterDay]);
  
  // Estado para forçar refresh da lista após operações (criar, editar, cancelar, deletar)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const loadPreAppointmentsRef = React.useRef(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingAppointment, setEditingAppointment] = React.useState(null);
  const [isProfessionalsModalOpen, setIsProfessionalsModalOpen] = React.useState(false);
  const [isReminderOpen, setIsReminderOpen] = React.useState(false);
  const [reminderAppointment, setReminderAppointment] = React.useState(null);
  const [reminders, setReminders] = React.useState([]);
  const [isRemindersListOpen, setIsRemindersListOpen] = React.useState(false);

  const [availableSlots, setAvailableSlots] = React.useState([]);
  
  // Função global para forçar refresh da lista de appointments
  const forceRefreshAppointments = React.useCallback(() => {
    console.log('🔄 [forceRefresh] chamado');
    // Dispara refresh do useEffect de appointments (listener)
    setRefreshTrigger(prev => prev + 1);
    // Dispara refresh imediato dos pré-agendamentos sem recriar o intervalo
    if (typeof loadPreAppointmentsRef.current === 'function') {
      loadPreAppointmentsRef.current();
    }
  }, []);

  // ========== DISPONIBILIDADE REAL (Slots Virtuais) ==========
  useEffect(() => {
    const fetchSlots = async () => {
      // Só busca se houver profissional E data selecionados
      if (filters.filterProfessional && filters.filterDate && filters.filterProfessional.toLowerCase() !== "livre") {
        const doc = (professionals || []).find(p => p.fullName === filters.filterProfessional);
        if (doc?.id) {
          console.log(`🔍 [App.jsx] Buscando slots para ${doc.fullName} em ${filters.filterDate}`);
          const slots = await fetchAvailableSlots(doc.id, filters.filterDate);
          setAvailableSlots(slots);
        } else {
          setAvailableSlots([]);
        }
      } else {
        setAvailableSlots([]);
      }
    };
    fetchSlots();
  }, [filters.filterProfessional, filters.filterDate, professionals]);

  // ========== REMINDER ==========
  const openReminder = (appointment) => {
    setReminderAppointment(appointment);
    setIsReminderOpen(true);
  };

  const saveReminder = async (payload) => {
    try {
      const candidate = { ...reminderAppointment, ...payload };
      await upsertAppointment({ editingAppointment: reminderAppointment, appointmentData: candidate });
      setIsReminderOpen(false);
      setReminderAppointment(null);
      toast.success("Lembrete salvo!");
    } catch (e) {
      console.error("[saveReminder]", e);
      toast.error("Erro ao salvar lembrete.");
    }
  };

  // ========== LISTENERS ==========
  useEffect(() => {
    console.log("👂 [App.jsx] Listener de profissionais iniciado");
    const unsub = listenProfessionals((data) => {
      console.log("👂 [App.jsx] Profissionais recebidos:", data.length);
      setProfessionals(data);
    });
    return () => {
      console.log("👂 [App.jsx] Listener de profissionais desmontado");
      unsub();
    };
  }, []);

  // Carrega pacientes lazy — só quando o modal de agendamento abre
  useEffect(() => {
    if (!isModalOpen) return;
    if (patients.length > 0) return; // já carregado
    fetchPatients().then((data) => {
      setPatients(data || []);
      setPatientsError(data?.length ? null : 'empty');
    }).catch(() => {
      setPatientsError('auth');
      setPatients([]);
    });
  }, [isModalOpen]);

  useEffect(() => {
    let targetYear = currentYear;
    let targetMonth = currentMonth;
    let specificDate = null;

    if (filters.filterDate) {
      const [y, m] = filters.filterDate.split("-").map(Number);
      targetYear = y;
      targetMonth = m - 1;
      specificDate = filters.filterDate; // Passa a data específica para busca otimizada
    }

    console.log(`👂 [listener:appointments] MONTANDO — ${targetYear}/${targetMonth + 1}${specificDate ? ' data=' + specificDate : ''}`);
    const unsub = listenAppointmentsForMonth(targetYear, targetMonth, (data) => {
      console.log(`👂 [listener:appointments] snapshot recebido — ${data.length} registros`);
      setAppointments(data);
    }, specificDate);
    return () => {
      console.log(`👂 [listener:appointments] DESMONTANDO — ${targetYear}/${targetMonth + 1}`);
      unsub();
    };
  }, [currentYear, currentMonth, filters.filterDate, refreshTrigger]);

  // 🆕 Buscar pré-agendamentos (pre_agendado) para exibir na agenda
  useEffect(() => {
    const loadPreAppointments = async () => {
      try {
        const filters = {};
        if (activeSpecialty && activeSpecialty !== 'all') {
          filters.specialty = activeSpecialty;
        }
        const data = await fetchPreAppointments(filters);
        console.log("👂 [App.jsx] Pré-agendamentos recebidos:", data.length);
        setPreAppointments(data);
      } catch (error) {
        console.error("❌ [App.jsx] Erro ao buscar pré-agendamentos:", error);
      }
    };

    loadPreAppointmentsRef.current = loadPreAppointments;
    loadPreAppointments();

    // Recarregar a cada 30 segundos
    const interval = setInterval(loadPreAppointments, 30000);
    return () => clearInterval(interval);
  }, [activeSpecialty]);

  useEffect(() => {
    const unsub = listenReminders((list) => setReminders(list));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = listenToNotifications((notif) => {
      console.log("🔔 [App.jsx] Notificação recebida:", notif);
      if (notif.type === 'pre_appointment') {
        // 🛡️ Filtro: Só mostra toast se o interesse foi criado nos últimos 5 minutos
        const createdAt = notif.data?.createdAt ? new Date(notif.data.createdAt) : new Date();
        const diffMinutes = (new Date() - createdAt) / (1000 * 60);

        if (diffMinutes <= 5) {
          toast.info(
            <div className="flex flex-col">
              <span className="font-bold">🌟 {notif.title}</span>
              <span className="text-sm">{notif.message}</span>
            </div>,
            { autoClose: 5000 }
          );
        } else {
          console.log("⏳ [App.jsx] Notificação ignorada por ser antiga (Toast filtrado)");
        }
        // O listener de appointments já recarrega a lista via socket.
      }
    });
    return () => unsub();
  }, []);

  // ========== LABEL DA ESPECIALIDADE ATUAL ==========
  const activeSpecialtyLabel = useMemo(() => {
    return SPECIALTIES[activeSpecialty]?.name || "";
  }, [activeSpecialty]);

  // ========== FUNÇÕES DE AÇÃO (Simplificadas para API) ==========

  // EXCLUIR (Hard Delete) - Remove do banco
  const onDelete = async (id) => {
    const appt = (filteredAppointments || []).find(a => a.id === id);
    const isPre = appt?.operationalStatus === 'pre_agendado';

    // Se for pré, também podemos excluir permanentemente se o usuário quiser (limpar lixo)
    const msg = isPre
      ? "⚠ Tem certeza que deseja EXCLUIR PERMANENTEMENTE este interesse? (Não poderá ser desfeito)"
      : "⚠ Tem certeza que deseja EXCLUIR PERMANENTEMENTE este agendamento? (Histórico será perdido)";

    const ok = await confirmToast(msg, { confirmText: "Excluir", confirmColor: "red" });
    if (!ok) return;

    try {
      console.log("🚀 PROCESSANDO HARD DELETE ID:", id);
      // Para pré-agendamentos, a rota de delete também funciona se for pelo ID do banco
      // Se for um pré-agendamento apenas em memória (sem ID), não dá pra excluir do banco.

      if (isPre) {
        // Para pré-agendamentos, usar a rota de descartar
        await discardPreAppointment(id, "Excluído permanentemente via agenda");
        toast.success("Interesse excluído permanentemente!");
      } else {
        // Para agendamentos normais, usar hard delete
        await hardDeleteAppointment(id);
        toast.success("Agendamento excluído permanentemente!");
      }
      // Force refresh imediato para atualizar a lista
      forceRefreshAppointments();

    } catch (e) {
      console.error("❌ ERRO:", e);
      toast.error("Erro ao excluir: " + (e.response?.data?.error || e.message));
    }
  };

  // CONFIRMAR pré-agendamento (converter em agendamento real)
  const onConfirmPreAppointment = async (appointmentData) => {
    let appointmentId = editingAppointment?.id || editingAppointment?._id || editingAppointment?.preAgendamentoId || editingAppointment?.appointmentId;

    if (!appointmentId) {
      // Novo agendamento sem ID: salvar normalmente como pre_agendado
      await saveAppointment(appointmentData);
      return;
    }

    try {
      console.log("🔥 [onConfirmPreAppointment] Confirmando Pré-Agendamento...");
      console.log("🔥 [onConfirmPreAppointment] appointmentData:", appointmentData);
      
      const doc = (professionals || []).find(p => p.fullName === appointmentData.professional);
      const resolvedDoctorId = doc?.id || appointmentData.professionalId;

      if (!resolvedDoctorId) {
        toast.error("Selecione um profissional antes de confirmar o pré-agendamento.");
        return;
      }

      // Envia todos os campos necessários para o backend
      // O adapter V2 normaliza paymentMethod, serviceType e sessionType automaticamente
      const importData = {
        doctorId: resolvedDoctorId,
        date: appointmentData.date,
        time: appointmentData.time,
        sessionValue: Number(appointmentData.crm?.paymentAmount || 0),
        notes: appointmentData.observations,
        // DADOS DO PACIENTE (obrigatórios para o backend)
        patientId: appointmentData.patientId,
        isNewPatient: appointmentData.isNewPatient,
        birthDate: appointmentData.birthDate,
        phone: appointmentData.phone,
        email: appointmentData.email,
        responsible: appointmentData.responsible,
        // CRM cru — o adapter V2 normaliza antes de enviar
        crm: appointmentData.crm
      };

      console.log("📤 [onConfirmPreAppointment] Enviando:", importData);
      await approvePreAppointment(appointmentId, importData);
      toast.success("Agendamento confirmado com sucesso!");
      setIsModalOpen(false);
      setEditingAppointment(null);
      forceRefreshAppointments();
    } catch (err) {
      console.error("❌ Erro ao confirmar pré-agendamento:", err);
      toast.error("Erro ao confirmar: " + (err.response?.data?.error || err.message));
    }
  };

  // CANCELAR específico (Unificado: Soft Delete para Regular e Discard para Pre)
  const isCancellingRef = React.useRef(false);
  
  const onCancel = async (appointment) => {
    // Previne cliques duplos
    if (isCancellingRef.current) {
      console.log("⏳ [onCancel] Já está processando, ignorando clique duplo");
      return;
    }
    
    console.log("🔥 [onCancel] INICIANDO:", appointment.id, appointment.patientName || appointment.patient);
    isCancellingRef.current = true;
    
    const isPre = appointment.operationalStatus === 'pre_agendado';
    const actionName = isPre ? "descartar este pré-agendamento" : "cancelar este agendamento";

    let reason = "Cancelado via Web App";

    if (isPre) {
      // Para pré-agendamento: descarta (status = 'descartado')
      const ok = await confirmToast(`Deseja ${actionName}?`, { confirmText: "Confirmar", confirmColor: "red" });
      if (!ok) {
        isCancellingRef.current = false;
        return;
      }
      reason = "Descartado pela secretária";
    } else {
      // Para agendamento real: pede motivo
      reason = prompt("Motivo do cancelamento:", "Cancelado pelo paciente");
      if (!reason) {
        isCancellingRef.current = false;
        return;
      }
    }

    try {
      if (isPre) {
        // Pré-agendamento: cancela (status = 'cancelado')
        await cancelPreAppointment(appointment.id);
        toast.success("Pré-agendamento cancelado!");
      } else {
        // Agendamento real: cancela (soft delete / status cancelado)
        await cancelAppointment(appointment.id, reason);
        toast.success("Agendamento cancelado!");
      }
      // Force refresh imediato para atualizar a lista
      forceRefreshAppointments();
    } catch (e) {
      console.error("[onCancel]", e);
      toast.error("Erro ao cancelar: " + e.message);
    } finally {
      isCancellingRef.current = false;
    }
  };


  const saveAppointment = async (appointmentData) => {
    console.log("🔥🔥🔥 [saveAppointment] =========================================");
    console.log("🔥 [saveAppointment] START");
    console.log("🔥 [saveAppointment] appointmentData recebido:", JSON.stringify(appointmentData, null, 2));
    
    const appointmentId = editingAppointment?.id || editingAppointment?._id || editingAppointment?.preAgendamentoId || editingAppointment?.appointmentId;
    // 🎯 FONTE ÚNICA DA VERDADE: operationalStatus define se é pré-agendamento
    const isPreEditing = editingAppointment?.operationalStatus === 'pre_agendado';
    const isEditing = !!appointmentId && !isPreEditing;
    const isImportingPre = isPreEditing;
    
    console.log("🔥 [saveAppointment] editingAppointment:", JSON.stringify(editingAppointment, null, 2));
    console.log("🔥 [saveAppointment] isEditing:", isEditing);
    console.log("🔥 [saveAppointment] isImportingPre:", isImportingPre);
    console.log("🔥 [saveAppointment] appointmentId:", appointmentId);
    console.log("🔥 [saveAppointment] isPreEditing:", isPreEditing);

    // Se for pré-agendamento EXISTENTE, verifica se está cancelando ou apenas atualizando
    if (isPreEditing && appointmentId) {
      try {
        console.log("🔍 [saveAppointment] isPre=true, operationalStatus recebido:", appointmentData.operationalStatus);
        console.log("🔍 [saveAppointment] appointmentData completo:", JSON.stringify(appointmentData, null, 2));
        // Se o status mudou para cancelado, chama a rota de cancelar
        if (appointmentData.operationalStatus === 'canceled' || appointmentData.operationalStatus === 'cancelado') {
          console.log("✅ [saveAppointment] Detectado cancelamento de pré-agendamento, chamando /cancelar");
          await cancelPreAppointment(appointmentId);
          toast.success("Pré-agendamento cancelado!");
          setIsModalOpen(false);
          setEditingAppointment(null);
          forceRefreshAppointments();
          return;
        }

        console.log("🔥 [saveAppointment] Atualizando Pré-Agendamento...");
        
        const doc = (professionals || []).find(p => p.fullName === appointmentData.professional);

        // Campos conforme modelo PreAgendamento do backend
        const updateData = {
          patientInfo: {
            fullName: appointmentData.patientName || appointmentData.patient,
            phone: appointmentData.phone,
            birthDate: appointmentData.birthDate,
            email: appointmentData.email
          },
          professionalName: appointmentData.professional,
          professionalId: doc?.id || appointmentData.professionalId,
          specialty: (appointmentData.specialtyKey || appointmentData.specialty || 'fonoaudiologia').toLowerCase(),
          preferredDate: appointmentData.date,
          preferredTime: appointmentData.time,
          secretaryNotes: [
            appointmentData.responsible && `Responsável: ${appointmentData.responsible}`,
            appointmentData.observations && `Obs: ${appointmentData.observations}`
          ].filter(Boolean).join('\n')
        };

        console.log("📤 [saveAppointment] Atualizando pré-agendamento:", appointmentId);
        console.log("📤 [saveAppointment] Payload:", JSON.stringify(updateData, null, 2));
        await updatePreAppointment(appointmentId, updateData);
        toast.success("Pré-agendamento atualizado!");
        setIsModalOpen(false);
        setEditingAppointment(null);
        forceRefreshAppointments();
        return;
      } catch (err) {
        console.error("❌ Erro ao atualizar pré-agendamento:", err);
        toast.error("Erro ao salvar: " + (err.response?.data?.error || err.message));
        throw err; // Propaga erro para o modal saber que falhou
      }
    }

    console.log("🔍 [App.jsx saveAppointment] appointmentData.operationalStatus:", appointmentData.operationalStatus);
    console.log("🔍 [App.jsx saveAppointment] editingAppointment?.operationalStatus:", editingAppointment?.operationalStatus);
    
    const candidate = {
      ...(isEditing ? editingAppointment : {}),
      ...appointmentData,
      operationalStatus: appointmentData.operationalStatus || editingAppointment?.operationalStatus || "scheduled",
    };
    
    console.log("🔍 [App.jsx saveAppointment] candidate.operationalStatus final:", candidate.operationalStatus);

    if (appointmentId && isEditing) candidate.id = appointmentId;

    // 1. Checagem de conflito local visual (rápida)
    if (hasConflict(appointments, candidate, isEditing ? appointmentId : null)) {
      toast.warning("⚠️ Atenção: Conflito visual detectado no seu calendário.");
    }

    try {
      console.log(`🔥 [saveAppointment] enviando — modo: ${isEditing ? 'EDIÇÃO' : 'CRIAÇÃO'} id=${appointmentId || 'novo'}`);
      const result = await upsertAppointment({
        editingAppointment: isEditing ? { id: appointmentId } : null,
        appointmentData: candidate
      });

      console.log("🔥 [saveAppointment] API ok:", result);
      toast.success(isEditing ? "Agendamento atualizado!" : "Agendamento criado!");

      setIsModalOpen(false);
      setEditingAppointment(null);

      forceRefreshAppointments();

    } catch (err) {
      console.error("[saveAppointment] Erro:", err);
      const msg = err.response?.data?.error || err.message;
      toast.error("Erro ao salvar: " + msg);
      throw err; // Propaga erro para o modal saber que falhou
    }
  };

  // ========== RESTO DAS FUNÇÕES ==========

  const openEditModal = (appointment) => {
    console.log("[openEditModal]", appointment);
    setEditingAppointment(appointment);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    console.log("📝 [App.jsx] Abrindo modal de criação");

    const firstProf = professionals[0];
    const profName = firstProf?.fullName || firstProf?.name || "";
    const profSpecialty = firstProf?.specialty || "fonoaudiologia";
    const specialtyLabel = activeSpecialty === "todas" 
      ? (SPECIALTIES[profSpecialty]?.name || "Fonoaudiologia")
      : (SPECIALTIES[activeSpecialty]?.name || "Fonoaudiologia");

    setEditingAppointment({
      date: formatDateLocal(new Date()),
      time: "08:00",
      professional: profName,
      specialty: specialtyLabel,
      operationalStatus: "pre_agendado",
      patient: "",
      responsible: "",
      observations: "",
    });

    setIsModalOpen(true);
  };

  const handleSlotClick = (payload) => {
    console.log("[handleSlotClick]", payload);

    if (payload?.__isEmptySlot) {
      const payloadProf = payload.professional;
      const profName = typeof payloadProf === 'object' && payloadProf !== null
        ? (payloadProf.fullName || payloadProf.name || "")
        : (payloadProf || "");
      const profSpecialty = typeof payloadProf === 'object' && payloadProf !== null
        ? (payloadProf.specialty || "fonoaudiologia")
        : "fonoaudiologia";
      const specialtyLabel = activeSpecialty === "todas"
        ? (SPECIALTIES[profSpecialty]?.name || "Fonoaudiologia")
        : (SPECIALTIES[activeSpecialty]?.name || "Fonoaudiologia");

      setEditingAppointment({
        date: payload.date,
        time: payload.time,
        professional: profName,
        specialty: specialtyLabel,
        operationalStatus: "pre_agendado",
        patient: "",
        responsible: "",
        observations: "",
      });

      setIsModalOpen(true);
      return;
    }

    openEditModal(payload);
  };

  // ========== DERIVED LISTS (separação de pipelines) ==========
  const mappedPreAppointments = React.useMemo(() => {
    return (preAppointments || []).map(pre => ({
      id: pre._id || pre.id || pre.preAgendamentoId || pre.appointmentId,
      _id: pre._id || pre.id || pre.preAgendamentoId || pre.appointmentId,
      date: pre.preferredDate || (typeof pre.date === 'string' ? pre.date.substring(0,10) : new Date(pre.date).toISOString().substring(0,10)),
      time: pre.preferredTime || pre.time,
      patient: pre.patient?.fullName || pre.patientName || 'Paciente Desconhecido',
      patientName: pre.patient?.fullName || pre.patientName || 'Paciente Desconhecido',
      patientId: pre.patient?._id?.toString?.() || pre.patient?.toString?.() || pre.patientId || null,
      phone: pre.patient?.phone || '',
      birthDate: pre.patient?.dateOfBirth || null,
      email: pre.patient?.email || null,
      professional: pre.professionalName || (pre.doctor?.fullName),
      specialty: pre.specialty,
      operationalStatus: 'pre_agendado',
      status: 'Pré-agendado',
      observations: pre.notes || pre.observations,
      originalData: pre,
      source: pre.metadata?.origin?.source || 'crm'
    }));
  }, [preAppointments]);

  // Pipeline para Calendar / Weekly (tudo que cai no mês)
  const calendarAppointments = React.useMemo(() => {
    return [...(appointments || []), ...mappedPreAppointments];
  }, [appointments, mappedPreAppointments]);

  // Pipeline para List View (appointments filtrados + todos os pré-agendamentos pendentes)
  const filteredAppointments = React.useMemo(() => {
    console.log(`[filteredAppointments] appointments: ${appointments?.length}, pre: ${mappedPreAppointments?.length}, filterDate: ${filters.filterDate}, activeSpecialty: ${activeSpecialty}`);

    const weeks = getWeeksInMonth(currentYear, currentMonth);
    const isPreAgendamento = (appt) => appt?.operationalStatus === 'pre_agendado';

    // 1. Filtrar appointments REAIS por data/semana/especialidade
    let filteredReals = (appointments || []).filter((appointment) => {
      if (activeSpecialty && activeSpecialty !== "todas") {
        if (resolveSpecialtyKey(appointment) !== activeSpecialty) return false;
      }

      if (filters.filterDate) {
        if (appointment.date !== filters.filterDate) return false;
      } else {
        if (filters.filterDay) {
          if (!appointment.date) return false;
          const [y, m, d] = appointment.date.split("-").map(Number);
          const dateObj = new Date(y, m - 1, d);
          if (dateObj.getDay() !== Number(filters.filterDay)) return false;
        }
        if (filters.filterWeek !== null && filters.filterWeek !== undefined) {
          const w = weeks[filters.filterWeek];
          if (!w) return false;
          const toKey = (v) => (typeof v === "string" ? v.replaceAll("-", "") : formatDateLocal(v).replaceAll("-", ""));
          const dKey = toKey(appointment.date);
          if (!(dKey >= toKey(w.start) && dKey <= toKey(w.end))) return false;
        }
      }
      return true;
    });

    // 2. Filtrar pré-agendamentos por especialidade e por data do agendamento
    let filteredPres = mappedPreAppointments.filter((appointment) => {
      if (activeSpecialty && activeSpecialty !== "todas") {
        if (resolveSpecialtyKey(appointment) !== activeSpecialty) return false;
      }
      // Mostrar pré-agendamento apenas no dia da consulta, não no dia da criação
      if (filters.filterDate) {
        if (appointment.date !== filters.filterDate) return false;
      }
      return true;
    });

    // 3. Remover pré-agendamentos descartados/cancelados
    filteredPres = filteredPres.filter(appointment => {
      const realStatus = appointment.metadata?.preAgendamentoStatus || appointment.originalData?.status;
      if (realStatus === 'desistiu' || realStatus === 'descartado') {
        console.log(`[filteredAppointments] Filtrando pré-agendamento finalizado: ${appointment.id} (${appointment.patientName}, status: ${realStatus})`);
        return false;
      }
      return true;
    });

    // 4. Dedup de pré-agendamentos contra TODOS os appointments reais do mês (não só os filtrados)
    filteredPres = filteredPres.filter(appointment => {
      const patientName = (appointment.patientName || appointment.patient?.name || appointment.patient?.fullName || '').toLowerCase().trim();
      const hasRealAppointment = (appointments || []).some(real => {
        if (isPreAgendamento(real)) return false;
        const realPatientName = (real.patientName || real.patient?.name || real.patient?.fullName || '').toLowerCase().trim();
        let samePatient = false;
        if (patientName && realPatientName) {
          samePatient = patientName.includes(realPatientName) || realPatientName.includes(patientName);
          if (!samePatient) {
            const preWords = patientName.split(/\s+/).filter(w => w.length > 2);
            const realWords = realPatientName.split(/\s+/).filter(w => w.length > 2);
            samePatient = preWords.filter(w => realWords.includes(w)).length >= 2;
          }
        }
        return samePatient && real.date === appointment.date && real.time === appointment.time && real.professional === appointment.professional;
      });
      if (hasRealAppointment) {
        console.log(`[filteredAppointments] Filtrando pré-agendamento duplicado: ${appointment.id} (${appointment.patientName})`);
        return false;
      }
      return true;
    });

    // 5. Filtros secundários (profissional / status) aplicados em ambos
    const applySecondaryFilters = (list) => list.filter(appointment => {
      if (filters.filterProfessional) {
        if (filters.filterProfessional.toLowerCase() === "livre") {
          const pName = appointment.patient?.name || appointment.patient?.fullName || (typeof appointment.patient === 'string' ? appointment.patient : '') || "";
          const isLivre =
            (appointment.professional && appointment.professional.toLowerCase().includes("livre")) ||
            (pName.toLowerCase().includes("livre")) ||
            (appointment.observations && appointment.observations.toLowerCase().includes("livre"));
          if (!isLivre) return false;
        } else if ((appointment.professional || "").toLowerCase() !== filters.filterProfessional.toLowerCase()) {
          return false;
        }
      }
      if (filters.filterStatus && appointment.status !== filters.filterStatus) return false;
      return true;
    });

    filteredReals = applySecondaryFilters(filteredReals);
    filteredPres = applySecondaryFilters(filteredPres);

    // 6. Merge
    let base = [...filteredReals, ...filteredPres];

    // 7. Slots virtuais (só quando filtro profissional + data ativo)
    if (filters.filterProfessional && filters.filterDate && availableSlots.length > 0) {
      const virtualAppointments = availableSlots
        .filter(slot => (typeof slot === 'string' ? true : slot.available))
        .map(slot => {
          const time = typeof slot === 'string' ? slot : slot.time;
          return {
            id: `virtual_${filters.filterDate}_${time}_${filters.filterProfessional}`,
            date: filters.filterDate,
            time,
            professional: filters.filterProfessional,
            patient: "Livre",
            status: "Vaga",
            __isVirtual: true
          };
        });
      const realTimes = new Set(base.map(a => `${a.time}|${a.professional}`));
      const uniqueVirtuals = virtualAppointments.filter(v => !realTimes.has(`${v.time}|${v.professional}`));
      base = [...base, ...uniqueVirtuals];
    }

    // 8. Dedup final por ID
    const seenIds = new Set();
    base = base.filter(appointment => {
      if (seenIds.has(appointment.id)) {
        console.log(`[filteredAppointments] Removendo duplicado por ID: ${appointment.id}`);
        return false;
      }
      seenIds.add(appointment.id);
      return true;
    });

    base = sortAppointmentsByDateTimeAsc(base);
    console.log(`[filteredAppointments] Resultado final: ${base.length} agendamentos`);
    return base;
  }, [appointments, mappedPreAppointments, activeSpecialty, filters, currentYear, currentMonth, availableSlots]);

  // ========== PROFESSIONALS ==========
  const onOpenProfessionals = () => {
    console.log("👤 [App.jsx] Abrindo modal de profissionais");
    setIsProfessionalsModalOpen(true);
  };

  const handleAddProfessional = async (name) => {
    try {
      await addProfessional(name);
      toast.success(`Profissional "${name}" adicionado!`);
    } catch (e) {
      console.error("[handleAddProfessional]", e);
      toast.error("Erro ao adicionar profissional.");
    }
  };

  const handleResetFilters = () => {
    console.log("🔄 [App.jsx] Limpando filtros...");
    setFilters({
      filterDate: "",
      filterProfessional: "",
      filterStatus: "",
      filterDay: "",
      filterWeek: null,
    });
  };

  const handleDeleteProfessional = async (name) => {
    const ok = await confirmToast(`Remover o profissional "${name}"?`, { confirmText: "Remover", confirmColor: "red" });
    if (!ok) return;
    try {
      await deleteProfessionalByName(name);
      toast.success(`Profissional "${name}" removido!`);
    } catch (e) {
      console.error("[handleDeleteProfessional]", e);
      toast.error("Erro ao remover profissional.");
    }
  };

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-blue-50">
      <div className="relative z-50 pointer-events-auto">
        <Header
          view={view}
          setView={setView}
          remindersPendingCount={reminders.filter(r => r.status === "pending").length}
          onOpenReminders={() => setIsRemindersListOpen(true)}
        />
      </div>
      <ToastContainer position="top-center" newestOnTop closeOnClick={false} draggable={false} />

      <main className="max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
        <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-6">
          <SpecialtyDashboard appointments={appointments} activeSpecialty={activeSpecialty} />
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <FiltersPanel
            professionals={professionals}
            currentYear={currentYear}
            currentMonth={currentMonth}
            filters={filters}
            setFilters={setFilters}
            onNewAppointment={openCreateModal}
            onOpenProfessionals={onOpenProfessionals}
            onResetFilters={handleResetFilters}
          />
        </div>

        {view === "list" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
              <SpecialtyTabs
                activeTab={activeSpecialty}
                onTabChange={setActiveSpecialty}
              />
            </div>

            {/* Disponibilidade dos Profissionais - aparece quando seleciona especialidade */}
            {activeSpecialty !== 'todas' && (
              <ProfessionalsAvailability 
                activeSpecialty={activeSpecialty} 
                isExpanded={isAvailabilityExpanded}
                onToggle={() => setIsAvailabilityExpanded(prev => !prev)}
              />
            )}

            <AppointmentTable
              activeSpecialty={activeSpecialty}
              appointments={filteredAppointments}
              onEdit={openEditModal}
              onDelete={onDelete}
              onCancel={onCancel}
              onReminder={openReminder}
              onConfirmCycle={async (payload, baseAppointment) => {
                try {
                  const result = await generateCycleAppointments(baseAppointment, payload, {
                    statusForGenerated: "Confirmado",
                    skipConflicts: true,
                  });
                  const msg = result.skipped?.length
                    ? `${result.createdCount} criadas, ${result.skipped.length} puladas por conflito.`
                    : `${result.createdCount} sessões criadas.`;
                  toast.success(`Ciclo ${result.cycleId} gerado! ${msg}`);
                } catch (e) {
                  console.error(e);
                  toast.error("Erro ao gerar ciclo.");
                }
              }}
            />
          </div>
        )}

        {view === "calendar" && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-6 animate-fadeIn">
            <CalendarView
              appointments={calendarAppointments}
              professionals={professionals}
              currentMonth={currentMonth}
              currentYear={currentYear}
              setCurrentMonth={setCurrentMonth}
              setCurrentYear={setCurrentYear}
              filterWeek={filters.filterWeek}
              setFilterWeek={(w) => setFilters((prev) => ({ ...prev, filterWeek: w }))}
              onSlotClick={handleSlotClick}
            />
          </div>
        )}

        {view === "weekly" && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-6 animate-fadeIn">
            <WeeklyView
              appointments={calendarAppointments}
              professionals={professionals}
              activeSpecialtyLabel={activeSpecialtyLabel}
              currentYear={currentYear}
              currentMonth={currentMonth}
              filters={filters}
              onSlotClick={handleSlotClick}
            />
          </div>
        )}
      </main>

      {/* MODALS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <AppointmentModal
            appointment={editingAppointment}
            professionals={professionals}
            patients={patients}
            onSave={saveAppointment}
            onConfirmPre={onConfirmPreAppointment}
            onClose={() => {
              setIsModalOpen(false);
              setEditingAppointment(null);
            }}
            onReloadPatients={async () => {
              console.log("🔄 [App.jsx] Recarregando pacientes...");
              try {
                const data = await fetchPatients();
                console.log("👥 [App.jsx] Pacientes recarregados:", data?.length || 0);
                setPatients(data || []);
                setPatientsError(!data || data.length === 0 ? 'empty' : null);
              } catch (err) {
                console.error("❌ [App.jsx] Erro ao recarregar pacientes:", err);
                setPatientsError('auth');
                setPatients([]);
              }
            }}
            authError={patientsError === 'auth'}
          />
        </div>
      )}

      {isProfessionalsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <ProfessionalsModal
            professionals={professionals}
            onAdd={handleAddProfessional}
            onDelete={handleDeleteProfessional}
            onClose={() => setIsProfessionalsModalOpen(false)}
          />
        </div>
      )}

      {isReminderOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <ReminderModal
            appointment={reminderAppointment}
            onSave={saveReminder}
            onClose={() => {
              setIsReminderOpen(false);
              setReminderAppointment(null);
            }}
          />
        </div>
      )}

      <RemindersListModal
        open={isRemindersListOpen}
        reminders={reminders}
        onClose={() => setIsRemindersListOpen(false)}
        onDone={async (r) => {
          await markReminderDone(r.id);
          toast.success("Lembrete concluído!");
        }}
        onCancel={async (r) => {
          await cancelReminder(r.id);
          toast.success("Lembrete cancelado!");
        }}
        onSnooze7={async (r) => {
          await snoozeReminderDays(r.id, 7);
          toast.success("Lembrete adiado +7 dias!");
        }}
        onOpenAppointment={(appointmentId) => {
          toast.info(`Abrir agendamento: ${appointmentId}`);
        }}
      />
      
      {/* Modal QR Code Global */}
      <WhatsAppQRGlobal />
    </div>
  );
}