// src/App.jsx
import React, { useEffect, useMemo } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Firebase database precisa ser importado pro onDelete funcionar
import { database } from "./config/firebase";

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
import {
  autoSendPreAgendamento,
  confirmarAgendamento,
  syncCancelToCRM,
  syncDeleteToCRM,
  syncIfNeeded
} from "./services/crmExport";
import { cancelReminder, listenReminders, markReminderDone, snoozeReminderDays } from "./services/remindersRepo";
import "./styles/app.css";
console.log("🚀🚀🚀 APP.JSX CARREGADO - VERSÃO NOVA!");

export default function App() {
  console.log("📱 [App.jsx] Componente App montando - VERSÃO NOVA!");
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

  // ========== LABEL DA ESPECIALIDADE ATUAL ==========
  const activeSpecialtyLabel = useMemo(() => {
    if (activeSpecialty === "fonoaudiologia") return "Fonoaudiologia";
    if (activeSpecialty === "psicologia") return "Psicologia";
    if (activeSpecialty === "terapia_ocupacional") return "Terapia Ocupacional";
    if (activeSpecialty === "fisioterapia") return "Fisioterapia";
    return "";
  }, [activeSpecialty]);

  // ========== FUNÇÕES DE SINCronização ==========

  // EXCLUIR com sync pro CRM
  const onDelete = async (id) => {
    const ok = await confirmToast("Tem certeza?");
    if (!ok) return;

    try {
      console.log("🚀 EXCLUINDO ID:", id);

      // Pega dados antes de deletar
      const snap = await database.ref(`appointments/${id}`).get();
      const appointment = { id, ...snap.val() };

      console.log("Dados:", appointment);

      // VERIFICA SE TEM NO CRM
      const temNoCRM = appointment.preAgendamento?.crmPreAgendamentoId ||
        appointment.export?.crmAppointmentId;

      console.log("Tem no CRM?", temNoCRM);

      // Se tem no CRM, avisa pra deletar lá também
      if (temNoCRM) {
        console.log("📡 Chamando syncDeleteToCRM...");
        await syncDeleteToCRM(id);
        console.log("✅ Deletado no CRM");
      }

      // Deleta no Firebase
      await deleteAppointment(id);
      toast.success("Excluído!");

    } catch (e) {
      console.error("❌ ERRO:", e);
      toast.error("Erro: " + e.message);
    }
  };

  // CANCELAR específico (pode ser chamado de um botão na tabela)
  const onCancel = async (appointment) => {
    const reason = prompt("Motivo do cancelamento:", "Cancelado pelo paciente");
    if (!reason) return;

    try {
      // 1. Atualiza status localmente para Cancelado
      const updatedData = {
        ...appointment,
        status: "Cancelado",
        canceledReason: reason,
        canceledAt: new Date().toISOString()
      };

      await upsertAppointment({ editingAppointment: appointment, appointmentData: updatedData });

      // 2. Sincroniza com CRM se já tiver sido exportado
      if (appointment.export?.status === "success" || appointment.preAgendamento?.crmPreAgendamentoId) {
        await syncCancelToCRM(appointment, reason);
      }

      toast.success("Agendamento cancelado e sincronizado!");
    } catch (e) {
      console.error("[onCancel]", e);
      toast.error("Erro ao cancelar: " + e.message);
    }
  };

  const saveAppointment = async (appointmentData) => {
    console.log("🔥🔥🔥 [saveAppointment] INICIANDO");
    console.log("🔥🔥🔥 editingAppointment:", editingAppointment);
    console.log("🔥🔥🔥 appointmentData:", appointmentData);

    // ✅ DETECTA EDIÇÃO PELO ID DO editingAppointment (estado do App)
    const appointmentId = editingAppointment?.id;
    const isEditing = !!appointmentId;

    console.log("🔥🔥🔥 appointmentId:", appointmentId);
    console.log("🔥🔥🔥 isEditing:", isEditing);

    const candidate = {
      ...(isEditing ? editingAppointment : {}), // Dados originais se for edição
      ...appointmentData, // Sobrescreve com novos dados
      id: appointmentId, // ✅ ID garantido (ou undefined se for novo)
      status: appointmentData.status === "Vaga" ? "Pendente" : appointmentData.status,
    };
    console.log("🔥🔥🔥 candidate:", candidate);

    if (hasConflict(appointments, candidate, appointmentId)) {
      toast.error("⚠️ Conflito de horário!");
      return;
    }

    try {
      const oldAppointment = isEditing ? { ...editingAppointment } : null;

      // ✅ 1. Salva no Firebase E CAPTURA O RESULTADO COM ID
      console.log("🔥 Salvando no Firebase...");
      const saveResult = await upsertAppointment({
        editingAppointment: isEditing ? { id: appointmentId } : null,
        appointmentData: candidate
      });
      console.log("🔥 Resultado do save:", saveResult);

      // ✅ 2. GARANTE que o candidate tenha o ID correto
      if (saveResult?.id) {
        candidate.id = saveResult.id;
        console.log("🔥 Agendamento salvo com ID:", candidate.id);
      } else {
        console.error("❌ ERRO: saveResult não tem ID!");
        toast.error("Erro ao salvar: ID não retornado");
        return;
      }

      // 3. Se for EDIÇÃO
      if (isEditing && oldAppointment) {
        console.log("🔥 ENTROU NO BLOCO DE EDIÇÃO");
        console.log("🔥 oldAppointment.status:", oldAppointment.status);
        console.log("🔥 candidate.status:", candidate.status);

        const mudouParaConfirmado = oldAppointment.status !== "Confirmado" &&
          candidate.status === "Confirmado";
        console.log("🔥 mudouParaConfirmado:", mudouParaConfirmado);

        if (mudouParaConfirmado) {
          console.log("🚀 Mudou para Confirmado!");

          if (oldAppointment.preAgendamento?.crmPreAgendamentoId) {
            // Já tem pré-agendamento, só confirma
            console.log("🚀 Tem pré-agendamento, confirmando...");
            const result = await confirmarAgendamento(candidate, {
              date: candidate.date,
              time: candidate.time,
              sessionValue: candidate.crm?.paymentAmount || 200
            });

            if (result.success) {
              toast.success("✅ Confirmado no CRM!");
            } else {
              toast.error("Erro ao confirmar: " + result.error);
            }
          } else {
            // Não tem pré-agendamento, cria e confirma
            console.log("🚀 Não tem pré-agendamento, criando...");
            const preResult = await autoSendPreAgendamento(candidate);

            if (preResult.success) {
              console.log("🚀 Pré-agendamento criado, aguardando...");
              await new Promise(r => setTimeout(r, 500));

              const confirmResult = await confirmarAgendamento(candidate, {
                date: candidate.date,
                time: candidate.time,
                sessionValue: candidate.crm?.paymentAmount || 200
              });

              if (confirmResult.success) {
                toast.success("✅ Criado e confirmado no CRM!");
              } else {
                toast.error("Erro ao confirmar: " + confirmResult.error);
              }
            } else {
              toast.error("Erro ao criar pré-agendamento: " + preResult.error);
            }
          }
        }
      }

      // ✅ 4. Se for NOVO e Pendente → envia pré-agendamento
      else if (!isEditing && candidate.status === "Pendente") {
        console.log("🚀 NOVO agendamento Pendente, enviando para CRM...");
        console.log("🚀 ID:", candidate.id, "Paciente:", candidate.patient);

        try {
          const result = await autoSendPreAgendamento(candidate);
          console.log("🚀 Resultado:", result);

          if (result.success) {
            toast.success("📤 Enviado para o CRM!");
          } else {
            toast.error("❌ Erro ao enviar: " + result.error);
          }
        } catch (err) {
          console.error("🚀 ERRO:", err);
          toast.error("Erro: " + err.message);
        }
      }

      // ✅ 5. Se for NOVO e Confirmado → cria e confirma
      else if (!isEditing && candidate.status === "Confirmado") {
        console.log("🚀 NOVO agendamento Confirmado, criando no CRM...");

        try {
          const preResult = await autoSendPreAgendamento(candidate);

          if (preResult.success) {
            await new Promise(r => setTimeout(r, 500));
            const confirmResult = await confirmarAgendamento(candidate, {
              date: candidate.date,
              time: candidate.time,
              sessionValue: candidate.crm?.paymentAmount || 200
            });

            if (confirmResult.success) {
              toast.success("✅ Criado e confirmado no CRM!");
            } else {
              toast.error("Erro ao confirmar: " + confirmResult.error);
            }
          } else {
            toast.error("Erro ao criar: " + preResult.error);
          }
        } catch (err) {
          console.error("🚀 ERRO:", err);
          toast.error("Erro: " + err.message);
        }
      }

      setIsModalOpen(false);
      setEditingAppointment(null);

    } catch (err) {
      console.error("[saveAppointment] Erro:", err);
      toast.error("Erro ao salvar: " + err.message);
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

    let base = (appointments || []).filter((appointment) => {
      if (activeSpecialty !== "todas") {
        if (resolveSpecialtyKey(appointment) !== activeSpecialty) {
          return false;
        }
      }

      if (filters.filterDate) {
        if (appointment.date !== filters.filterDate) {
          return false;
        }
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

      if (filters.filterStatus && appointment.status !== filters.filterStatus) {
        return false;
      }

      return true;
    });

    base = sortAppointmentsByDateTimeAsc(base);
    return base;
  }, [appointments, activeSpecialty, filters, currentYear, currentMonth]);

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
              onCancel={onCancel}  // <-- Passa a função de cancelar aqui
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