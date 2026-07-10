# EVENT_DEPENDENCY_MATRIX.md — Agenda Externa

**Version:** 1.0  
**Date:** 2026-07-08  
**Status:** Current State + Migration Reference  
**Scope:** `/home/user/projetos/agenda` (frontend) + `/home/user/projetos/crm/back` (backend CRM)  

---

## Objetivo

Mapear todos os eventos relacionados à integração entre Agenda Externa e CRM canônico, identificando produtores, consumidores, filas, riscos e estado de migração.

> **Este documento NÃO autoriza ativação de eventos.**  
> Ele serve como inventário e análise de impacto. Ativar qualquer evento marcado como bloqueado sem seguir o plano de migração pode causar regressões em produção.

---

## Legenda de status

| Símbolo | Significado |
|---------|-------------|
| ✅ | Existe hoje e funciona conforme a arquitetura canônica |
| ⚠️ | Existe hoje, mas está quebrado, legado ou incompleto |
| ❌ | Não existe hoje; deveria existir pela arquitetura alvo |
| 🚫 | Proibido temporariamente |

---

# 1. Eventos atuais — operacionais

## 1.1 APPOINTMENT_CREATED (particular / pacote avulso)

| Campo | Valor |
|-------|-------|
| **Producer** | `back/services/appointment/commands/createAppointmentCommand.js` → `createWithHybridService()` → `appointmentHybridService.create()` |
| **Endpoint** | `POST /api/v2/appointments` |
| **Persistência** | Dentro de `runTransactionWithRetry` |
| **Outbox** | ✅ Sim (`back/services/appointmentHybridService.js:165-184`) |
| **EventType** | `APPOINTMENT_CREATED` (`back/infrastructure/events/eventPublisher.js:65`) |
| **Filas (eventToQueueMap)** | `['notification', 'patient-projection', 'clinical-orchestrator']` (`eventPublisher.js:221`) |
| **Consumers** | `notificationOrchestratorWorker` ❌ não está preparado; `patientProjectionWorker` ✅; `clinicalOrchestrator` ⚠️ cria sessão (risco ao receber de convênio) |
| **Status** | ✅ **Operacional** para particular/pacote |
| **Observação** | `notificationOrchestratorWorker` falha ao receber `APPOINTMENT_CREATED` porque espera `payload.type`/`payload.to` (`notificationOrchestratorWorker.js:70`). Hoje funciona para particular/pacote porque a fila `notification` raramente é o gargalo, mas em volume pode encher DLQ. |

---

## 1.2 APPOINTMENT_UPDATED

| Campo | Valor |
|-------|-------|
| **Producer** | `back/services/appointment/commands/updateAppointmentCommand.js` |
| **Endpoint** | `PUT /api/v2/appointments/:id` |
| **Persistência** | Dentro de `runTransactionWithRetry` |
| **Outbox** | ✅ Sim (`updateAppointmentCommand.js:252-265`) |
| **EventType** | `APPOINTMENT_UPDATED` (`eventPublisher.js:68`) |
| **Filas (eventToQueueMap)** | `['notification', 'patient-projection', 'appointment-integration']` (`eventPublisher.js:223`) |
| **Consumers preparados** | `patientProjectionWorker` ✅; `appointmentIntegrationWorker` ✅; `notificationOrchestratorWorker` ❌ |
| **Consumer faltando no mapa** | `packageProjectionWorker` ✅ já sabe processar (`packageProjectionWorker.js:254`), mas **não está roteado** |
| **Status** | ⚠️ **Incompleto** |
| **Observação** | A falta de `'package-projection'` no `eventToQueueMap` forçou a criação do bypass `appointmentStateOrchestrator` → `syncAffectedViews` → `buildPackageView` em `updateAppointmentCommand.js:317-321`. |

---

## 1.3 APPOINTMENT_CANCELLED

| Campo | Valor |
|-------|-------|
| **Producer** | `back/services/appointment/commands/cancelAppointmentCommand.js` |
| **Endpoint** | `PATCH /api/v2/appointments/:id/cancel` |
| **Persistência** | Dentro de `runTransactionWithRetry` |
| **Outbox** | ✅ Sim (`cancelAppointmentCommand.js:163-179`) |
| **EventType** | `APPOINTMENT_CANCELLED` (`eventPublisher.js:72`) |
| **Filas (eventToQueueMap)** | `['sync-medical', 'patient-projection', 'clinical-orchestrator', 'package-projection']` (`eventPublisher.js:224`) |
| **Consumers** | `syncMedicalWorker` ✅; `patientProjectionWorker` ✅; `clinicalOrchestrator` ✅; `packageProjectionWorker` ✅ |
| **Status** | ✅ **Operacional** |
| **Observação** | Modelo de referência para os outros fluxos de agendamento. |

---

## 1.4 APPOINTMENT_RESCHEDULED

| Campo | Valor |
|-------|-------|
| **Producer** | Definido em `EventTypes`, mas **não há producer canônico ativo** |
| **Endpoint** | `POST /api/v2/appointments/:id/reschedule` — **inexistente** |
| **Persistência** | — |
| **Outbox** | ❌ Não há producer |
| **EventType** | `APPOINTMENT_RESCHEDULED` (`eventPublisher.js:71`) |
| **Filas (eventToQueueMap)** | `['notification', 'patient-projection']` (`eventPublisher.js:227`) |
| **Consumers** | `notificationOrchestratorWorker` ❌; `patientProjectionWorker` ✅ |
| **Status** | ⚠️ **Órfão de producer** |
| **Observação** | Evento existe no catálogo e no mapa, mas nenhum endpoint/command o emite. A Agenda Externa tem `rescheduleAppointmentDirect` (código morto) que faz fallback para `PUT`. |

---

## 1.5 PATIENT_REGISTERED

| Campo | Valor |
|-------|-------|
| **Producer** | `back/routes/patient.v2.js` (POST `/api/v2/patients`) e `back/domains/clinical/services/patientService.js` |
| **Persistência** | Fora de transação em `patient.v2.js`; dentro de transação em `patientService.js` |
| **Outbox** | ✅ Sim, em ambos |
| **EventType** | `PATIENT_REGISTERED` (string literal no `eventPublisher.js:252`) |
| **Filas (eventToQueueMap)** | `['patient-projection']` |
| **Consumers** | `patientProjectionWorker` ✅ |
| **Status** | ✅ **Operacional** |
| **Observação** | Não é usado pela Agenda Externa hoje, mas é o evento canônico de criação de paciente. |

---

## 1.6 PATIENT_CREATED

| Campo | Valor |
|-------|-------|
| **Producer** | `back/routes/importFromAgenda.js` (importação legada) |
| **Persistência** | — |
| **Outbox** | ✅ Sim |
| **EventType** | `PATIENT_CREATED` (`eventPublisher.js:128`) |
| **Filas (eventToQueueMap)** | `['patient-projection']` (`eventPublisher.js:251`) |
| **Consumers** | `patientProjectionWorker` ✅ |
| **Status** | ✅ **Operacional** (embora producer seja legado) |
| **Observação** | Evento funciona, mas o producer deveria ser um Command de paciente, não uma rota de importação. |

---

## 1.7 PATIENT_UPDATED

| Campo | Valor |
|-------|-------|
| **Producer** | Definido em `EventTypes`, mas **não há producer ativo no fluxo principal** |
| **Endpoint** | `PUT /api/v2/patients/:id` não emite; `PUT /api/patients/:id` (V1) não emite |
| **Persistência** | — |
| **Outbox** | ❌ Não emitido |
| **EventType** | `PATIENT_UPDATED` (`eventPublisher.js:129`) |
| **Filas (eventToQueueMap)** | `['patient-projection']` (`eventPublisher.js:253`) |
| **Consumers** | `patientProjectionWorker` ✅ |
| **Status** | ⚠️ **Órfão de producer** |
| **Observação** | O consumer está pronto, mas o producer (V2) rebuilda view síncrona sem Outbox. A Agenda Externa usa V1, que não emite nada. |

---

## 1.8 PATIENT_DELETED

| Campo | Valor |
|-------|-------|
| **Producer** | `back/routes/patient.v2.js` (DELETE `/api/v2/patients/:id`) |
| **Persistência** | Sem transação |
| **Outbox** | ❌ Não emitido |
| **EventType** | `PATIENT_DELETED` (`eventPublisher.js:130`) |
| **Filas (eventToQueueMap)** | `['patient-projection']` (`eventPublisher.js:255`) |
| **Consumers** | `patientProjectionWorker` ✅ |
| **Status** | ⚠️ **Incompleto** |
| **Observação** | EventType e fila existem, mas a rota V2 de delete não salva no Outbox. |

---

## 1.9 PACKAGE_CREATED

| Campo | Valor |
|-------|-------|
| **Producer** | `back/controllers/packageController.v2.js` (`createPackageV2`) |
| **Endpoint** | `POST /api/v2/packages` |
| **Persistência** | Dentro de transação |
| **Outbox** | ✅ Sim (`packageController.v2.js:1287-1302`) |
| **EventType** | `PACKAGE_CREATED` (`eventPublisher.js:91`) |
| **Filas (eventToQueueMap)** | `['package-projection', 'package-validation', 'patient-projection']` (`eventPublisher.js:260`) |
| **Consumers** | `packageProjectionWorker` ✅; `packageValidationWorker` ✅; `patientProjectionWorker` ✅ |
| **Status** | ✅ **Operacional** (embora producer seja controller, não command) |
| **Observação** | Funciona, mas viola a regra "Route → Command". |

---

## 1.10 PACKAGE_UPDATED

| Campo | Valor |
|-------|-------|
| **Producer** | `back/services/billing/commands/updatePackageCommand.js` |
| **Endpoint** | `PUT /api/v2/packages/:id` |
| **Persistência** | Dentro de `runTransactionWithRetry` |
| **Outbox** | ✅ Sim |
| **EventType** | `PACKAGE_UPDATED` (`eventPublisher.js:92`) |
| **Filas (eventToQueueMap)** | `['package-projection', 'package-validation', 'patient-projection']` (`eventPublisher.js:261`) |
| **Consumers** | `packageProjectionWorker` ✅; `packageValidationWorker` ✅; `patientProjectionWorker` ✅ |
| **Status** | ✅ **Operacional** |
| **Observação** | Evento emitido apenas quando há mudança real no documento `Package`. Payload inclui `packageId`, `patientId`, `doctorId`, `updatedFields`. |

---

## 1.11 PACKAGE_CANCELLED

| Campo | Valor |
|-------|-------|
| **Producer** | `back/routes/package.v2.js` (`POST /api/v2/packages/:id/inactivate`) e outros |
| **Persistência** | Sem transação |
| **Outbox** | ❌ Não emitido |
| **EventType** | `PACKAGE_CANCELLED` (`eventPublisher.js:93`) |
| **Filas (eventToQueueMap)** | `['package-projection', 'package-validation', 'patient-projection']` (`eventPublisher.js:262`) |
| **Consumers** | `packageProjectionWorker` ✅; `packageValidationWorker` ✅; `patientProjectionWorker` ✅ |
| **Status** | ⚠️ **Incompleto** |
| **Observação** | Evento existe no catálogo, mas os producers atuais não o emitem. |

---

## 1.12 SESSION_COMPLETED

| Campo | Valor |
|-------|-------|
| **Producer** | `completeOrchestrator` / `completeSessionService.v2` |
| **Persistência** | Dentro de transação |
| **Outbox** | ✅ Sim |
| **EventType** | `SESSION_COMPLETED` (`eventPublisher.js:73`) |
| **Filas (eventToQueueMap)** | `['package-projection', 'patient-projection', 'clinical-session', 'integration-orchestrator']` (`eventPublisher.js:230`) |
| **Consumers** | `packageProjectionWorker` ✅; `patientProjectionWorker` ✅; workers clínicos ✅ |
| **Status** | ✅ **Operacional** |
| **Observação** | Indiretamente afeta pacotes e pacientes visualizados pela Agenda Externa. |

---

## 1.13 SESSION_CANCELLED

| Campo | Valor |
|-------|-------|
| **Producer** | Commands de cancelamento |
| **Persistência** | Dentro de transação |
| **Outbox** | ✅ Sim |
| **EventType** | `SESSION_CANCELLED` (string literal `eventPublisher.js:233`) |
| **Filas (eventToQueueMap)** | `['package-projection', 'sync-medical', 'patient-projection', 'clinical-session']` |
| **Consumers** | `packageProjectionWorker` ✅; `syncMedicalWorker` ✅; `patientProjectionWorker` ✅ |
| **Status** | ✅ **Operacional** |

---

## 1.14 PAYMENT_COMPLETED

| Campo | Valor |
|-------|-------|
| **Producer** | `completeOrchestrator` |
| **Persistência** | Dentro de transação |
| **Outbox** | ✅ Sim |
| **EventType** | `PAYMENT_COMPLETED` (`eventPublisher.js:77`) |
| **Filas (eventToQueueMap)** | `['notification', 'integration-orchestrator', 'lead-orchestrator-v2']` (`eventPublisher.js:238`) |
| **Consumers** | `notificationOrchestratorWorker` ❌ não preparado; integrações ✅ |
| **Status** | ⚠️ **Parcial** |
| **Observação** | Similar a `APPOINTMENT_CREATED`, a fila `notification` pode falhar. |

---

## 1.15 NOTIFICATION_REQUESTED

| Campo | Valor |
|-------|-------|
| **Producer** | Vários serviços |
| **Outbox** | ✅ Sim |
| **EventType** | `NOTIFICATION_REQUESTED` (`eventPublisher.js:115`) |
| **Filas (eventToQueueMap)** | `'notification'` (`eventPublisher.js:272`, `319`) |
| **Consumers** | `notificationOrchestratorWorker` ✅ |
| **Status** | ✅ **Operacional** |
| **Observação** | Único evento que o `notificationOrchestratorWorker` foi projetado para processar. |

---

# 2. Eventos atuais — quebrados / legados / órfãos

## 2.1 PREAGENDAMENTO_CREATED

| Campo | Valor |
|-------|-------|
| **Producer** | `back/routes/preAgendamento.engine.js:216-225` |
| **Endpoint** | `POST /api/v2/pre-appointments` |
| **Método de publicação** | `publishEvent(EventTypes.PREAGENDAMENTO_CREATED).catch(() => {})` |
| **Persistência** | Fora de transação |
| **Outbox** | ❌ Não |
| **EventType** | `PREAGENDAMENTO_CREATED` (`eventPublisher.js:178`) |
| **Filas (eventToQueueMap)** | ❌ **Não mapeado** |
| **Consumer declarado** | `preAgendamentoWorker.js` escuta `'preagendamento-processing'` |
| **Status** | ⚠️ **Órfão / legado congelado** |
| **Motivo do bloqueio** | 1. Payload incompatível: engine publica `preAppointmentId`, `patientName`, `specialty`, `source`; worker espera `patientInfo`, `preferredDate`, `preferredTime`. 2. `handleCreated` não tem idempotência de estado — criaria duplicatas. 3. Worker é iniciado por padrão (`workers/registry.js:92`). |
| **Decisão** | 🚫 **Não ativar** sem reescrever worker. |

---

## 2.2 PREAGENDAMENTO_IMPORTED

| Campo | Valor |
|-------|-------|
| **Producer** | `back/routes/preAgendamento.engine.js:412-422` |
| **Endpoint** | `POST /api/v2/pre-appointments/:id/confirm` |
| **Método de publicação** | `publishEvent(EventTypes.PREAGENDAMENTO_IMPORTED).catch(() => {})` |
| **Persistência** | Fora de transação |
| **Outbox** | ❌ Não |
| **EventType** | `PREAGENDAMENTO_IMPORTED` (`eventPublisher.js:179`) |
| **Filas (eventToQueueMap)** | ❌ **Não mapeado** |
| **Consumer declarado** | `preAgendamentoWorker.js` |
| **Status** | ⚠️ **Órfão / legado congelado** |
| **Motivo do bloqueio** | 1. Payload incompatível: engine publica `preAppointmentId`; worker espera `preAgendamentoId`. 2. Bug interno: worker acessa `hybridResult.appointment._id`, mas `appointmentHybridService.create()` retorna `appointmentId` como string → `Cannot read properties of undefined`. |
| **Decisão** | 🚫 **Não ativar** sem reescrever worker. |

---

## 2.3 PACKAGE_UPDATE_REQUESTED (eliminado)

| Campo | Valor |
|-------|-------|
| **Producer anterior** | `back/routes/package.v2.js:354` |
| **Endpoint** | `PUT /api/v2/packages/:id` |
| **Método de publicação** | `publishEvent('PACKAGE_UPDATE_REQUESTED', ...)` |
| **Status** | ❌ **Eliminado na Fase 1** |
| **Motivo** | Evento não catalogado; quebrava a rota com `UNKNOWN_EVENT_TYPE`. Foi substituído pelo evento canônico `PACKAGE_UPDATED` via `updatePackageCommand`. |
| **Decisão** | Não recriar. Usar `PACKAGE_UPDATED`. |

---

## 2.4 PACKAGE_DELETE_REQUESTED

| Campo | Valor |
|-------|-------|
| **Producer** | Nenhum ativo |
| **Consumer preparado** | `packageProjectionWorker.js:230` sabe processar |
| **EventType** | ❌ **Não existe em `EventTypes`** |
| **Filas (eventToQueueMap)** | ❌ **Não mapeado** |
| **Status** | ⚠️ **Planejado / não catalogado** |
| **Observação** | Worker já tem handler, mas não há producer nem roteamento. |

---

# 3. Eventos ausentes — deveriam existir pela arquitetura alvo

## 3.1 APPOINTMENT_DELETED

| Campo | Valor |
|-------|-------|
| **Necessário para** | Atualização de `PatientsView`, `PackagesView`, remoção de `MedicalEvent`, relatórios |
| **Producer atual** | ❌ Nenhum |
| **Endpoint afetado** | `DELETE /api/v2/appointments/:id` |
| **EventType** | ❌ Não existe em `EventTypes` |
| **Filas (eventToQueueMap)** | ❌ Não mapeado |
| **Consumers necessários** | `patientProjectionWorker`, `syncMedicalWorker`, `packageProjectionWorker`, `clinicalOrchestrator` |
| **Status** | ❌ **Planejado** |
| **Observação** | O command `deleteAppointmentCommand.js` faz hard delete sem emitir evento. Outros caminhos de delete (`importFromAgenda.js`, `package.v2.js`, `insuranceGuides.v2.js`, scripts) também não emitem eventos. |

---

## 3.2 PACKAGE_DELETED

| Campo | Valor |
|-------|-------|
| **Necessário para** | Auditoria, remoção de `PackagesView`, rebuild de `PatientsView` |
| **Producer atual** | ❌ Nenhum |
| **Endpoint afetado** | `DELETE /api/v2/packages/:id` |
| **EventType** | ❌ Não existe em `EventTypes` |
| **Filas (eventToQueueMap)** | ❌ Não mapeado |
| **Consumers necessários** | `packageProjectionWorker`, `patientProjectionWorker` |
| **Status** | ❌ **Planejado** |
| **Observação** | A rota `DELETE /api/v2/packages/:id` executa lógica financeira de `PatientBalance` e apaga documentos sem evento. |

---

## 3.3 APPOINTMENT_CREATED (convênio)

| Campo | Valor |
|-------|-------|
| **Necessário para** | Rebuild de `PatientsView`, notificações, integrações, `clinicalOrchestrator` |
| **Producer atual** | `back/services/billing/insuranceBilling.js` |
| **Endpoint afetado** | `POST /api/v2/appointments` (quando convênio) |
| **EventType** | `APPOINTMENT_CREATED` (já existe) |
| **Filas (eventToQueueMap)** | `['notification', 'patient-projection', 'clinical-orchestrator']` |
| **Consumers preparados** | `patientProjectionWorker` ✅; `clinicalOrchestrator` ❌ (bug); `notificationOrchestratorWorker` ❌ |
| **Status** | ❌ **Bloqueado** |
| **Observação** | O evento existe, mas o producer não o emite. Ativar sem corrigir consumidores causa duplicação de sessões e DLQ. Ver seção 2 do `CURRENT_STATE_AUDIT.md`. |

---

## 3.4 PATIENT_UPDATED (fluxo principal)

| Campo | Valor |
|-------|-------|
| **Necessário para** | Rebuild consistente de `PatientsView` |
| **Producer atual** | ❌ Nenhum no fluxo principal |
| **Endpoint afetado** | `PUT /api/v2/patients/:id` e `PUT /api/patients/:id` (usado pela Agenda) |
| **EventType** | `PATIENT_UPDATED` (já existe) |
| **Filas (eventToQueueMap)** | `['patient-projection']` |
| **Consumer preparado** | `patientProjectionWorker` ✅ |
| **Status** | ❌ **Bloqueado parcialmente** |
| **Observação** | V1 não emite nada. V2 rebuilda view síncrona sem Outbox. O consumer está pronto, mas o producer precisa ser refatorado. |

---

# 4. Mapa de consumidores

| Evento | Consumer | Fila | Pronto? | Restrição |
|--------|----------|------|---------|-----------|
| `APPOINTMENT_CREATED` | `packageProjectionWorker` | `package-projection` | ✅ Sim | Não roteado no mapa, mas consumer existe e sabe processar |
| `APPOINTMENT_CREATED` | `patientProjectionWorker` | `patient-projection` | ✅ Sim | Roteado |
| `APPOINTMENT_CREATED` | `clinicalOrchestrator` | `clinical-orchestrator` | ❌ Não | Bug: busca por `appointment` em vez de `appointmentId`; cria sessão duplicada |
| `APPOINTMENT_CREATED` | `notificationOrchestratorWorker` | `notification` | ❌ Não | Espera `NOTIFICATION_REQUESTED`; falha com `TYPE_AND_TO_REQUIRED` |
| `APPOINTMENT_UPDATED` | `packageProjectionWorker` | `package-projection` | ✅ Sim | **Não roteado no mapa** — principal causa do bypass |
| `APPOINTMENT_UPDATED` | `patientProjectionWorker` | `patient-projection` | ✅ Sim | Roteado |
| `APPOINTMENT_UPDATED` | `appointmentIntegrationWorker` | `appointment-integration` | ✅ Sim | Roteado |
| `APPOINTMENT_UPDATED` | `notificationOrchestratorWorker` | `notification` | ❌ Não | Incompatível |
| `APPOINTMENT_CANCELLED` | `syncMedicalWorker` | `sync-medical` | ✅ Sim | Roteado |
| `APPOINTMENT_CANCELLED` | `patientProjectionWorker` | `patient-projection` | ✅ Sim | Roteado |
| `APPOINTMENT_CANCELLED` | `clinicalOrchestrator` | `clinical-orchestrator` | ✅ Sim | Roteado |
| `APPOINTMENT_CANCELLED` | `packageProjectionWorker` | `package-projection` | ✅ Sim | Roteado |
| `APPOINTMENT_DELETED` | `patientProjectionWorker` | `patient-projection` | ❌ Não | Evento não existe; worker precisa ser atualizado |
| `APPOINTMENT_DELETED` | `syncMedicalWorker` | `sync-medical` | ❌ Não | Evento não existe |
| `APPOINTMENT_DELETED` | `packageProjectionWorker` | `package-projection` | ❌ Não | Evento não existe |
| `PREAGENDAMENTO_CREATED` | `preAgendamentoWorker` | `preagendamento-processing` | ❌ Não | Worker incompatível; fila não roteada |
| `PREAGENDAMENTO_IMPORTED` | `preAgendamentoWorker` | `preagendamento-processing` | ❌ Não | Worker com bug e payload incompatível |
| `PATIENT_REGISTERED` | `patientProjectionWorker` | `patient-projection` | ✅ Sim | Roteado |
| `PATIENT_CREATED` | `patientProjectionWorker` | `patient-projection` | ✅ Sim | Roteado |
| `PATIENT_UPDATED` | `patientProjectionWorker` | `patient-projection` | ✅ Sim | Roteado, mas sem producer |
| `PATIENT_DELETED` | `patientProjectionWorker` | `patient-projection` | ✅ Sim | Roteado, mas sem producer |
| `PACKAGE_CREATED` | `packageProjectionWorker` | `package-projection` | ✅ Sim | Roteado |
| `PACKAGE_CREATED` | `packageValidationWorker` | `package-validation` | ✅ Sim | Roteado |
| `PACKAGE_CREATED` | `patientProjectionWorker` | `patient-projection` | ✅ Sim | Roteado |
| `PACKAGE_UPDATED` | `packageProjectionWorker` | `package-projection` | ✅ Sim | Roteado |
| `PACKAGE_UPDATED` | `packageValidationWorker` | `package-validation` | ✅ Sim | Roteado |
| `PACKAGE_UPDATED` | `patientProjectionWorker` | `patient-projection` | ✅ Sim | Roteado |
| `PACKAGE_DELETE_REQUESTED` | `packageProjectionWorker` | `package-projection` | ✅ Sim | Worker sabe processar, mas evento não está catalogado |
| `PACKAGE_DELETED` | `packageProjectionWorker` | `package-projection` | ❌ Não | Evento não existe |
| `PACKAGE_DELETED` | `patientProjectionWorker` | `patient-projection` | ❌ Não | Evento não existe |
| `SESSION_COMPLETED` | `packageProjectionWorker` | `package-projection` | ✅ Sim | Roteado |
| `SESSION_COMPLETED` | `patientProjectionWorker` | `patient-projection` | ✅ Sim | Roteado |
| `SESSION_CANCELLED` | `packageProjectionWorker` | `package-projection` | ✅ Sim | Roteado |
| `PAYMENT_COMPLETED` | `notificationOrchestratorWorker` | `notification` | ❌ Não | Incompatível |

---

# 5. Eventos proibidos temporariamente

| Evento | Motivo |
|--------|--------|
| `PREAGENDAMENTO_CREATED` | Worker incompatível com payload; sem idempotência de estado; geraria duplicatas. |
| `PREAGENDAMENTO_IMPORTED` | Worker com bug (`hybridResult.appointment._id`); payload desalinhado. |
| `APPOINTMENT_CREATED` vindo de convênio | `clinicalOrchestrator` criaria sessão duplicada; `notification` iria para DLQ. |
| `PATIENT_CREATED` emitido pela Agenda Externa | Não existe Command de paciente na Agenda; criação de paciente ocorre indiretamente. |
| `PACKAGE_UPDATE_REQUESTED` via `publishEvent` | ❌ Eliminado. Substituído por `PACKAGE_UPDATED`. |
| `APPOINTMENT_DELETED` | Consumers não foram atualizados; estratégia para bulk deletes não definida. |
| `PACKAGE_DELETED` | EventType não existe; lógica financeira de `PatientBalance` precisa ser movida. |

---

# 6. Migração planejada

## Fase 1 — Preparar consumidores existentes

### 6.1 Corrigir `eventToQueueMap`

| Ação | Evento | Fila a adicionar |
|------|--------|------------------|
| Adicionar roteamento | `APPOINTMENT_UPDATED` | `'package-projection'` |
| Remover ou isolar | `APPOINTMENT_CREATED` | Remover `'notification'` até worker ser compatível |
| Catalogar | `PACKAGE_DELETE_REQUESTED` | `'package-projection'` |

### 6.2 Corrigir workers

| Worker | Problema | Correção |
|--------|----------|----------|
| `clinicalOrchestrator` | Busca sessão por campo `appointment` inexistente | Buscar por `appointmentId`; skipar se existir |
| `sessionService` | Grava `appointment` em vez de `appointmentId` | Usar `appointmentId` |
| `notificationOrchestratorWorker` | Não entende eventos de appointment | Ou não receber esses eventos, ou criar handler genérico |
| `packageProjectionWorker` | Já sabe processar `APPOINTMENT_UPDATED` | Nenhuma; apenas garantir roteamento |
| `patientProjectionWorker` | Já sabe processar `APPOINTMENT_DELETED` | Adicionar case quando evento for criado |
| `syncMedicalWorker` | Não processa `APPOINTMENT_DELETED` | Adicionar case quando evento for criado |

## Fase 2 — Migrar producers

| Producer | Evento | Ação |
|----------|--------|------|
| `insuranceBilling.js` | `APPOINTMENT_CREATED` | Adicionar `saveToOutbox` após Fase 1 |
| `patient.v2.js` (PUT) | `PATIENT_UPDATED` | Refatorar para Command + Outbox; remover rebuild síncrono |
| `patient.v2.js` (DELETE) | `PATIENT_DELETED` | Adicionar `saveToOutbox` |
| `deleteAppointmentCommand.js` | `APPOINTMENT_DELETED` | Adicionar `saveToOutbox` e atualizar workers |
| `package.v2.js` (DELETE) | `PACKAGE_DELETED` | Criar Command + Outbox; mover lógica de `PatientBalance` |
| `preAgendamento.engine.js` | `PREAGENDAMENTO_*` | Decidir: remover `publishEvent` ou reescrever worker |

## Fase 3 — Remover legado

| Componente legado | Quando remover |
|-------------------|----------------|
| `appointmentStateOrchestrator` | Após adicionar `'package-projection'` a `APPOINTMENT_UPDATED` e validar |
| `syncAffectedViews` | Após remover todos os callers |
| `syncEvent` como pipeline de projeção | Após todos os fluxos usarem Outbox |
| `publishEvent` em rotas | Após migrar para `saveToOutbox` |
| `PUT /api/patients/:id` (V1) | Após migrar Agenda Externa e confirmar ausência de outros consumers |
| Código morto da Agenda Externa | Após auditoria de referências |

---

# 7. Matriz de risco por ativação

| Evento | Risco de ativar agora | Principal causa |
|--------|------------------------|-----------------|
| `APPOINTMENT_CREATED` (convênio) | 🔴 Crítico | Consumers não preparados |
| `PREAGENDAMENTO_CREATED` | 🔴 Crítico | Worker incompatível |
| `PREAGENDAMENTO_IMPORTED` | 🔴 Crítico | Worker com bug |
| `PACKAGE_UPDATED` (ativado) | 🟡 Baixo | Roteamento existente; monitorar filas |
| `APPOINTMENT_DELETED` | 🟠 Médio-Alto | Workers não atualizados; bulk deletes |
| `PACKAGE_DELETED` | 🟠 Médio-Alto | Lógica financeira síncrona a mover |
| `PATIENT_UPDATED` (V2 async) | 🟠 Médio | Consistência eventual em listagem |
| `APPOINTMENT_UPDATED` → `package-projection` | 🟡 Médio | Bypass legado pode ser removido com monitoramento |

---

# 8. Checklist antes de ativar qualquer evento

Para cada evento que se deseja ativar, responder:

- [ ] O `EventType` existe em `back/infrastructure/events/eventPublisher.js`?
- [ ] O evento está mapeado em `eventToQueueMap`?
- [ ] Todas as filas mapeadas têm workers ativos e registrados?
- [ ] Cada worker sabe processar o payload do evento?
- [ ] Cada worker tem idempotência de estado (não só cache em memória)?
- [ ] O producer salva o evento no Outbox dentro da transação MongoDB?
- [ ] Existe teste de integração cobrindo producer → Outbox → Dispatcher → Worker → Read Model?
- [ ] Existe rollback possível se o worker falhar em produção?

---

# 9. Próximos passos recomendados

1. **Aprovar esta matriz** como referência de migração.
2. **Criar `ARCHITECTURE.md`** da Agenda Externa com base nos estados congelados.
3. **Implementar correções de sobrevivência** (endpoints quebrados: `admin-edit`, `GET /api/reminders/:id`, `PUT /api/v2/packages/:id`).
4. **Executar Fase 1** (preparar consumidores).
5. **Executar Fase 2** (migrar producers).
6. **Executar Fase 3** (remover legado).

---

*Documento de referência para migração. Congelado em 2026-07-08.*
