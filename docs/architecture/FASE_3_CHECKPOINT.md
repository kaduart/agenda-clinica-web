# Fase 3 — Checkpoint: Auditoria e preparação Outbox / Consumers

**Data:** 2026-07-09  
**Escopo:** backend CRM (`/home/user/projetos/crm/back`)  
**Status:** ✅ Preparação concluída — **nenhum código foi alterado nesta fase**

---

## 1. Resumo executivo

Esta fase foi puramente de **mapeamento e auditoria**. O objetivo foi entender o estado atual dos eventos, do Outbox e dos consumers antes de qualquer migração de producers na Fase 4.

**Principais descobertas:**
- O pipeline canônico `Command → Transaction → saveToOutbox() → OutboxDispatcher → BullMQ → Workers` já existe e funciona, mas está **adotado de forma parcial**.
- Apenas **3 Commands** usam `saveToOutbox` diretamente (`cancelAppointment`, `updateAppointment`, `updatePackage`).
- A grande maioria das publicações ainda usa **`publishEvent`** (legado) em rotas, workers, services e hooks de modelos.
- Existem **eventos salvos no Outbox sem fila mapeada** e **eventos catalogados sem producer**, que são riscos para a Fase 4.

---

## 2. Inventário de eventos principais

| Evento | Producer atual | Usa Outbox? | Consumers / Filas | Status |
| ------ | -------------- | ----------- | ----------------- | ------ |
| `APPOINTMENT_CREATED` | `createAppointmentCommand` (via `appointmentHybridService` / `createAppointmentService`) | ✅ Sim | `notification`, `patient-projection`, `clinical-orchestrator` | **Canônico** |
| `APPOINTMENT_UPDATED` | `updateAppointmentCommand` | ✅ Sim | `notification`, `patient-projection`, `package-projection`, `appointment-integration` | **Canônico** |
| `APPOINTMENT_CANCELLED` | `cancelAppointmentCommand` | ✅ Sim | `notification`, `patient-projection`, `package-projection`, `sync-medical` | **Canônico** |
| `APPOINTMENT_COMPLETED` | **Nenhum producer em produção** | ❌ | `integration-orchestrator`, `lead-orchestrator-v2` | **GAP CRÍTICO** |
| `SESSION_COMPLETED` | `completeSessionService.v2` | ✅ Sim | `package-projection`, `patient-projection`, `billing-orchestrator`, `integration-orchestrator` | **Canônico** |
| `PATIENT_REGISTERED` | `patientService` / `routes/patient.v2.js` | ✅ Sim | `patient-projection` | **Canônico** |
| `PATIENT_UPDATED` | `patientService` | ✅ Sim | `patient-projection` | **Canônico** |
| `PATIENT_VIEW_REBUILD_REQUESTED` | `routes/patient.v2.js` | ✅ Sim | `patient-projection` | **Canônico** |
| `PATIENT_DELETED` | `domains/clinical/workers/patientWorker.js` | ❌ Direto | `patient-projection` | **Legado** |
| `PACKAGE_CREATED` | `packageController.v2.js` | ✅ Sim | `package-projection`, `patient-projection`, `notification` | **Canônico** |
| `PACKAGE_UPDATED` | `updatePackageCommand` | ✅ Sim | `package-projection`, `patient-projection`, `notification` | **Canônico** |
| `PACKAGE_CANCELLED` / `PACKAGE_DELETED` | **Nenhum producer identificado** | ❌ | `package-projection`, `patient-projection` | **GAP** |
| `PAYMENT_STATUS_CHANGED` | `paymentStatusService` | ✅ Sim | `payment-processing`, `patient-projection`, `notification`, `balance-update` | **Canônico** |
| `PAYMENT_CREATED` | `models/Payment.js` (hook), `billingConsumerWorker.js` | ❌ Direto | `payment-processing`, `patient-projection` | **Legado / safety-net** |
| `PAYMENT_COMPLETED` / `PAYMENT_FAILED` | `workers/paymentWorker.js` | ❌ Direto | `notification`, `balance-update`, `patient-projection` | **Legado** |
| `INSURANCE_GUIDE_CREATED` | `routes/insuranceGuides.v2.js` | ✅ Sim | `insurance-orchestrator` | **Canônico** |
| `LIMINAR_CONTRACT_CREATED` | `controllers/liminarContractController.js` | ✅ Sim | `patient-projection` | **Canônico** |
| `PREAGENDAMENTO_CREATED` / `PREAGENDAMENTO_IMPORTED` | `routes/preAgendamento.engine.js` | ❌ Direto | `preagendamento-processing` | **Legado** |
| `TOTALS_RECALCULATE_REQUESTED` | Várias rotas/workers | ❌ Direto | `totals-calculation` | **Legado** |
| `NOTIFICATION_REQUESTED` | `paymentWorker`, `leadOrchestratorWorker.v2` | ❌ Direto | `notification` | **Legado** |
| `WHATSAPP_MESSAGE_REQUESTED` | `whatsappAutoReplyWorker`, `integrationOrchestratorWorker` | ❌ Direto | `whatsapp-notification` | **Legado** |

> Para o inventário completo (~90+ eventos), consulte as investigações dos subagentes. Esta tabela foca nos eventos críticos para a Fase 4.

---

## 3. Mapa producer → consumer (simplificado)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CANÔNICO (já migrado)                        │
└─────────────────────────────────────────────────────────────────────┘

updateAppointmentCommand
    ↓ runTransactionWithRetry
    ↓ saveToOutbox(APPOINTMENT_UPDATED)
    ↓ OutboxDispatcher
    ↓ BullMQ
    ↓ patient-projection, package-projection, notification, appointment-integration

cancelAppointmentCommand
    ↓ runTransactionWithRetry
    ↓ saveToOutbox(APPOINTMENT_CANCELLED)
    ↓ OutboxDispatcher
    ↓ BullMQ
    ↓ patient-projection, package-projection, notification, sync-medical

updatePackageCommand
    ↓ runTransactionWithRetry
    ↓ saveToOutbox(PACKAGE_UPDATED)
    ↓ OutboxDispatcher
    ↓ BullMQ
    ↓ package-projection, patient-projection, notification

completeSessionService.v2
    ↓ saveToOutbox(SESSION_COMPLETED)
    ↓ OutboxDispatcher
    ↓ BullMQ
    ↓ package-projection, patient-projection, billing-orchestrator, integration-orchestrator
```

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LEGADO (ainda não migrado)                   │
└─────────────────────────────────────────────────────────────────────┘

routes/payment.v2.js
    ↓ publishEvent(PAYMENT_PROCESS_REQUESTED, PAYMENT_STATUS_CHANGED, PAYMENT_UPDATED)
    ↓ EventStore
    ↓ BullMQ
    ↓ payment-processing, notification, balance-update

workers/paymentWorker.js
    ↓ publishEvent(PAYMENT_COMPLETED, PAYMENT_FAILED, PAYMENT_RECEIVED, NOTIFICATION_REQUESTED, ...)
    ↓ EventStore
    ↓ BullMQ
    ↓ notification, balance-update, patient-projection, totals-calculation

routes/preAgendamento.engine.js
    ↓ publishEvent(PREAGENDAMENTO_CREATED, PREAGENDAMENTO_IMPORTED)
    ↓ EventStore
    ↓ BullMQ
    ↓ preagendamento-processing

models/Payment.js (post-save hook)
    ↓ publishEvent(PAYMENT_CREATED, PAYMENT_STATUS_CHANGED)
    ↓ EventStore
    ↓ BullMQ
    ↓ payment-processing, patient-projection

workers/whatsapp* (todos os workers WhatsApp)
    ↓ publishEvent(...)
    ↓ EventStore
    ↓ BullMQ
    ↓ filas whatsapp-*
```

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GAPS CRÍTICOS                                │
└─────────────────────────────────────────────────────────────────────┘

APPOINTMENT_COMPLETED
    ↓ NÃO É PUBLICADO EM PRODUÇÃO
    ↓ MAS É CONSUMIDO POR integrationOrchestratorWorker E lead-orchestrator-v2
    ↓ IMPACTO: quebra a cadeia de billing/notificações pós-atendimento

INSURANCE_BATCH_PROCESSING / INSURANCE_BATCH_COMPLETED / INSURANCE_BATCH_PARTIAL_SUCCESS / INSURANCE_ITEM_RETRYING
    ↓ SALVOS NO OUTBOX POR insuranceOrchestratorWorker
    ↓ NÃO ESTÃO EM eventToQueueMap
    ↓ IMPACTO: OutboxDispatcher marca como UNKNOWN_EVENT_TYPE / failed

APPOINTMENT_STATUS_CHANGED
    ↓ PUBLICADO POR expirePreAgendamentoCommand
    ↓ NÃO EXISTE EM EventTypes / eventToQueueMap
    ↓ IMPACTO: UNKNOWN_EVENT_TYPE / failed

APPOINTMENT_UPDATE_REQUESTED / LEAD_UPDATE_REQUESTED / INVOICE_UPDATE_REQUESTED / PAYMENT_UPDATE_REQUESTED
    ↓ PUBLICADOS POR updateOrchestratorWorker / updateHelper
    ↓ NÃO EXISTEM EM EventTypes / eventToQueueMap
    ↓ IMPACTO: UNKNOWN_EVENT_TYPE / failed
```

---

## 4. Gaps encontrados

### 4.1 Já migrado (padrão canônico)

- `updateAppointmentCommand` → `APPOINTMENT_UPDATED`
- `cancelAppointmentCommand` → `APPOINTMENT_CANCELLED`
- `updatePackageCommand` → `PACKAGE_UPDATED`
- `createAppointmentCommand` (via services) → `APPOINTMENT_CREATED`
- `completeSessionService.v2` → `SESSION_COMPLETED`
- `patientService` / `routes/patient.v2.js` → `PATIENT_REGISTERED`, `PATIENT_UPDATED`, `PATIENT_VIEW_REBUILD_REQUESTED`
- `packageController.v2.js` → `PACKAGE_CREATED`
- `routes/insuranceGuides.v2.js` → `INSURANCE_GUIDE_CREATED`
- `controllers/liminarContractController.js` → `LIMINAR_CONTRACT_CREATED`

### 4.2 Legado (publicação direta)

- Rotas: `payment.v2.js`, `expenses.v2.js`, `evolution.v2.js`, `balance.v2.js`, `totals.v2.js`, `preAgendamento.engine.js`, `importFromAgenda.js`
- Controllers: `whatsappController.js`, `insuranceController.js`
- Models (hooks): `Payment.js`, `Expense.js`
- Workers: `paymentWorker.js`, `appointmentWorker.js`, `cancelOrchestratorWorker.v2.js`, `notificationOrchestratorWorker.js`, `invoiceWorker.js`, `totalsWorker.js`, `evolutionWorker.js`, todos os workers WhatsApp, `packageValidationWorker.js`, `billingConsumerWorker.js`, etc.

### 4.3 Sem evento / producer ausente

| Problema | Onde ocorre | Impacto |
|----------|-------------|---------|
| `APPOINTMENT_COMPLETED` não é publicado | Vários consumers esperam, mas nenhum producer em produção | Consumers nunca são acionados |
| `deleteAppointmentCommand` não salva evento | `services/appointment/commands/deleteAppointmentCommand.js` | Read models não são notificados de exclusão |
| `PACKAGE_CANCELLED` / `PACKAGE_DELETED` sem producer | `package.v2.js` DELETE não emite evento | `PackagesView` e `PatientsView` podem ficar desatualizados |
| `confirmAppointmentCommand` / `clinicalStatusCommand` / `postAppointmentCommand` sem evento | Commands não publicam | Projeções dependem de atualizações manuais |
| `expirePreAgendamentoCommand` publica evento inexistente | `EventTypes.APPOINTMENT_STATUS_CHANGED` não existe | UNKNOWN_EVENT_TYPE |
| Eventos `INSURANCE_BATCH_*` salvos no Outbox sem fila | `eventToQueueMap` não mapeia esses eventos | UNKNOWN_EVENT_TYPE / failed |
| Eventos `*_UPDATE_REQUESTED` do `updateOrchestratorWorker` não catalogados | `EventTypes` não os define | UNKNOWN_EVENT_TYPE / failed |

---

## 6. Auditoria específica: `APPOINTMENT_COMPLETED` vs `SESSION_COMPLETED`

**Hipótese validada:** não é necessário criar `APPOINTMENT_COMPLETED`. A sessão concluída já é o evento de domínio correto.

### Consumidores de `APPOINTMENT_COMPLETED` hoje

| Consumer | O que faz com `APPOINTMENT_COMPLETED` | Pode consumir `SESSION_COMPLETED`? |
|----------|--------------------------------------|-----------------------------------|
| `completeOrchestratorWorker` | Registra audit + atualiza estatísticas secundárias do pacote | ✅ Sim — worker recebe job direto do endpoint; evento audit pode vir de `SESSION_COMPLETED` |
| `syncMedicalWorker` | Apenas ack (invoice já criada) | ✅ Sim — pode ser removido ou migrado para `SESSION_COMPLETED` |
| `leadOrchestratorWorker.v2` | Agenda follow-up 24h depois | ✅ Sim — `SESSION_COMPLETED` pode carregar `appointmentId` no payload |
| `integrationOrchestratorWorker` | Traduz para `APPOINTMENT_BILLING_REQUESTED` | ⚠️ Requer análise — já existe `SESSION_COMPLETED → SESSION_BILLING_REQUESTED`; possível duplicação com billing |
| `packageProjectionWorker` | Rebuild da package view | ✅ Sim — já processa `SESSION_COMPLETED` |
| `patientProjectionWorker` | Rebuild da patient view | ✅ Sim — já processa `SESSION_COMPLETED` |
| `paymentsProjection` | Atualiza `PaymentsView` se tiver `paymentId` | ✅ Sim — `SESSION_COMPLETED` pode carregar `paymentId`, ou usar `PAYMENT_STATUS_CHANGED` |
| `domains/billing/rules/insuranceRules.js` | Regra de billing convênio | ⚠️ Requer análise — `SESSION_COMPLETED` já gera billing via `billingConsumerWorker` |

### Conclusão

- **Não criar `APPOINTMENT_COMPLETED` como novo evento canônico.**
- A estratégia correta é **migrar os consumers** para `SESSION_COMPLETED` ou remover a dependência.
- `SESSION_COMPLETED` é produzido por `completeSessionService.v2` via Outbox — portanto a cadeia pós-sessão já existe e está no padrão canônico.
- Os consumers `packageProjectionWorker` e `patientProjectionWorker` já processam `SESSION_COMPLETED`; a dependência de `APPOINTMENT_COMPLETED` é redundante.

---

## 5. Auditoria dos consumers prioritários

| Consumer | Eventos consumidos | Idempotência | Risco de duplicado | Read model afetado | Observação |
|----------|-------------------|--------------|-------------------|-------------------|------------|
| `patientProjectionWorker` | `PATIENT_*`, `APPOINTMENT_*`, `SESSION_*`, `PAYMENT_*`, `PACKAGE_*`, `BALANCE_UPDATED`, `LIMINAR_CONTRACT_CREATED`, `PATIENT_VIEW_REBUILD_REQUESTED` | ❌ Não verifica `eventId`; rebuild completo é idempotente por design | ✅ Sim, mas rebuild sobrescreve | `PatientsView` | Rebuild completo a cada evento |
| `packageProjectionWorker` | `PACKAGE_*`, `SESSION_*`, `APPOINTMENT_*` | ✅ `processedEvents` Map (24h, limite 5000) | ⚠️ Se cache expirar ou outro processo | `PackagesView` | Usa cache em memória |
| `billingOrchestratorWorker` | `SESSION_COMPLETED`, `INSURANCE_BATCH_SEALED`, `INSURANCE_RETURN_RECEIVED`, `SESSION_CANCELLED` | ✅ `processedEvents` Map (5min) + `eventExists(idempotencyKey)` no EventStore | ⚠️ Protegido por idempotência persistente | `InsuranceGuide`, `Session` | Publica eventos downstream |
| `completeOrchestratorWorker` | Jobs genéricos de complete | ❌ Nenhuma | ✅ Sim | `EventStore` (audit), `Package` | Auto-identificado como secondary |
| `paymentWorker` | `PAYMENT_REQUESTED`, `PAYMENT_PROCESS_REQUESTED`, `PAYMENT_COMPLETED` | ✅ `EventStore.findOne({ eventId, status: 'processed' })` + índice único Mongo | ⚠️ Protegido por EventStore + índice | `Payment`, `Appointment`, `PatientBalance`, `FinancialLedger`, `PaymentsView` | Worker crítico financeiro |
| `balanceWorker` | `BALANCE_DEBIT_REQUESTED`, `BALANCE_CREDIT_REQUESTED` | ✅ `processedEvents` Map (24h) | ⚠️ Se cache expirar | `PatientBalance` | Dispara rebuild em `patient-projection` |

---

## 6. Riscos identificados

| # | Risco | Severidade | Mitigação recomendada para Fase 4 |
|---|-------|------------|-----------------------------------|
| 1 | `APPOINTMENT_COMPLETED` não tem producer | **Alta** | Criar evento `APPOINTMENT_COMPLETED` e publicá-lo via Outbox no fluxo de complete primário |
| 2 | `deleteAppointmentCommand` não emite evento | **Alta** | Criar `APPOINTMENT_DELETED` e adicionar `saveToOutbox` no command |
| 3 | `confirmAppointmentCommand` não emite evento | **Média** | Criar `APPOINTMENT_CONFIRMED` via Outbox ou reutilizar `APPOINTMENT_UPDATED` com mudança de status explícita |
| 4 | `PACKAGE_CANCELLED` / `PACKAGE_DELETED` sem producer | **Média** | Criar Commands `cancelPackageCommand` / `deletePackageCommand` e emitir eventos canônicos |
| 5 | Eventos `INSURANCE_BATCH_*` salvos no Outbox sem fila | **Média** | Adicionar entradas em `eventToQueueMap` OU mover para publicação direta legada temporariamente |
| 6 | `expirePreAgendamentoCommand` publica evento inexistente | **Baixa** | Substituir `APPOINTMENT_STATUS_CHANGED` por evento canônico (`APPOINTMENT_UPDATED` ou novo `PREAGENDAMENTO_EXPIRED`) |
| 7 | `updateOrchestratorWorker` publica eventos fantasmas | **Baixa** | Catalogar em `EventTypes`/`eventToQueueMap` ou remover fluxo |
| 8 | Hooks de modelos (`Payment.js`, `Expense.js`) publicam direto | **Média** | Migrar para Commands/Outbox; manter hooks apenas como safety-net temporário |
| 9 | Workers WhatsApp 100% legados | **Baixa-Média** | Fora do escopo imediato da agenda; manter fora da Fase 4 inicial |
| 10 | Idempotência baseada em cache em memória (`processedEvents` Map) | **Média** | Considerar idempotência persistente (EventStore) para workers financeiros/projeções críticas |

---

## 7. Ordem recomendada para migração futura (Fase 4)

A ordem abaixo prioriza **baixo risco**, **alto impacto na consistência** e **dependências entre consumers**.

### 7.1 Preparação do catálogo (antes de qualquer producer)

1. **Gerar catálogo completo de eventos**
   - Para cada evento: existe em `EventTypes`? Tem producer? Tem consumer? Está em `eventToQueueMap`?
   - Marcar status: `OK`, `Consumer legado`, `Producer legado`, `Inconsistente`, `Evento fantasma`.

2. **Resolver inconsistências de catálogo**
   - Adicionar `APPOINTMENT_DELETED` em `EventTypes` e `eventToQueueMap`.
   - Adicionar `PACKAGE_DELETED` / `PACKAGE_CANCELLED` em `EventTypes` e `eventToQueueMap` (se ainda não estiverem).
   - Remover/catalogar eventos fantasmas (`APPOINTMENT_STATUS_CHANGED`, `*_UPDATE_REQUESTED`, etc.).
   - Decidir sobre `INSURANCE_BATCH_*`: mapear filas ou remover do Outbox.

3. **NÃO criar `APPOINTMENT_COMPLETED`**
   - Migrar consumers para `SESSION_COMPLETED` ou remover dependência.

### 7.2 Gerar relatório de impacto

- Quais producers serão alterados.
- Quais consumers dependem deles.
- Quais read models serão afetados.
- Planos de rollback.

### 7.3 Migração de producers de baixo risco

1. **`deleteAppointmentCommand` → `APPOINTMENT_DELETED`**
   - Baixo risco; evento novo; consumers impactados são projeções.

2. **`package.v2.js` DELETE → `deletePackageCommand` → `PACKAGE_DELETED`**
   - Move lógica financeira de `PatientBalance` para o Command.

3. **`expirePreAgendamentoCommand` → evento canônico**
   - Corrige publicação de evento inexistente (`APPOINTMENT_STATUS_CHANGED`).

### 7.4 Parar e gerar novo checkpoint

- Antes de tocar em producers financeiros, WhatsApp ou orquestradores.
- Validar que projeções continuam consistentes.

---

## 8. Confirmação de escopo

### ✅ Feito na Fase 3
- Mapeamento completo de eventos, producers e consumers.
- Auditoria do Outbox e do `eventToQueueMap`.
- Identificação de gaps críticos.
- Relatório de riscos e ordem recomendada para Fase 4.

### ❌ NÃO feito na Fase 3 (conforme instrução)
- Nenhum código alterado.
- Nenhum producer migrado.
- Nenhum worker modificado.
- Nenhuma regra de negócio alterada.

---

## 9. Parecer

A Fase 3 está **concluída e documentada**. O terreno está preparado para a Fase 4.

**Próximo passo recomendado:** Fase 4 — Migrar producers para o padrão Command + Outbox, começando pela correção do catálogo de eventos (`EventTypes` + `eventToQueueMap`) e pelo `deleteAppointmentCommand`.
