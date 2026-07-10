# MIGRATION_PLAN.md — Agenda Externa

**Version:** 1.0  
**Date:** 2026-07-08  
**Status:** Execution Plan  

**Baseado em:**
- [`CURRENT_STATE_AUDIT.md`](./CURRENT_STATE_AUDIT.md) — estado real congelado
- [`EVENT_DEPENDENCY_MATRIX.md`](./EVENT_DEPENDENCY_MATRIX.md) — impacto dos eventos
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — direção oficial

---

## Objetivo

Migrar gradualmente a Agenda Externa para o padrão arquitetural do CRM **sem alterar comportamento funcional**.

> Foco em entrega. Nenhum documento novo após este.

---

## Visão das fases

| Fase | Escopo | Risco | Entrega principal |
|------|--------|-------|-------------------|
| 1 | Corrigir contratos quebrados | Baixo | Agenda opera sem erros 500 |
| 2 | Remover divergências óbvias | Baixo-Médio | Agenda usa apenas V2 |
| 3 | Preparar Outbox | Médio | Consumers e roteamento prontos |
| 4 | Migrar producers | Médio-Alto | Eventos canônicos ativados |
| 5 | Remover legado | Alto | Código morto e bypasses eliminados |

---

# Fase 1 — Corrigir contratos quebrados

**Objetivo:** garantir que a Agenda consiga operar corretamente antes da migração estrutural.

## Itens

1. Implementar `PATCH /api/v2/appointments/:id/admin-edit`
   - Usar `updateAppointmentCommand` como base.
   - Permitir edição administrativa com `adminReason`.
   - Manter proteção financeira (`applyFinancialProtection`).

2. Implementar `GET /api/reminders/:id`
   - Criar rota V2 de leitura de lembrete.
   - Manter compatibilidade com o contrato esperado pelo frontend.

3. Corrigir `PUT /api/v2/packages/:id`
   - Opção A: catalogar `PACKAGE_UPDATE_REQUESTED` em `EventTypes` + `eventToQueueMap`.
   - Opção B (preferida): criar `updatePackageCommand` e emitir `PACKAGE_UPDATED` via Outbox.
   - Garantir que `packageProjectionWorker` e `packageValidationWorker` processem corretamente.

## Critério de aceite

```
Frontend Agenda
       ↓
Endpoint existe
       ↓
Fluxo funciona
```

- Todos os fluxos da Agenda que hoje falham com 404/500 passam a responder 200/201.
- Nenhuma funcionalidade existente pode quebrar.

---

# Fase 2 — Remover divergências óbvias

**Objetivo:** eliminar chamadas legadas e centralizar contratos sem alterar arquitetura profunda.

## Itens executados

1. **Expandir `agenda/src/api/v2/agendaV2Client.js`**
   - **Patients:** `getPatients`, `searchPatients`, `updatePatient`.
   - **Appointments:** `getAppointmentById`, `getAppointmentsByPatient`, `trackPostAppointmentStep`.
   - **Reminders:** `getReminders`, `getReminderById`, `createReminder`, `updateReminder`.
   - **Doctors:** `getActiveDoctors`, `createDoctor`, `deleteDoctor`.

2. **Criar clients de fronteira**
   - `src/api/v2/calendarV2Client.js` — feriados (`getHolidays`).
   - `src/api/v2/whatsappClient.js` — Baileys, WhatsApp Web, VPS e Meta API.

3. **Migrar repositórios**
   - `services/patientsRepo.js` usa `agendaV2Client` (`/api/v2/patients`).
   - `services/remindersRepo.js` usa `agendaV2Client` (`/api/reminders`).
   - `services/appointmentsRepo.js` expõe wrappers para os novos reads e post-appointment.
   - `services/professionalsRepo.js` usa `agendaV2Client` (`/api/v2/doctors`).

4. **Migrar componentes**
   - `AppointmentModal.jsx` usa `getAppointmentById` / `getAppointmentsByPatient`.
   - `PostAppointmentModal.jsx` usa `trackPostAppointmentStep`.
   - `ReminderList.jsx` reescrito para consumir a entidade `Reminder` real (o endpoint `/api/appointments/:id/reminder` não existe mais no backend).

5. **Migrar serviços de integração**
   - `services/calendarService.js` delega para `calendarV2Client`.
   - `services/baileysApi.js`, `services/whatsappExtension.js`, `WhatsAppConnectModal.jsx`, `Header.jsx` delegam para `whatsappClient`.

6. **Atualizar testes**
   - Vitest continua passando (`npm run test`).
   - Build de produção continua passando (`npm run build`).

## Proibição

Nenhum novo desenvolvimento pode usar:

```
/api/patients
/api/appointments antigo
api.get/post/put/patch/delete espalhados em componentes/repositórios
```

Toda chamada HTTP deve sair de:

```
agendaV2Client    (domínio core)
calendarV2Client  (fronteira de calendário)
whatsappClient    (fronteira de WhatsApp)
```

## Critério de aceite

- `grep -R "\/api/patients/" agenda/src` retorna apenas referências a `/api/v2/patients`.
- `grep -R "api\.(get|post|put|patch|delete)" agenda/src/services agenda/src/components` retorna vazio (exceto dentro dos clients acima).
- Nenhum endpoint V1 é chamado pelos fluxos principais da Agenda.
- `ReminderList.jsx` funciona com a entidade `Reminder` real.

---

# Fase 3 — Preparar Outbox

**Objetivo:** deixar consumers, roteamento e idempotência prontos **antes** de ativar novos eventos.

## Itens

1. Corrigir `eventToQueueMap`
   - Adicionar `'package-projection'` a `APPOINTMENT_UPDATED`.
   - Catalogar `PACKAGE_UPDATE_REQUESTED` e `PACKAGE_DELETE_REQUESTED` (ou migrar para `PACKAGE_UPDATED`/`PACKAGE_DELETED`).
   - Revisar roteamento de `APPOINTMENT_CREATED` para fila `notification` (isolar até worker compatível).

2. Corrigir `clinicalOrchestrator`
   - Buscar sessão por `appointmentId`, não por `appointment`.
   - Garantir que não crie sessão duplicada.

3. Corrigir `notificationOrchestratorWorker`
   - Ou não receber eventos de appointment/payment, ou criar handler genérico.

4. Adicionar idempotência nos workers críticos
   - `preAgendamentoWorker` (se for reescrito).
   - `clinicalOrchestrator`.
   - `packageProjectionWorker` (validar casos edge).

5. Preparar consumers para `APPOINTMENT_DELETED`
   - `patientProjectionWorker`: remover referência de `Patient.appointments` e recalcular view.
   - `syncMedicalWorker`: arquivar/remover `MedicalEvent` correspondente.
   - `packageProjectionWorker`: recalcular saldo/pacote.

## Critério de aceite

Antes:

```
insuranceBilling
      |
      |
   sem evento
```

Depois:

```
insuranceBilling
      |
      |
 saveToOutbox()
      |
      |
 worker preparado
```

- Todos os consumers afetados pela Fase 4 estão corrigidos e testados em staging.
- Nenhum evento novo é ativado ainda.

---

# Fase 4 — Migrar produtores

**Objetivo:** mover producers para o padrão Command + Outbox.

## Ordem segura

1. **Patient updates**
   - Criar `updatePatientCommand`.
   - Emitir `PATIENT_UPDATED` no Outbox.
   - Remover rebuild síncrono de `PatientsView` da rota V2.

2. **Appointment updates**
   - Remover bypass `appointmentStateOrchestrator` de `updateAppointmentCommand`.
   - Garantir que `package-projection` processa `APPOINTMENT_UPDATED`.

3. **Appointment delete**
   - Criar `APPOINTMENT_DELETED` em `EventTypes`.
   - Adicionar `saveToOutbox` em `deleteAppointmentCommand`.
   - Ativar consumers preparados na Fase 3.

4. **Package mutations**
   - Criar `createPackageCommand`, `updatePackageCommand`, `cancelPackageCommand`, `deletePackageCommand`.
   - Emitir eventos canônicos (`PACKAGE_CREATED`, `PACKAGE_UPDATED`, `PACKAGE_CANCELLED`, `PACKAGE_DELETED`).
   - Mover lógica financeira de `PatientBalance` do DELETE para o Command.

5. **Insurance flow**
   - Adicionar `saveToOutbox(APPOINTMENT_CREATED)` em `insuranceBilling.js`.
   - Ativar apenas após consumers validados.

6. **Pre-agendamento**
   - Decidir: reescrever `preAgendamentoWorker` ou simplificar fluxo.
   - Se reescrito, usar Commands + Outbox.

## Critério de aceite

- Todo write de domínio passa por Command.
- Todo evento de domínio passa por Outbox.
- Read Models continuam consistentes (testes de regressão).

---

# Fase 5 — Remover legado

**Objetivo:** eliminar código morto e bypasses, mas **somente após evidência**.

## Itens

1. Remover `publishEvent` legado de rotas
   - `package.v2.js`
   - `preAgendamento.engine.js`
   - Outras rotas que ainda usem.

2. Remover bypasses síncronos
   - `appointmentStateOrchestrator`
   - `syncAffectedViews`
   - `syncEvent` como pipeline de projeção

3. Desativar rotas V1
   - `PUT /api/patients/:id`
   - Outros endpoints V1 não mais usados.

4. Remover código morto da Agenda Externa
   - `rescheduleAppointmentDirect`
   - `deletePackageSession`
   - `cancelPackageSession`
   - Repositórios não utilizados.

5. Limpar eventos órfãos
   - Revisar `EventTypes` e `eventToQueueMap`.
   - Remover eventos que não possuem producer nem consumer.

## Critério de aceite

- Nenhuma referência ativa a componentes marcados como legado.
- Testes de regressão passam.
- Métricas de produção estáveis por pelo menos 7 dias.

---

## Critério de conclusão geral

A Agenda estará alinhada quando:

- ✅ Nenhum write direto de domínio fora de Command.
- ✅ Nenhum `publishEvent` novo.
- ✅ Todo evento passa por Outbox.
- ✅ Read Models possuem um único writer.
- ✅ Frontend usa somente contratos V2.
- ✅ Fluxos críticos possuem testes de regressão.

---

## Recomendação imediata

**Não mexer em `insuranceBilling`, `preAgendamento` e grandes migrações ainda.**

Primeira entrega de valor:

1. Corrigir endpoints quebrados.
2. Migrar chamadas V1 da Agenda.
3. Garantir que os fluxos atuais funcionam.
4. Depois atacar eventos.

Isso evita transformar uma migração arquitetural em um projeto de reescrita. O CRM levou tempo porque tinha muito legado; a Agenda é menor e dá para chegar no mesmo padrão com passos controlados.

---

*Plano operacional. Não criar novos documentos de arquitetura antes de executar as fases acima.*
