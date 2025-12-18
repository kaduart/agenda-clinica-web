// src/App.jsx
import React, { useEffect, useMemo } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  deleteAppointment,
  generateCycleAppointments,
  hasConflict,
  listenAppointmentsForMonth,
  upsertAppointment,
} from "./services/appointmentsRepo";

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
import { cancelReminder, listenReminders, markReminderDone, snoozeReminderDays } from "./services/remindersRepo";
import "./styles/app.css";

export default function App() {
  console.log("📱 [App.jsx] Componente App montando...");

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

  useEffect(() => {
    // ✅ SE filterDate ESTÁ ATIVO, busca o mês DELE
    let targetYear = currentYear;
    let targetMonth = currentMonth;

    if (filters.filterDate) {
      const [y, m] = filters.filterDate.split("-").map(Number);
      targetYear = y;
      targetMonth = m - 1; // JS usa 0-11
      console.log(`👂 [App.jsx] Ajustando listener para mês do filterDate: ${targetYear}/${targetMonth + 1}`);
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

  // ========== LABEL DA ESPECIALIDADE ATUAL ==========
  const activeSpecialtyLabel = useMemo(() => {
    if (activeSpecialty === "fonoaudiologia") return "Fonoaudiologia";
    if (activeSpecialty === "psicologia") return "Psicologia";
    if (activeSpecialty === "terapia_ocupacional") return "Terapia Ocupacional";
    if (activeSpecialty === "fisioterapia") return "Fisioterapia";
    if (activeSpecialty === "todas") return "";
    return "";
  }, [activeSpecialty]);

  // ========== FILTROS + SORT ==========
  const filteredAppointments = React.useMemo(() => {
    const weeks = getWeeksInMonth(currentYear, currentMonth);

    let base = (appointments || []).filter((appointment) => {
      // ✅ Filtro de especialidade
      if (activeSpecialty !== "todas") {
        if (resolveSpecialtyKey(appointment) !== activeSpecialty) {
          return false;
        }
      }

      // ✅ Filtro de data específica (PRIORIDADE MÁXIMA)
      if (filters.filterDate) {
        if (appointment.date !== filters.filterDate) {
          return false;
        }
        // Se filterDate está ativo, IGNORA filterDay e filterWeek
      } else {
        // ✅ Filtro de dia da semana (APENAS se filterDate NÃO estiver ativo)
        if (filters.filterDay) {
          if (!appointment.date) {
            return false;
          }

          const [y, m, d] = appointment.date.split("-").map(Number);
          const dateObj = new Date(y, m - 1, d);
          const jsDay = dateObj.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
          const targetDay = Number(filters.filterDay);

          if (jsDay !== targetDay) {
            return false;
          }
        }

        // ✅ Filtro de semana (APENAS se filterDate NÃO estiver ativo)
        if (filters.filterWeek !== null && filters.filterWeek !== undefined) {
          const w = weeks[filters.filterWeek];
          if (!w) {
            return false;
          }

          const toKey = (v) => {
            if (typeof v === "string") return v.replaceAll("-", "");
            return formatDateLocal(v).replaceAll("-", "");
          };

          const dKey = toKey(appointment.date);
          const startKey = toKey(w.start);
          const endKey = toKey(w.end);

          if (!(dKey >= startKey && dKey <= endKey)) {
            return false;
          }
        }
      }

      // ✅ Filtro de profissional
      if (filters.filterProfessional) {
        if (filters.filterProfessional.toLowerCase() === "livre") {
          const isLivre =
            (appointment.professional && appointment.professional.toLowerCase().includes("livre")) ||
            (appointment.patient && appointment.patient.toLowerCase().includes("livre")) ||
            (appointment.observations && appointment.observations.toLowerCase().includes("livre"));
          if (!isLivre) {
            return false;
          }
        } else if (appointment.professional !== filters.filterProfessional) {
          return false;
        }
      }

      // ✅ Filtro de status
      if (filters.filterStatus && appointment.status !== filters.filterStatus) {
        return false;
      }

      // ✅ Filtro de semana
      if (filters.filterWeek !== null && filters.filterWeek !== undefined) {
        const w = weeks[filters.filterWeek];
        if (!w) {
          return false;
        }

        const toKey = (v) => {
          if (typeof v === "string") return v.replaceAll("-", "");
          return formatDateLocal(v).replaceAll("-", "");
        };

        const dKey = toKey(appointment.date);
        const startKey = toKey(w.start);
        const endKey = toKey(w.end);

        if (!(dKey >= startKey && dKey <= endKey)) {
          return false;
        }
      }

      return true;
    });

    // ✅ Ordenar cronologicamente
    base = sortAppointmentsByDateTimeAsc(base);

    return base;
  }, [appointments, activeSpecialty, filters, currentYear, currentMonth]);

  // ========== CRUD APPOINTMENTS ==========
  const onDelete = async (id) => {
    const ok = await confirmToast("Tem certeza que deseja excluir este agendamento?");
    if (!ok) return;
    try {
      await deleteAppointment(id);
      toast.success("Agendamento excluído com sucesso!");
    } catch (e) {
      console.error("[onDelete]", e);
      toast.error("Erro ao excluir agendamento.");
    }
  };

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

  const saveAppointment = async (appointmentData) => {
    console.log("[saveAppointment] appointmentData recebido:", appointmentData);

    const candidate = {
      ...editingAppointment,
      ...appointmentData,
      status: appointmentData.status === "Vaga" ? "Pendente" : appointmentData.status,
    };

    console.log("[saveAppointment] candidate final:", candidate);

    if (hasConflict(appointments, candidate, editingAppointment?.id)) {
      toast.error("⚠️ Já existe um agendamento nesse horário para esse profissional.");
      return;
    }

    try {
      await upsertAppointment({ editingAppointment, appointmentData: candidate });
      setIsModalOpen(false);
      setEditingAppointment(null);
      toast.success(editingAppointment?.id ? "Agendamento atualizado!" : "Agendamento criado!");
    } catch (err) {
      console.error("[saveAppointment] Erro:", err);
      toast.error("Erro ao salvar agendamento. Tente novamente.");
    }
  };


  // ========== PROFESSIONALS MODAL ==========
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
      <ToastContainer
        position="top-center"
        newestOnTop
        closeOnClick={false}
        draggable={false}
      />

      <main className="max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
        {/* Dashboard de métricas */}
        <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-6">
          <SpecialtyDashboard appointments={appointments} activeSpecialty={activeSpecialty} />
        </div>

        {/* Painel de filtros */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <FiltersPanel
            professionals={professionals}
            currentYear={currentYear}
            currentMonth={currentMonth}
            filters={filters}
            setFilters={setFilters}
            onNewAppointment={openCreateModal} // ✅ Esta função agora existe
            onOpenProfessionals={onOpenProfessionals} // ✅ Esta função agora existe
            onResetFilters={handleResetFilters} // ✅ Adicione esta prop
          />
        </div>

        {/* VIEW: LISTA */}
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
              onReminder={openReminder}
              onConfirmCycle={async (payload, baseAppointment) => {
                try {
                  const result = await generateCycleAppointments(baseAppointment, payload, {
                    statusForGenerated: "Confirmado", // ou "Pendente" se você preferir travar sem “confirmar”
                    skipConflicts: true,
                  });

                  const msg =
                    result.skipped?.length
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

        {/* VIEW: CALENDÁRIO */}
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

        {/* VIEW: SEMANAL */}
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

      {/* MODAL: AGENDAMENTO */}
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

      {/* MODAL: PROFISSIONAIS */}
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

      {/* MODAL: LEMBRETE */}
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

      {/* TOAST: Sistema carregado */}
      {/*    {appointments.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slideInUp">
            <i className="fas fa-check-circle text-xl"></i>
            <div>
              <p className="font-semibold">Sistema Carregado</p>
              <p className="text-sm opacity-90">{appointments.length} agendamentos sincronizados</p>
            </div>
          </div>
        </div>
      )} */}

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
          // aqui você pode buscar o appointment e abrir openEditModal
          // (se quiser, eu te passo a função getAppointmentById no appointmentsRepo)
          toast.info(`Abrir agendamento: ${appointmentId}`);
        }}
      />

    </div>
  );
}