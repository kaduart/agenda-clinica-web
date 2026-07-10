
// src/App.jsx
import React, { useEffect, useMemo } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Firebase removido - Agora usamos API + Socket.io

import AppointmentTable from "./components/AppointmentTable";
import FiltersPanel from "./components/FiltersPanel";
import Header from "./components/Header";
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
  adminEditAppointment,
  cancelAppointment,
  hardDeleteAppointment,
  fetchAvailableSlots,
  generateCycleAppointments,
} from "./services/appointmentsRepo";

import { approvePreAppointment, discardPreAppointment, cancelPreAppointment, updatePreAppointment } from "./services/preAppointmentsRepo";

import {
  addProfessional,
  deleteProfessional,
  listenProfessionals
} from "./services/professionalsRepo";
import { fetchPatients, updatePatient } from "./services/patientsRepo";

import { confirmToast } from "./utils/confirmToast";
import { formatDateLocal, getWeeksInMonth, extractDateForInput } from "./utils/date";
import { sortAppointmentsByDateTimeAsc } from "./utils/sort";
import { resolveSpecialtyKey } from "./utils/specialty";
import { SPECIALTIES } from "./config/specialties";

import ReminderModal from "./components/ReminderModal";
import RemindersListModal from "./components/RemindersListModal";
import PostAppointmentModal from "./components/PostAppointmentModal";


// crmExport removido pois a sincronização agora é automática no repo
// import { ... } from "./services/crmExport"; 

import { cancelReminder, listenReminders, markReminderDone, snoozeReminderDays } from "./services/remindersRepo";
import "./styles/app.css";

export default function App() {

  const [view, setView] = React.useState("list");
  const [appointments, setAppointments] = React.useState([]);
  const [professionals, setProfessionals] = React.useState([]);
  const [patients, setPatients] = React.useState([]);
  const [patientsError, setPatientsError] = React.useState(null);

  const today = new Date();
  const todayFormatted = formatDateLocal(today);
  const todayDayOfWeek = (today.getDay() === 0 ? 7 : today.getDay()).toString();

  // Restaura filtro de data do sessionStorage (isolado por aba — cada aba/PC tem seu próprio dia).
  // sessionStorage não é compartilhado entre abas nem entre PCs, resolvendo o problema
  // de um usuário alterar o filtro e afetar todos os outros logados.
  const getSavedDate = () => {
    try {
      const saved = sessionStorage.getItem('agendaFilterDate');
      const savedDay = sessionStorage.getItem('agendaFilterDay');
      if (saved) {
        return { date: saved, day: savedDay || todayDayOfWeek };
      }
    } catch (e) {
      console.error("[App.jsx] Erro ao ler sessionStorage:", e);
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
  
  // Salva a data no sessionStorage quando mudar (isolado por aba)
  React.useEffect(() => {
    try {
      if (filters.filterDate) {
        sessionStorage.setItem('agendaFilterDate', filters.filterDate);
        sessionStorage.setItem('agendaFilterDay', filters.filterDay || todayDayOfWeek);
      }
    } catch (e) {
      console.error("[App.jsx] Erro ao salvar sessionStorage:", e);
    }
  }, [filters.filterDate, filters.filterDay]);
  
  // Estado para forçar refresh da lista após operações (criar, editar, cancelar, deletar)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingAppointment, setEditingAppointment] = React.useState(null);
  const [isProfessionalsModalOpen, setIsProfessionalsModalOpen] = React.useState(false);
  const [isReminderOpen, setIsReminderOpen] = React.useState(false);
  const [reminderAppointment, setReminderAppointment] = React.useState(null);
  const [reminders, setReminders] = React.useState([]);
  const [isRemindersListOpen, setIsRemindersListOpen] = React.useState(false);
  const [isPostAppointmentOpen, setIsPostAppointmentOpen] = React.useState(false);
  const [postAppointmentData, setPostAppointmentData] = React.useState(null);

  const [availableSlots, setAvailableSlots] = React.useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = React.useState(true);
  
  // Função global para forçar refresh da lista de appointments
  const forceRefreshAppointments = React.useCallback(() => {
    // Dispara refresh do useEffect de appointments (listener)
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // ========== DISPONIBILIDADE REAL (Slots Virtuais) ==========
  useEffect(() => {
    const fetchSlots = async () => {
      // Só busca se houver profissional E data selecionados
      if (filters.filterProfessional && filters.filterDate && filters.filterProfessional.toLowerCase() !== "livre") {
        const doc = (professionals || []).find(p => p.fullName === filters.filterProfessional);
        if (doc?.id) {
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

  const openPostAppointment = (appointment) => {
    setPostAppointmentData(appointment);
    setIsPostAppointmentOpen(true);
  };

  // O modal de lembrete cria entidade Reminder diretamente (remindersRepo.addReminder).
  // Não há mais upsert no campo legado reminderText do appointment.
  const saveReminder = async () => {
    // noop — mantido para compatibilidade com a prop onSave do ReminderModal.
    console.warn('[saveReminder] Via legada chamada. Use Reminder entity (remindersRepo.addReminder).');
  };

  // ========== LISTENERS ==========
  useEffect(() => {
    const unsub = listenProfessionals((data) => {
      setProfessionals(data);
    });
    return () => {
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

    setIsLoadingAppointments(true);
    console.log(`[App.jsx] Carregando appointments: ${targetYear}-${targetMonth + 1}, specificDate=${specificDate}`);
    const unsub = listenAppointmentsForMonth(targetYear, targetMonth, (data) => {
      console.log(`[App.jsx] Appointments carregados: ${data.length}`);
      setAppointments(data);
      setIsLoadingAppointments(false);
    }, specificDate);
    return () => {
      unsub();
    };
  }, [currentYear, currentMonth, filters.filterDate, refreshTrigger]);

  // 🆕 Pré-agendamentos agora vêm pelo endpoint unificado /api/v2/appointments (includePreAgendamentos=true)
  // Não é mais necessário buscar separadamente em /api/v2/pre-appointments para exibição na agenda.

  useEffect(() => {
    const unsub = listenReminders((list) => setReminders(list));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = listenToNotifications((notif) => {
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
        // ESPECIALIDADE — garante que a especialidade selecionada no modal seja respeitada
        specialty: appointmentData.specialty,
        specialtyKey: appointmentData.specialtyKey,
        // CRM cru — o adapter V2 normaliza antes de enviar
        crm: appointmentData.crm
      };

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
      return;
    }
    
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

    const isCompleted = appointment.operationalStatus === 'completed';

    try {
      if (isPre) {
        // Pré-agendamento: cancela (status = 'cancelado')
        await cancelPreAppointment(appointment.id);
        toast.success("Pré-agendamento cancelado!");
      } else if (isCompleted) {
        // Agendamento concluído: requer forceCancel explícito, sem estornar pagamento
        await cancelAppointment(appointment.id, reason, { forceCancel: true, reverseFinancial: false });
        toast.success("Agendamento revertido (force_cancelled). Pagamento preservado.");
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


  const buildConflictMessage = (err) => {
    const data = err.response?.data;
    const conflict = data?.conflict;
    if (err.response?.status === 409 && conflict) {
      const who = conflict.patientName || conflict.doctorName || 'outro paciente';
      const appt = conflict.existingAppointment || {};
      const dateStr = appt.date ? appt.date.slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '';
      const timeStr = appt.time || '';
      const parts = ['Horário'];
      if (timeStr) parts.push(timeStr);
      if (dateStr) parts.push(`do dia ${dateStr}`);
      parts.push(`já ocupado por ${who}`);
      return parts.join(' ');
    }
    return 'Erro ao salvar: ' + (data?.error || err.message);
  };

  const saveAppointment = async (appointmentData) => {
    
    const appointmentId = editingAppointment?.id || editingAppointment?._id || editingAppointment?.preAgendamentoId || editingAppointment?.appointmentId;
    // 🎯 FONTE ÚNICA DA VERDADE: operationalStatus define se é pré-agendamento
    const isPreEditing = editingAppointment?.operationalStatus === 'pre_agendado';
    const isEditing = !!appointmentId && !isPreEditing;
    const isImportingPre = isPreEditing;
    

    // Se for pré-agendamento EXISTENTE, verifica se está cancelando ou apenas atualizando
    if (isPreEditing && appointmentId) {
      try {
        // Se o status mudou para cancelado, chama a rota de cancelar
        if (appointmentData.operationalStatus === 'canceled' || appointmentData.operationalStatus === 'cancelado') {
          await cancelPreAppointment(appointmentId);
          toast.success("Pré-agendamento cancelado!");
          setIsModalOpen(false);
          setEditingAppointment(null);
          forceRefreshAppointments();
          return;
        }

        
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

        await updatePreAppointment(appointmentId, updateData);
        toast.success("Pré-agendamento atualizado!");
        setIsModalOpen(false);
        setEditingAppointment(null);
        forceRefreshAppointments();
        return;
      } catch (err) {
        console.error("❌ Erro ao atualizar pré-agendamento:", err);
        toast.error(buildConflictMessage(err));
        throw err; // Propaga erro para o modal saber que falhou
      }
    }

    
    // Edição de appointment completed: usa admin-edit com TODOS os campos do modal
    if (isEditing && editingAppointment?.operationalStatus === 'completed') {
      try {
        const adminFields = {
          patientName: appointmentData.patientName ?? appointmentData.patient,
          patientId: appointmentData.patientId,
          phone: appointmentData.phone,
          birthDate: appointmentData.birthDate,
          email: appointmentData.email,
          responsible: appointmentData.responsible,
          date: appointmentData.date,
          time: appointmentData.time,
          professional: appointmentData.professional,
          professionalName: appointmentData.professionalName,
          professionalId: appointmentData.professionalId,
          specialty: appointmentData.specialty,
          specialtyKey: appointmentData.specialtyKey,
          operationalStatus: appointmentData.operationalStatus,
          notes: appointmentData.observations ?? appointmentData.notes,
          observations: appointmentData.observations,
          paymentStatus: appointmentData.paymentStatus,
          billingType: appointmentData.billingType,
          insuranceProvider: appointmentData.insuranceProvider,
          insuranceValue: appointmentData.insuranceValue,
          authorizationCode: appointmentData.authorizationCode,
          package: appointmentData.package,
          sessionValue: appointmentData.sessionValue ?? appointmentData.crm?.paymentAmount,
          paymentMethod: appointmentData.paymentMethod ?? appointmentData.crm?.paymentMethod,
          paymentAmount: appointmentData.paymentAmount ?? appointmentData.crm?.paymentAmount,
          serviceType: appointmentData.crm?.serviceType ?? appointmentData.serviceType,
          sessionType: appointmentData.crm?.sessionType ?? appointmentData.sessionType,
          crm: appointmentData.crm,
          isJointSession: appointmentData.crm?.serviceType === 'joint_session',
        };
        // Remove undefined/null para não enviar campos vazios
        Object.keys(adminFields).forEach(k => { if (adminFields[k] == null) delete adminFields[k]; });
        await adminEditAppointment(appointmentId, adminFields, 'Edição via modal');
        // Atualiza telefone do paciente se houver patientId (admin-edit não atualiza o cadastro do paciente)
        if (appointmentData.patientId && appointmentData.phone != null) {
          try {
            await updatePatient(appointmentData.patientId, {
              phone: appointmentData.phone,
              ...(appointmentData.email != null ? { email: appointmentData.email } : {}),
              ...(appointmentData.birthDate != null ? { dateOfBirth: appointmentData.birthDate } : {}),
            });
            toast.success("Telefone do paciente atualizado!");
            handleReloadPatients();
          } catch (patientErr) {
            console.error('[saveAppointment] Erro ao atualizar paciente:', patientErr);
            toast.error("Telefone do paciente não atualizado: " + (patientErr.response?.data?.error || patientErr.message));
          }
        }
        toast.success("Agendamento atualizado!");
        setIsModalOpen(false);
        setEditingAppointment(null);
        forceRefreshAppointments();
      } catch (err) {
        const msg = err.response?.data?.error || err.message;
        toast.error("Erro ao salvar: " + msg);
        throw err;
      }
      return;
    }

    const newStatus = appointmentData.operationalStatus;
    const originalStatus = editingAppointment?.operationalStatus;

    // 🎯 ROTEAMENTO POR TRANSIÇÃO DE STATUS
    // O modal é o cockpit — cada transição vai para o endpoint correto
    if (isEditing && newStatus !== originalStatus) {

      // canceled → endpoint dedicado /cancel com todos os campos relevantes
      if (newStatus === 'canceled') {
        const reason = prompt("Motivo do cancelamento:", "Cancelado pela secretária");
        if (!reason) return;
        try {
          await cancelAppointment(appointmentId, reason, {
            forceCancel: originalStatus === 'completed',
            reverseFinancial: false,
            notes: appointmentData.observations ?? appointmentData.notes,
            responsible: appointmentData.responsible,
          });
          toast.success("Agendamento cancelado!");
          setIsModalOpen(false);
          setEditingAppointment(null);
          forceRefreshAppointments();
        } catch (err) {
          toast.error("Erro ao cancelar: " + (err.response?.data?.error || err.message));
          throw err;
        }
        return;
      }

      // completed → bloqueia via modal (use botão Complete no CRM)
      if (newStatus === 'completed') {
        toast.warning("Para concluir um atendimento, use o fluxo de conclusão no CRM.");
        return;
      }
    }

    const candidate = {
      ...(isEditing ? editingAppointment : {}),
      ...appointmentData,
    };

    if (appointmentId && isEditing) candidate.id = appointmentId;

    // 1. Checagem de conflito local visual (rápida)
    if (hasConflict(appointments, candidate, isEditing ? appointmentId : null)) {
      toast.warning("⚠️ Atenção: Conflito visual detectado no seu calendário.");
    }

    try {
      const result = await upsertAppointment({
        editingAppointment: isEditing ? { id: appointmentId } : null,
        appointmentData: candidate
      });

      toast.success(isEditing ? "Agendamento atualizado!" : "Agendamento criado!");

      setIsModalOpen(false);
      setEditingAppointment(null);

      forceRefreshAppointments();

    } catch (err) {
      // Fallback: completed no banco mas estado local desatualizado
      if (isEditing && err.response?.data?.code === 'CANNOT_EDIT_COMPLETED_APPOINTMENT') {
        try {
          const adminFields = {
            patientName: appointmentData.patientName ?? appointmentData.patient,
            patientId: appointmentData.patientId,
            phone: appointmentData.phone,
            birthDate: appointmentData.birthDate,
            email: appointmentData.email,
            responsible: appointmentData.responsible,
            date: appointmentData.date,
            time: appointmentData.time,
            professional: appointmentData.professional,
            professionalName: appointmentData.professionalName,
            professionalId: appointmentData.professionalId,
            specialty: appointmentData.specialty,
            specialtyKey: appointmentData.specialtyKey,
            operationalStatus: appointmentData.operationalStatus,
            notes: appointmentData.observations ?? appointmentData.notes,
            observations: appointmentData.observations,
            paymentStatus: appointmentData.paymentStatus,
            billingType: appointmentData.billingType,
            insuranceProvider: appointmentData.insuranceProvider,
            insuranceValue: appointmentData.insuranceValue,
            authorizationCode: appointmentData.authorizationCode,
            package: appointmentData.package,
            sessionValue: appointmentData.sessionValue ?? appointmentData.crm?.paymentAmount,
            paymentMethod: appointmentData.paymentMethod ?? appointmentData.crm?.paymentMethod,
            paymentAmount: appointmentData.paymentAmount ?? appointmentData.crm?.paymentAmount,
            serviceType: appointmentData.crm?.serviceType ?? appointmentData.serviceType,
            sessionType: appointmentData.crm?.sessionType ?? appointmentData.sessionType,
            crm: appointmentData.crm,
            isJointSession: appointmentData.crm?.serviceType === 'joint_session',
          };
          Object.keys(adminFields).forEach(k => { if (adminFields[k] == null) delete adminFields[k]; });
          await adminEditAppointment(appointmentId, adminFields, 'Edição via modal (completed)');
          // Atualiza telefone do paciente se houver patientId (admin-edit não atualiza o cadastro do paciente)
          if (appointmentData.patientId && appointmentData.phone != null) {
            try {
              await updatePatient(appointmentData.patientId, {
                phone: appointmentData.phone,
                ...(appointmentData.email != null ? { email: appointmentData.email } : {}),
                ...(appointmentData.birthDate != null ? { dateOfBirth: appointmentData.birthDate } : {}),
              });
              toast.success("Telefone do paciente atualizado!");
              handleReloadPatients();
            } catch (patientErr) {
              console.error('[saveAppointment] Erro ao atualizar paciente:', patientErr);
              toast.error("Telefone do paciente não atualizado: " + (patientErr.response?.data?.error || patientErr.message));
            }
          }
          toast.success("Agendamento atualizado!");
          setIsModalOpen(false);
          setEditingAppointment(null);
          forceRefreshAppointments();
          return;
        } catch (adminErr) {
          toast.error("Erro ao salvar: " + (adminErr.response?.data?.error || adminErr.message));
          throw adminErr;
        }
      }
      console.error("[saveAppointment] Erro:", err);
      toast.error(buildConflictMessage(err));
      throw err;
    }
  };

  // ========== RESTO DAS FUNÇÕES ==========

  const openEditModal = (appointment) => {
    setEditingAppointment(appointment);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {

    const firstProf = professionals[0];
    const profName = firstProf?.fullName || firstProf?.name || "";
    const specialtyKey = activeSpecialty === "todas" 
      ? "fonoaudiologia"
      : activeSpecialty;

    setEditingAppointment({
      date: formatDateLocal(new Date()),
      time: "08:00",
      professional: profName,
      specialty: specialtyKey,
      specialtyKey: specialtyKey,
      operationalStatus: "pre_agendado",
      patient: "",
      responsible: "",
      observations: "",
    });

    setIsModalOpen(true);
  };

  const handleSlotClick = (payload) => {

    if (payload?.__isEmptySlot) {
      const payloadProf = payload.professional;
      const profName = typeof payloadProf === 'object' && payloadProf !== null
        ? (payloadProf.fullName || payloadProf.name || "")
        : (payloadProf || "");
      const specialtyKey = activeSpecialty === "todas"
        ? "fonoaudiologia"
        : activeSpecialty;

      setEditingAppointment({
        date: payload.date,
        time: payload.time,
        professional: profName,
        specialty: specialtyKey,
        specialtyKey: specialtyKey,
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

  const handleCloseModal = React.useCallback(() => {
    // O fechamento do modal NÃO cancela pré-agendamentos automaticamente.
    // O cancelamento só ocorre via ações explícitas do usuário:
    //   - botão "Cancelar" / menu de cancelamento na listagem (onCancel)
    //   - mudança de status para cancelado dentro do modal (saveAppointment / handleConfirmPre)
    setIsModalOpen(false);
    setEditingAppointment(null);
  }, []);

  const handleReloadPatients = React.useCallback(async () => {
    try {
      const data = await fetchPatients();
      setPatients(data || []);
      setPatientsError(!data || data.length === 0 ? 'empty' : null);
    } catch (err) {
      console.error("❌ [App.jsx] Erro ao recarregar pacientes:", err);
      setPatientsError('auth');
      setPatients([]);
    }
  }, []);

  // ========== DERIVED LISTS (separação de pipelines) ==========
  // 🆕 Pré-agendamentos vêm pelo endpoint unificado; mantido array vazio para compatibilidade
  const mappedPreAppointments = React.useMemo(() => [], []);

  // Pipeline para Calendar / Weekly (tudo que cai no mês)
  const calendarAppointments = React.useMemo(() => {
    return [...(appointments || []), ...mappedPreAppointments];
  }, [appointments, mappedPreAppointments]);

  // Pipeline para List View (appointments filtrados + todos os pré-agendamentos pendentes)
  const filteredAppointments = React.useMemo(() => {
    console.log('[filteredAppointments] Iniciando filtro:', {
      totalAppointments: appointments?.length,
      totalPreAppointments: mappedPreAppointments?.length,
      activeSpecialty,
      filters,
      currentYear,
      currentMonth
    });

    const weeks = getWeeksInMonth(currentYear, currentMonth);
    const isPreAgendamento = (appt) => appt?.operationalStatus === 'pre_agendado';

    // 1. Filtrar appointments REAIS por data/semana/especialidade
    let filteredReals = (appointments || []).filter((appointment) => {
      if (activeSpecialty && activeSpecialty !== "todas") {
        if (resolveSpecialtyKey(appointment) !== activeSpecialty) return false;
      }

      if (filters.filterDate) {
        if (extractDateForInput(appointment.date) !== filters.filterDate) return false;
      } else {
        if (filters.filterDay) {
          const dateStr = extractDateForInput(appointment.date);
          if (!dateStr) return false;
          const [y, m, d] = dateStr.split("-").map(Number);
          const dateObj = new Date(y, m - 1, d);
          if (dateObj.getDay() !== Number(filters.filterDay)) return false;
        }
        if (filters.filterWeek !== null && filters.filterWeek !== undefined) {
          const w = weeks[filters.filterWeek];
          if (!w) return false;
          const toKey = (v) => (typeof v === "string" ? v.replaceAll("-", "") : formatDateLocal(v).replaceAll("-", ""));
          const dKey = toKey(extractDateForInput(appointment.date));
          if (!(dKey >= toKey(w.start) && dKey <= toKey(w.end))) return false;
        }
      }
      return true;
    });
    console.log('[filteredAppointments] Após filtro de appointments reais:', filteredReals.length, {
      amostra: filteredReals.slice(0, 3).map(a => ({ id: a.id, date: a.date, specialty: a.specialty, status: a.operationalStatus, professional: a.professional, professionalId: a.professionalId, doctor: a.doctor }))
    });
    console.log('[filteredAppointments] Profissionais dos reais:', filteredReals.map(a => ({ id: a.id, professional: a.professional, professionalId: a.professionalId, doctorId: a.doctor?.id || a.doctor?._id })));

    // 2. Filtrar pré-agendamentos por especialidade e por data do agendamento
    let filteredPres = mappedPreAppointments.filter((appointment) => {
      if (activeSpecialty && activeSpecialty !== "todas") {
        if (resolveSpecialtyKey(appointment) !== activeSpecialty) return false;
      }
      // Mostrar pré-agendamento apenas no dia da consulta, não no dia da criação
      if (filters.filterDate) {
        if (extractDateForInput(appointment.date) !== filters.filterDate) return false;
      }
      return true;
    });

    // 3. Remover pré-agendamentos descartados/cancelados
    filteredPres = filteredPres.filter(appointment => {
      const realStatus = appointment.metadata?.preAgendamentoStatus || appointment.originalData?.status;
      if (realStatus === 'desistiu' || realStatus === 'descartado') {
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
        return samePatient && extractDateForInput(real.date) === extractDateForInput(appointment.date) && real.time === appointment.time && real.professional === appointment.professional;
      });
      if (hasRealAppointment) {
        return false;
      }
      return true;
    });

    // 5. Filtros secundários (profissional / status) aplicados em ambos
    const selectedProf = filters.filterProfessional
      ? (professionals || []).find(p => p.fullName === filters.filterProfessional)
      : null;

    const normalizeForCompare = (str) =>
      (str || "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const applySecondaryFilters = (list) => list.filter(appointment => {
      if (filters.filterProfessional) {
        if (filters.filterProfessional.toLowerCase() === "livre") {
          const pName = appointment.patient?.name || appointment.patient?.fullName || (typeof appointment.patient === 'string' ? appointment.patient : '') || "";
          const isLivre =
            (appointment.professional && appointment.professional.toLowerCase().includes("livre")) ||
            (pName.toLowerCase().includes("livre")) ||
            (appointment.observations && appointment.observations.toLowerCase().includes("livre"));
          if (!isLivre) return false;
        } else {
          // Compara preferencialmente por ID para evitar problemas de nome ligeiramente diferente
          const appointmentProfId = appointment.professionalId || appointment.doctor?.id || appointment.doctor?._id;
          const selectedProfId = selectedProf?.id || selectedProf?._id;
          if (selectedProfId && appointmentProfId && selectedProfId.toString() === appointmentProfId.toString()) {
            // mantém o registro
          } else if (normalizeForCompare(appointment.professional) !== normalizeForCompare(filters.filterProfessional)) {
            return false;
          }
        }
      }
      if (filters.filterStatus) {
        // O backend considera "Pendente" como scheduled + pending.
        // No frontend, scheduled é traduzido como "Agendado" e pending como "Pendente".
        if (filters.filterStatus === "Pendente") {
          if (appointment.status !== "Pendente" && appointment.status !== "Agendado") return false;
        } else if (appointment.status !== filters.filterStatus) {
          return false;
        }
      }
      return true;
    });

    filteredReals = applySecondaryFilters(filteredReals);
    filteredPres = applySecondaryFilters(filteredPres);
    console.log('[filteredAppointments] Após filtros secundários:', {
      filteredReals: filteredReals.length,
      filteredPres: filteredPres.length,
      filterProfessional: filters.filterProfessional,
      selectedProfId: selectedProf?.id || selectedProf?._id || null
    });

    // 6. Merge
    let base = [...filteredReals, ...filteredPres];

    // 7. Slots virtuais (só quando filtro profissional + data ativo)
    if (filters.filterProfessional && filters.filterDate && availableSlots.length > 0) {
      const selectedProf = professionals.find(p => p.fullName === filters.filterProfessional);
      const profSpecialty = selectedProf?.specialty || activeSpecialty;
      const virtualAppointments = availableSlots
        .filter(slot => (typeof slot === 'string' ? true : slot.available))
        .map(slot => {
          const time = typeof slot === 'string' ? slot : slot.time;
          return {
            id: `virtual_${filters.filterDate}_${time}_${filters.filterProfessional}`,
            date: filters.filterDate,
            time,
            professional: filters.filterProfessional,
            specialty: profSpecialty,
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
        return false;
      }
      seenIds.add(appointment.id);
      return true;
    });

    base = sortAppointmentsByDateTimeAsc(base);
    console.log('[filteredAppointments] Resultado final:', base.length, {
      amostra: base.slice(0, 3).map(a => ({ id: a.id, date: a.date, patientName: a.patientName, professional: a.professional, professionalId: a.professionalId }))
    });
    return base;
  }, [appointments, mappedPreAppointments, activeSpecialty, filters, currentYear, currentMonth, availableSlots]);

  // ========== PROFESSIONALS ==========
  const onOpenProfessionals = () => {
    setIsProfessionalsModalOpen(true);
  };

  const handleAddProfessional = async (payload) => {
    try {
      await addProfessional(payload);
      toast.success(`Profissional "${payload.fullName}" adicionado!`);
      setIsProfessionalsModalOpen(false);
      // Re-busca a lista para refletir o novo profissional
      listenProfessionals(setProfessionals);
    } catch (e) {
      console.error("[handleAddProfessional]", e);
      toast.error(e?.response?.data?.error?.message || e?.response?.data?.message || "Erro ao adicionar profissional.");
      throw e; // re-throw para o modal saber que falhou e não resetar o form
    }
  };

  const handleResetFilters = () => {
    setFilters({
      filterDate: "",
      filterProfessional: "",
      filterStatus: "",
      filterDay: "",
      filterWeek: null,
    });
  };

  const handleDeleteProfessional = async (prof) => {
    const ok = await confirmToast(`Remover o profissional "${prof.fullName || prof.name}"?`, { confirmText: "Remover", confirmColor: "red" });
    if (!ok) return;
    try {
      await deleteProfessional(prof.id || prof._id);
      toast.success(`Profissional "${prof.fullName || prof.name}" removido!`);
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
              isLoading={isLoadingAppointments}
              onEdit={openEditModal}
              onDelete={onDelete}
              onCancel={onCancel}
              onReminder={openReminder}
              onPostAppointment={openPostAppointment}
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
              activeSpecialty={activeSpecialty}
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
            appointments={appointments}
            onSave={saveAppointment}
            onConfirmPre={onConfirmPreAppointment}
            onClose={handleCloseModal}
            onReloadPatients={handleReloadPatients}
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
            // Nota: ReminderModal usa addReminder diretamente; onSave é legado.
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

      {isPostAppointmentOpen && postAppointmentData && (
        <PostAppointmentModal
          appointment={postAppointmentData}
          onSent={(type) => {
            const now = new Date().toISOString();
            const field = type === 'msg2' ? 'reviewRequestSentAt' : 'postAppointmentSentAt';
            setAppointments(prev => prev.map(a =>
              (a.id === postAppointmentData.id || a._id === postAppointmentData._id)
                ? { ...a, [field]: now }
                : a
            ));
            setPostAppointmentData(prev => prev ? { ...prev, [field]: now } : prev);
          }}
          onClose={() => {
            setIsPostAppointmentOpen(false);
            setPostAppointmentData(null);
          }}
        />
      )}
      

    </div>
  );
}