
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

import CalendarView from "./components/CalendarView";
import WeeklyView from "./components/WeeklyView";

import AppointmentModal from "./components/AppointmentModal";
import ProfessionalsModal from "./components/ProfessionalsModal";

import {
  hasConflict,
  listenAppointmentsForMonth,
  listenToNotifications,
  upsertAppointment,
  confirmAppointment,
  cancelAppointment,
  hardDeleteAppointment,
} from "./services/appointmentsRepo";

import { approvePreAppointment, discardPreAppointment, fetchPreAppointments } from "./services/preAppointmentsRepo";

import {
  addProfessional,
  deleteProfessionalByName,
  listenProfessionals
} from "./services/professionalsRepo";

import { confirmToast } from "./utils/confirmToast";
import { formatDateLocal, getWeeksInMonth } from "./utils/date";
import { sortAppointmentsByDateTimeAsc } from "./utils/sort";
import { resolveSpecialtyKey } from "./utils/specialty";

import ReminderModal from "./components/ReminderModal";
import RemindersListModal from "./components/RemindersListModal";

// crmExport removido pois a sincronização agora é automática no repo
// import { ... } from "./services/crmExport"; 

import { cancelReminder, listenReminders, markReminderDone, snoozeReminderDays } from "./services/remindersRepo";
import "./styles/app.css";
console.log("🚀🚀🚀 APP.JSX CARREGADO - VERSÃO MIGRADA API!");

export default function App() {
  console.log("📱 [App.jsx] Componente App montando - VERSÃO API!");

  const [view, setView] = React.useState("list");
  const [appointments, setAppointments] = React.useState([]);
  const [professionals, setProfessionals] = React.useState([]);

  const today = new Date();
  const todayFormatted = formatDateLocal(today);
  const todayDayOfWeek = (today.getDay() === 0 ? 7 : today.getDay()).toString();

  const [activeSpecialty, setActiveSpecialty] = React.useState("todas");
  const [currentMonth, setCurrentMonth] = React.useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear());

  const [filters, setFilters] = React.useState({
    filterDate: todayFormatted,
    filterProfessional: "",
    filterStatus: "",
    filterDay: todayDayOfWeek,
    filterWeek: null,
  });

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingAppointment, setEditingAppointment] = React.useState(null);
  const [isProfessionalsModalOpen, setIsProfessionalsModalOpen] = React.useState(false);
  const [isReminderOpen, setIsReminderOpen] = React.useState(false);
  const [reminderAppointment, setReminderAppointment] = React.useState(null);
  const [reminders, setReminders] = React.useState([]);
  const [isRemindersListOpen, setIsRemindersListOpen] = React.useState(false);

  const [preAppointments, setPreAppointments] = React.useState([]);
  const [availableSlots, setAvailableSlots] = React.useState([]);

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
      unsub(); // É async/no-op agora, mas mantemos a chamada
    };
  }, []);

  useEffect(() => {
    let targetYear = currentYear;
    let targetMonth = currentMonth;

    if (filters.filterDate) {
      const [y, m] = filters.filterDate.split("-").map(Number);
      targetYear = y;
      targetMonth = m - 1;
    }

    console.log(`👂 [App.jsx] Listener de appointments: ${targetYear}/${targetMonth + 1}`);
    const unsub = listenAppointmentsForMonth(targetYear, targetMonth, (data) => {
      console.log("👂 [App.jsx] Appointments recebidos:", data.length);
      setAppointments(data);
    });
    return () => {
      console.log("👂 [App.jsx] Listener de appointments desmontado");
      unsub();
    };
  }, [currentYear, currentMonth, filters.filterDate]);

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
        // O listener de appointments já recarrega a lista via socket, 
        // mas podemos forçar o fetch de pré-agendamentos se necessário.
        fetchPreAppointments(filters.filterDate || todayFormatted).then(setPreAppointments);
      }
    });
    return () => unsub();
  }, [filters.filterDate, todayFormatted]);

  // ========== LABEL DA ESPECIALIDADE ATUAL ==========
  const activeSpecialtyLabel = useMemo(() => {
    if (activeSpecialty === "fonoaudiologia") return "Fonoaudiologia";
    if (activeSpecialty === "psicologia") return "Psicologia";
    if (activeSpecialty === "terapia_ocupacional") return "Terapia Ocupacional";
    if (activeSpecialty === "fisioterapia") return "Fisioterapia";
    return "";
  }, [activeSpecialty]);

  // ========== FUNÇÕES DE AÇÃO (Simplificadas para API) ==========

  // EXCLUIR (Hard Delete) - Remove do banco
  const onDelete = async (id) => {
    const isPre = (filteredAppointments || []).find(a => a.id === id)?.__isPreAgendamento;

    // Se for pré, também podemos excluir permanentemente se o usuário quiser (limpar lixo)
    const msg = isPre
      ? "⚠ Tem certeza que deseja EXCLUIR PERMANENTEMENTE este interesse? (Não poderá ser desfeito)"
      : "⚠ Tem certeza que deseja EXCLUIR PERMANENTEMENTE este agendamento? (Histórico será perdido)";

    const ok = await confirmToast(msg);
    if (!ok) return;

    try {
      console.log("🚀 PROCESSANDO HARD DELETE ID:", id);
      // Para pré-agendamentos, a rota de delete também funciona se for pelo ID do banco
      // Se for um pré-agendamento apenas em memória (sem ID), não dá pra excluir do banco.

      await hardDeleteAppointment(id);
      toast.success("Registro excluído permanentemente!");

      // Atualiza listas
      if (isPre) {
        fetchPreAppointments(filters.filterDate || todayFormatted).then(setPreAppointments);
      } else {
        // Force refresh
        setFilters(prev => ({ ...prev }));
      }

    } catch (e) {
      console.error("❌ ERRO:", e);
      toast.error("Erro ao excluir: " + (e.response?.data?.error || e.message));
    }
  };

  // CANCELAR específico (Unificado: Soft Delete para Regular e Discard para Pre)
  const onCancel = async (appointment) => {
    const isPre = appointment.__isPreAgendamento;
    const actionName = isPre ? "descartar este interesse" : "cancelar este agendamento";

    // Confirmação rápida (opcional, mas bom para evitar cliques acidentais se não tiver prompt)
    // Para regular pede motivo, para pre poderia só confirmar ou pedir motivo também.

    let reason = "Cancelado via Web App";

    if (isPre) {
      // Para pré, apenas confirmamos (ou usamos prompt se quiser motivo de descarte)
      const ok = await confirmToast(`Deseja ${actionName}?`);
      if (!ok) return;
      reason = "Descartado pela secretária";
    } else {
      reason = prompt("Motivo do cancelamento:", "Cancelado pelo paciente");
      if (!reason) return;
    }

    try {
      if (isPre) {
        await discardPreAppointment(appointment.id, reason);
        toast.success("Interesse descartado (Cancelado)!");
      } else {
        await cancelAppointment(appointment.id, reason);
        toast.success("Agendamento cancelado!");
      }
    } catch (e) {
      console.error("[onCancel]", e);
      toast.error("Erro ao cancelar: " + e.message);
    }
  };

  // CONFIRMAR (Amanda/Agenda Externa)
  const handleConfirmAppointment = async (appointment) => {
    // 1. Extrair ID do pré-agendamento ou External ID
    // O backend bindou: metadata.origin.preAgendamentoId
    const preAgendamentoId = appointment.metadata?.origin?.preAgendamentoId;

    if (!preAgendamentoId) {
      console.error("Agendamento sem preAgendamentoId:", appointment);
      toast.error("Erro: Agendamento sem vínculo claro com a solicitação original.");
      return;
    }

    const ok = await confirmToast(`Confirmar agendamento de ${appointment.patientName || "Paciente"}?`);
    if (!ok) return;

    try {
      await confirmAppointment(preAgendamentoId);
      toast.success("Agendamento confirmado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao confirmar: " + (error.response?.data?.error || error.message));
    }
  };

  const saveAppointment = async (appointmentData) => {
    console.log("🔥🔥🔥 [saveAppointment] START");
    const appointmentId = editingAppointment?.id;
    const isEditing = !!appointmentId && !editingAppointment?.__isPreAgendamento;
    const isImportingPre = !!editingAppointment?.__isPreAgendamento;

    if (isImportingPre) {
      try {
        console.log("🔥 [saveAppointment] Confirmando Pré-Agendamento...");
        const doc = (professionals || []).find(p => p.fullName === appointmentData.professional);

        const importData = {
          doctorId: doc?.id,
          date: appointmentData.date,
          time: appointmentData.time,
          sessionValue: Number(appointmentData.crm?.paymentAmount || 0),
          serviceType: appointmentData.crm?.sessionType === 'avaliacao' ? 'evaluation' : 'session',
          paymentMethod: appointmentData.crm?.paymentMethod || 'pix',
          notes: appointmentData.observations
        };

        await approvePreAppointment(appointmentId, importData);
        toast.success("Agendamento confirmado com sucesso!");
        setIsModalOpen(false);
        setEditingAppointment(null);
        return;
      } catch (err) {
        console.error("❌ Erro ao confirmar pré-agendamento:", err);
        toast.error("Erro ao confirmar: " + (err.response?.data?.error || err.message));
        return;
      }
    }

    const candidate = {
      ...(isEditing ? editingAppointment : {}),
      ...appointmentData,
      status: appointmentData.status === "Vaga" ? "Pendente" : appointmentData.status,
    };

    if (appointmentId && isEditing) candidate.id = appointmentId;

    // 1. Checagem de conflito local visual (rápida)
    if (hasConflict(appointments, candidate, isEditing ? appointmentId : null)) {
      toast.warning("⚠️ Atenção: Conflito visual detectado no seu calendário.");
    }

    try {
      console.log("🔥 Enviando para API...");
      const result = await upsertAppointment({
        editingAppointment: isEditing ? { id: appointmentId } : null,
        appointmentData: candidate
      });

      console.log("🔥 Resultado API:", result);
      toast.success(isEditing ? "Agendamento atualizado!" : "Agendamento criado!");

      setIsModalOpen(false);
      setEditingAppointment(null);

    } catch (err) {
      console.error("[saveAppointment] Erro:", err);
      const msg = err.response?.data?.error || err.message;
      toast.error("Erro ao salvar: " + msg);
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

    const specialtyLabel = (() => {
      if (activeSpecialty === "fonoaudiologia") return "Fonoaudiologia";
      if (activeSpecialty === "psicologia") return "Psicologia";
      if (activeSpecialty === "terapia_ocupacional") return "Terapia Ocupacional";
      if (activeSpecialty === "fisioterapia") return "Fisioterapia";
      return "Fonoaudiologia";
    })();

    setEditingAppointment({
      date: formatDateLocal(new Date()),
      time: "08:00",
      professional: professionals[0] || "",
      specialty: specialtyLabel,
      status: "Pendente",
      patient: "",
      responsible: "",
      observations: "",
    });

    setIsModalOpen(true);
  };

  const handleSlotClick = (payload) => {
    console.log("[handleSlotClick]", payload);

    if (payload?.__isEmptySlot) {
      const specialtyLabel = (() => {
        if (activeSpecialty === "fonoaudiologia") return "Fonoaudiologia";
        if (activeSpecialty === "psicologia") return "Psicologia";
        if (activeSpecialty === "terapia_ocupacional") return "Terapia Ocupacional";
        if (activeSpecialty === "fisioterapia") return "Fisioterapia";
        return "Fonoaudiologia";
      })();

      setEditingAppointment({
        date: payload.date,
        time: payload.time,
        professional: payload.professional || (professionals[0] || ""),
        specialty: specialtyLabel,
        status: "Pendente",
        patient: "",
        responsible: "",
        observations: "",
      });

      setIsModalOpen(true);
      return;
    }

    openEditModal(payload);
  };

  // ========== FILTROS + SORT ==========
  const filteredAppointments = React.useMemo(() => {
    const weeks = getWeeksInMonth(currentYear, currentMonth);

    // 1. Filtrar agendamentos reais (Data/Semana/Especialidade)
    let base = (appointments || []).filter((appointment) => {
      // Se tiver especialidade ativa, filtra por ela
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
          const jsDay = dateObj.getDay();
          const targetDay = Number(filters.filterDay);
          if (jsDay !== targetDay) return false;
        }

        if (filters.filterWeek !== null && filters.filterWeek !== undefined) {
          const w = weeks[filters.filterWeek];
          if (!w) return false;
          const toKey = (v) => {
            if (typeof v === "string") return v.replaceAll("-", "");
            return formatDateLocal(v).replaceAll("-", "");
          };
          const dKey = toKey(appointment.date);
          const startKey = toKey(w.start);
          const endKey = toKey(w.end);
          if (!(dKey >= startKey && dKey <= endKey)) return false;
        }
      }
      return true;
    });

    // 2. Pré-Agendamentos (Já vêm unificados do backend na lista 'appointments')
    // Não precisamos mais do merge manual aqui.
    // 3. Filtros Secundários (Profissional e Status) aplicados na lista unificada
    base = base.filter(appointment => {
      if (filters.filterProfessional) {
        if (filters.filterProfessional.toLowerCase() === "livre") {
          const pName = appointment.patient?.fullName || appointment.patient || "";
          const isLivre =
            (appointment.professional && appointment.professional.toLowerCase().includes("livre")) ||
            (pName.toLowerCase().includes("livre")) ||
            (appointment.observations && appointment.observations.toLowerCase().includes("livre"));
          if (!isLivre) return false;
        } else if ((appointment.professional || "").toLowerCase() !== filters.filterProfessional.toLowerCase()) {
          return false;
        }
      }

      if (filters.filterStatus && appointment.status !== filters.filterStatus) {
        return false;
      }
      return true;
    });

    // 4. Injeção de Slots Virtuais (Fase 4)
    if (filters.filterProfessional && filters.filterDate && availableSlots.length > 0) {
      const virtualAppointments = availableSlots.map(time => ({
        id: `virtual_${filters.filterDate}_${time}_${filters.filterProfessional}`,
        date: filters.filterDate,
        time,
        professional: filters.filterProfessional,
        patient: "Livre",
        status: "Vaga",
        __isVirtual: true
      }));

      // Evita duplicatas visuais se já houver um agendamento real ou pré-agendamento no mesmo horário
      const realTimes = new Set(base.map(a => `${a.time}|${a.professional}`));
      const uniqueVirtuals = virtualAppointments.filter(v => !realTimes.has(`${v.time}|${v.professional}`));

      base = [...base, ...uniqueVirtuals];
    }

    base = sortAppointmentsByDateTimeAsc(base);
    return base;
  }, [appointments, preAppointments, activeSpecialty, filters, currentYear, currentMonth, availableSlots]);

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
    const ok = await confirmToast(`Remover o profissional "${name}"?`);
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
        <Header view={view} setView={setView} />
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
                remindersPendingCount={reminders.filter(r => r.status === "pending").length}
                onOpenReminders={() => setIsRemindersListOpen(true)}
              />
            </div>

            <AppointmentTable
              activeSpecialty={activeSpecialty}
              appointments={filteredAppointments}
              onEdit={openEditModal}
              onDelete={onDelete}
              onCancel={onCancel}
              onReminder={openReminder}
              onConfirm={handleConfirmAppointment}
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
              appointments={appointments}
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
              appointments={appointments}
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
            onSave={saveAppointment}
            onClose={() => {
              setIsModalOpen(false);
              setEditingAppointment(null);
            }}
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
    </div>
  );
}