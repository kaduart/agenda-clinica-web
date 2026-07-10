# Fase 4 — Relatório de Impacto

**Data:** 2026-07-09  
**Escopo:** backend CRM (`/home/user/projetos/crm/back`)  
**Objetivo:** documentar impacto antes de migrar producers para o padrão Outbox.

---

## 1. Catálogo de eventos higienizado

| Evento | EventTypes | Producer | Consumer | Queue mapeada | Status |
|--------|-----------|----------|----------|---------------|--------|
| `APPOINTMENT_CREATED` | ✅ | ✅ Outbox (`createAppointmentCommand` via services) | ✅ | ✅ | OK |
| `APPOINTMENT_UPDATED` | ✅ | ✅ Outbox (`updateAppointmentCommand`) | ✅ | ✅ | OK |
| `APPOINTMENT_CANCELLED` | ✅ | ✅ Outbox (`cancelAppointmentCommand`) | ✅ | ✅ | OK |
| `APPOINTMENT_DELETED` | ✅ | ⚠️ **Será adicionado** (`deleteAppointmentCommand`) | ✅ | ✅ | **Em migração** |
| `APPOINTMENT_COMPLETED` | ✅ | ❌ Nenhum em produção | ✅ | ✅ | **Consumer legado** |
| `APPOINTMENT_REJECTED` | ✅ | ✅ Direto (`appointmentWorker`, `packageValidationWorker`) | ✅ | ✅ | Producer legado |
| `APPOINTMENT_RESCHEDULED` | ✅ | ✅ Direto (`domains/clinical/services/appointmentService.js`) | ✅ | ✅ | Producer legado |
| `APPOINTMENT_STATUS_CHANGED` | ❌ | ✅ Direto (`expirePreAgendamentoCommand`) | ❌ | ❌ | **Evento fantasma** |
| `APPOINTMENT_CREATE_REQUESTED` | ✅ | ✅ Direto | ✅ | ✅ | Producer legado |
| `APPOINTMENT_CANCEL_REQUESTED` | ✅ | ✅ Direto | ✅ | ✅ | Producer legado |
| `APPOINTMENT_COMPLETE_REQUESTED` | ✅ | ❌ Apenas testes | ✅ | ✅ | Consumer legado |
| `SESSION_COMPLETED` | ✅ | ✅ Outbox (`completeSessionService.v2`) | ✅ | ✅ | OK |
| `SESSION_CANCELED` | ✅ | ✅ Outbox | ✅ | ✅ | OK |
| `SESSION_CANCELLED` | ❌ (literal) | ✅ Outbox | ✅ | ✅ | OK (literal legado) |
| `SESSION_SCHEDULED` | ❌ (literal) | ✅ Outbox | ✅ | ✅ | OK (literal legado) |
| `SESSION_NO_SHOW` | ❌ (literal) | ✅ Outbox | ✅ | ✅ | OK (literal legado) |
| `SESSION_PAYMENT_RECEIVED` | ✅ | ❌ Não encontrado | ✅ | ✅ | Consumer legado |
| `PATIENT_REGISTERED` | ❌ (literal) | ✅ Outbox | ✅ | ✅ | OK (literal legado) |
| `PATIENT_UPDATED` | ✅ | ✅ Outbox (`patientService`) | ✅ | ✅ | OK |
| `PATIENT_DELETED` | ✅ | ✅ Direto (`patientWorker`) | ✅ | ✅ | Producer legado |
| `PATIENT_VIEW_REBUILD_REQUESTED` | ✅ | ✅ Outbox | ✅ | ✅ | OK |
| `PACKAGE_CREATED` | ✅ | ✅ Outbox (`packageController.v2.js`) | ✅ | ✅ | OK |
| `PACKAGE_UPDATED` | ✅ | ✅ Outbox (`updatePackageCommand`) | ✅ | ✅ | OK |
| `PACKAGE_CANCELLED` | ✅ | ❌ Não encontrado | ✅ | ✅ | **Consumer legado** |
| `PACKAGE_DELETED` | ✅ | ⚠️ **Será adicionado** (`deletePackageCommand`) | ✅ | ✅ | **Em migração** |
| `PAYMENT_STATUS_CHANGED` | ✅ | ✅ Outbox (`paymentStatusService`) | ✅ | ✅ | OK |
| `PAYMENT_CREATED` | ✅ | ✅ Direto (hook + worker) | ✅ | ✅ | Producer legado |
| `PAYMENT_COMPLETED` | ✅ | ✅ Direto (`paymentWorker`) | ✅ | ✅ | Producer legado |
| `INSURANCE_GUIDE_CREATED` | ✅ | ✅ Outbox | ✅ | ✅ | OK |
| `INSURANCE_BATCH_PROCESSING` | ❌ | ✅ Outbox | ❌ | ❌ | **Inconsistente** |
| `INSURANCE_BATCH_COMPLETED` | ❌ | ✅ Outbox | ❌ | ❌ | **Inconsistente** |
| `INSURANCE_BATCH_PARTIAL_SUCCESS` | ❌ | ✅ Outbox | ❌ | ❌ | **Inconsistente** |
| `INSURANCE_ITEM_RETRYING` | ❌ | ✅ Outbox | ❌ | ❌ | **Inconsistente** |
| `LIMINAR_CONTRACT_CREATED` | ✅ | ✅ Outbox | ✅ | ✅ | OK |
| `PREAGENDAMENTO_CREATED` | ✅ | ✅ Direto | ❌ | ❌ | **Inconsistente** |
| `PREAGENDAMENTO_IMPORTED` | ✅ | ✅ Direto | ❌ | ❌ | **Inconsistente** |

> Tabela focada nos eventos relevantes para a Fase 4. Eventos WhatsApp, followups e notificações seguem como producer legado fora do escopo desta leva.

---

## 2. Producers a serem alterados

### 2.1 `deleteAppointmentCommand` → `APPOINTMENT_DELETED`

| Aspecto | Detalhe |
|---------|---------|
| **Arquivo** | `back/services/appointment/commands/deleteAppointmentCommand.js` |
| **Alteração** | Adicionar `saveToOutbox(APPOINTMENT_DELETED)` dentro da transação existente |
| **Evento novo** | `APPOINTMENT_DELETED` |
| **Rota impactada** | `DELETE /api/v2/appointments/:id` (em `appointment.v2.js`) |
| **Lógica de negócio** | Não altera — apenas notifica projeções |

**Rollback:**
- Remover a chamada `saveToOutbox`.
- Limpar eventos `APPOINTMENT_DELETED` pendentes do Outbox se necessário.

---

### 2.2 `package.v2.js` DELETE → `deletePackageCommand` → `PACKAGE_DELETED`

| Aspecto | Detalhe |
|---------|---------|
| **Arquivo novo** | `back/services/billing/commands/deletePackageCommand.js` |
| **Arquivos alterados** | `back/routes/package.v2.js` |
| **Alteração** | Mover lógica de DELETE da rota para um Command; adicionar `saveToOutbox(PACKAGE_DELETED)` |
| **Evento novo** | `PACKAGE_DELETED` |
| **Rota impactada** | `DELETE /api/v2/packages/:id` |
| **Lógica de negócio** | Move manipulação de `PatientBalance` da rota para o Command, sem alterar regras |

**Rollback:**
- Restaurar lógica da rota.
- Remover `deletePackageCommand.js`.
- Limpar eventos `PACKAGE_DELETED` pendentes do Outbox.

---

### 2.3 `expirePreAgendamentoCommand` → evento canônico

| Aspecto | Detalhe |
|---------|---------|
| **Arquivo** | `back/services/appointment/commands/expirePreAgendamentoCommand.js` |
| **Alteração** | Substituir `publishEvent(EventTypes.APPOINTMENT_STATUS_CHANGED)` por `saveToOutbox(APPOINTMENT_UPDATED)` |
| **Evento atual (fantasma)** | `APPOINTMENT_STATUS_CHANGED` (não existe em `EventTypes`) |
| **Evento novo** | `APPOINTMENT_UPDATED` |
| **Rota impactada** | Fluxo interno de expiração de pré-agendamento |
| **Lógica de negócio** | Mantém o status operacional resultante; apenas troca mecanismo de publicação |

**Rollback:**
- Restaurar `publishEvent(EventTypes.APPOINTMENT_STATUS_CHANGED)`.
- Nota: como o evento não existe no catálogo, ele sempre falha no OutboxDispatcher.

---

## 3. Consumers afetados

### 3.1 Por `APPOINTMENT_DELETED`

| Consumer | Fila | Handler existe? | Ação necessária |
|----------|------|-----------------|-----------------|
| `patientProjectionWorker` | `patient-projection` | ⚠️ Não | Adicionar `case 'APPOINTMENT_DELETED'` → rebuild |
| `packageProjectionWorker` | `package-projection` | ⚠️ Não | Adicionar `case 'APPOINTMENT_DELETED'` → rebuild |
| `syncMedicalWorker` | `sync-medical` | ⚠️ Não | Adicionar handler (ack ou ação futura) |

### 3.2 Por `PACKAGE_DELETED`

| Consumer | Fila | Handler existe? | Ação necessária |
|----------|------|-----------------|-----------------|
| `packageProjectionWorker` | `package-projection` | ⚠️ Não | Adicionar `case 'PACKAGE_DELETED'` → delete view |
| `patientProjectionWorker` | `patient-projection` | ⚠️ Não | Adicionar `case 'PACKAGE_DELETED'` → rebuild |

### 3.3 Por `APPOINTMENT_UPDATED` (no lugar de `APPOINTMENT_STATUS_CHANGED`)

| Consumer | Fila | Handler existe? | Ação necessária |
|----------|------|-----------------|-----------------|
| `patientProjectionWorker` | `patient-projection` | ✅ Sim | Rebuild automático |

---

## 4. Read models afetados

| Read model | Eventos que afetam | Worker |
|------------|-------------------|--------|
| `PatientsView` | `APPOINTMENT_DELETED`, `PACKAGE_DELETED`, `APPOINTMENT_UPDATED` | `patientProjectionWorker` |
| `PackagesView` | `PACKAGE_DELETED`, `APPOINTMENT_DELETED` | `packageProjectionWorker` |
| `EventStore` | Todos (audit) | — |

---

## 5. Rotas/endpoints impactados

| Método | Rota | Alteração |
|--------|------|-----------|
| `DELETE` | `/api/v2/appointments/:id` | Passa a emitir `APPOINTMENT_DELETED` via Outbox |
| `DELETE` | `/api/v2/packages/:id` | Delega para `deletePackageCommand` e emite `PACKAGE_DELETED` |
| Interno | Expiração de pré-agendamento | Passa a emitir `APPOINTMENT_UPDATED` em vez de evento fantasma |

---

## 6. Testes necessários

### 6.1 Testes unitários

- `deleteAppointmentCommand.test.js`
  - Deve deletar appointment dentro de transação.
  - Deve salvar `APPOINTMENT_DELETED` no Outbox.
  - Deve ser idempotente em caso de retry.

- `deletePackageCommand.test.js` (novo)
  - Deve deletar package dentro de transação.
  - Deve ajustar `PatientBalance` conforme lógica existente.
  - Deve salvar `PACKAGE_DELETED` no Outbox.

- `expirePreAgendamentoCommand.test.js` (atualizar)
  - Deve salvar `APPOINTMENT_UPDATED` no Outbox.
  - Não deve referenciar `APPOINTMENT_STATUS_CHANGED`.

### 6.2 Testes de integração

- Verificar que `OutboxDispatcher` publica eventos nas filas corretas.
- Verificar que `patientProjectionWorker` e `packageProjectionWorker` processam os novos eventos.

### 6.3 Regressão

- Rodar suite completa de testes do backend.
- Verificar que rotas DELETE ainda respondem corretamente.

---

## 7. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `PACKAGE_DELETED` move lógica financeira e introduz regressão | Média | Alta | Testar cenário de `PatientBalance`; manter regra idêntica à rota atual |
| Consumers não tratam `APPOINTMENT_DELETED` e eventos vão para DLQ | Baixa | Média | Adicionar handlers antes de ativar producer |
| `expirePreAgendamentoCommand` muda semântica se status não for preservado | Baixa | Média | Manter status operacional; apenas trocar mecanismo |
| Eventos `APPOINTMENT_COMPLETED` continuam sem producer | Alta | Média | **Fora do escopo da Fase 4** — tratar em fase posterior migrando consumers para `SESSION_COMPLETED` |

---

## 8. Plano de rollback

### 8.1 `deleteAppointmentCommand`

1. Reverter commit do `saveToOutbox`.
2. Remover `APPOINTMENT_DELETED` de `EventTypes` e `eventToQueueMap` (se desejado).
3. Limpar Outbox de eventos pendentes: `db.outboxes.deleteMany({ eventType: 'APPOINTMENT_DELETED' })`.

### 8.2 `deletePackageCommand`

1. Restaurar lógica original em `package.v2.js` DELETE.
2. Remover `deletePackageCommand.js`.
3. Remover `PACKAGE_DELETED` de `EventTypes` e `eventToQueueMap` (se desejado).
4. Limpar Outbox de eventos pendentes.

### 8.3 `expirePreAgendamentoCommand`

1. Restaurar `publishEvent(EventTypes.APPOINTMENT_STATUS_CHANGED)`.
2. Nota: o evento fantasma sempre falha; rollback é para compatibilidade temporária apenas.

---

## 9. O que foi deixado para fases futuras

- Migração de `APPOINTMENT_COMPLETED` consumers para `SESSION_COMPLETED`.
- Migração de producers financeiros (`payment.v2.js`, `balance.v2.js`, etc.).
- Migração de `preAgendamento.engine.js`.
- Remoção de hooks de modelos (`Payment.js`, `Expense.js`).
- Migração de workers WhatsApp.
- Resolução dos eventos `INSURANCE_BATCH_*` inconsistentes no Outbox.
- Resolução dos eventos fantasmas do `updateOrchestratorWorker`.

---

## 10. Aprovação para execução

Com base neste relatório, a migração dos 3 producers de baixo risco está autorizada a prosseguir.
