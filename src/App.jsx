// src/App.jsx
import React from "react";

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
  hasConflict,
  listenAppointmentsForMonth,
  upsertAppointment,
} from "./services/appointmentsRepo";

import {
  addProfessional,
  deleteProfessionalByName,
  listenProfessionals,
} from "./services/professionalsRepo";

import { formatDateLocal, getWeeksInMonth, parseYMDLocal } from "./utils/date";
import { sortAppointmentsByDateTimeAsc } from "./utils/sort";
import { resolveSpecialtyKey } from "./utils/specialty";

import ReminderModal from "./components/ReminderModal";
import "./styles/app.css";

export default function App() {
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
  const [newProfessional, setNewProfessional] = React.useState("");
  const [isReminderOpen, setIsReminderOpen] = React.useState(false);
  const [reminderAppointment, setReminderAppointment] = React.useState(null);

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
      alert("Lembrete salvo!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar lembrete.");
    }
  };

  // listeners
  React.useEffect(() => {
    const unsub = listenProfessionals(setProfessionals);
    return () => unsub();
  }, []);

  React.useEffect(() => {
    const unsub = listenAppointmentsForMonth(currentYear, currentMonth, setAppointments);
    return () => unsub();
  }, [currentYear, currentMonth]);

  // label da especialidade atual (pra WeeklyView)
  const activeSpecialtyLabel = React.useMemo(() => {
    if (activeSpecialty === "fonoaudiologia") return "Fonoaudiologia";
    if (activeSpecialty === "psicologia") return "Psicologia";
    if (activeSpecialty === "terapia_ocupacional") return "Terapia Ocupacional";
    if (activeSpecialty === "fisioterapia") return "Fisioterapia";
    if (activeSpecialty === "todas") return "";
    return "";
  }, [activeSpecialty]);

  // filtros + sort cronológico
  const filteredAppointments = React.useMemo(() => {
    const weeks = getWeeksInMonth(currentYear, currentMonth);

    const base = (appointments || []).filter((appointment) => {
      if (activeSpecialty !== "todas") {
        if (resolveSpecialtyKey(appointment) !== activeSpecialty) return false;
      }

      if (filters.filterDate && appointment.date !== filters.filterDate) return false;

      if (filters.filterProfessional) {
        if (filters.filterProfessional.toLowerCase() === "livre") {
          const isLivre =
            (appointment.professional && appointment.professional.toLowerCase().includes("livre")) ||
            (appointment.patient && appointment.patient.toLowerCase().includes("livre")) ||
            (appointment.observations && appointment.observations.toLowerCase().includes("livre"));
          if (!isLivre) return false;
        } else if (appointment.professional !== filters.filterProfessional) {
          return false;
        }
      }

      if (filters.filterStatus && appointment.status !== filters.filterStatus) return false;

      if (filters.filterDay) {
        const d = parseYMDLocal(appointment.date);
        const day = d.getDay() === 0 ? 7 : d.getDay();
        if (Number(day) !== Number(filters.filterDay)) return false;
      }

      if (filters.filterWeek !== null) {
        const w = weeks[filters.filterWeek];
        if (!w) return false;
        const d = parseYMDLocal(appointment.date);
        if (!(d >= w.start && d <= w.end)) return false;
      }

      return true;
    });

    return sortAppointmentsByDateTimeAsc(base);
  }, [appointments, activeSpecialty, filters, currentYear, currentMonth]);

  const onDelete = async (id) => {
    const ok = window.confirm("Tem certeza que deseja excluir este agendamento?");
    if (!ok) return;
    await deleteAppointment(id);
    alert("Agendamento excluído com sucesso!");
  };

  const openEditModal = (appointment) => {
    setEditingAppointment(appointment);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
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

  // ✅ usado no Calendar/Weekly: clique num slot vago ou num ocupado
  const handleSlotClick = (payload) => {
    // caso venha slot vazio
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

    // caso venha appointment real (ocupado)
    openEditModal(payload);
  };

  const saveAppointment = async (appointmentData) => {
    const candidate = {
      ...editingAppointment,
      ...appointmentData,
      status: appointmentData.status === "Vaga" ? "Pendente" : appointmentData.status,
    };

    if (hasConflict(appointments, candidate, editingAppointment?.id)) {
      alert("⚠️ Já existe um agendamento nesse horário para esse profissional.");
      return;
    }

    try {
      await upsertAppointment({ editingAppointment, appointmentData: candidate });
      setIsModalOpen(false);
      setEditingAppointment(null);
      alert(editingAppointment?.id ? "Agendamento atualizado com sucesso!" : "Agendamento criado com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar agendamento:", err);
      alert("Erro ao salvar agendamento. Tente novamente.");
    }
  };

  // Professionals modal
  const onOpenProfessionals = () => setIsProfessionalsModalOpen(true);

  const handleAddProfessional = async () => {
    try {
      await addProfessional(newProfessional);
      setNewProfessional("");
    } catch (e) {
      console.error(e);
      alert("Erro ao adicionar profissional.");
    }
  };

  const handleDeleteProfessional = async (name) => {
    const ok = window.confirm(`Remover o profissional "${name}"?`);
    if (!ok) return;
    try {
      await deleteProfessionalByName(name);
    } catch (e) {
      console.error(e);
      alert("Erro ao remover profissional.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-blue-50">
      <Header view={view} setView={setView} />

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
          />
        </div>

        {view === "list" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
              <SpecialtyTabs activeTab={activeSpecialty} onTabChange={setActiveSpecialty} />
            </div>
            <AppointmentTable
              activeSpecialty={activeSpecialty}
              appointments={filteredAppointments}
              onEdit={openEditModal}
              onDelete={onDelete}
              onReminder={openReminder}
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
            newProfessional={newProfessional}
            onNewProfessionalChange={setNewProfessional}
            onAddProfessional={handleAddProfessional}
            onDeleteProfessional={handleDeleteProfessional}
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

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-40 space-y-2">
        {appointments.length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slideInUp">
            <i className="fas fa-check-circle text-xl"></i>
            <div>
              <p className="font-semibold">Sistema Carregado</p>
              <p className="text-sm opacity-90">{appointments.length} agendamentos sincronizados</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}