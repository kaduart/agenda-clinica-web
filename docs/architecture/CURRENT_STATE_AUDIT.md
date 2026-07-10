# CURRENT_STATE_AUDIT.md — Agenda Externa

**Version:** 1.0  
**Date:** 2026-07-08  
**Status:** Frozen snapshot  
**Scope:** `/home/user/projetos/agenda` (frontend) + `/home/user/projetos/crm/back` (backend CRM)  

---

## Objetivo

Registrar o **estado real atual** da integração entre Agenda Externa e CRM canônico antes de qualquer migração arquitetural.

Este documento **não representa a arquitetura desejada**. Ele representa o comportamento existente em produção no momento do congelamento.

> **Regra de uso:** nenhuma decisão de migração deve contradizer este documento sem que ele seja explicitamente revisado e versionado.

---

## Legenda de status

| Símbolo | Significado |
|---------|-------------|
| ✅ | Conforme com a arquitetura canônica do CRM |
| ⚠️ | Exceção arquitetural consciente ou legado congelado |
| ❌ | Não conforme e com risco operacional |
| 💀 | Código/componente morto ou sem efeito prático |

---

# 1. Fluxo: Criar paciente

## Entrada

**Frontend:**
- Arquivo: `agenda/src/services/preAppointmentsRepo.js` (indireto, via confirmação de pré-agendamento)
- Função: `createPreAppointment` usa `v2.createAppointment(payload)`

> Nota: a Agenda Externa **não possui tela de criação direta de paciente**. Pacientes são criados:
> 1. Indiretamente quando um pré-agendamento é confirmado (`preAgendamento.engine.js:314-344`).
> 2. Indiretamente quando `createAppointmentCommand` recebe `isNewPatient=true` (`createAppointmentCommand.js:118-145`).

**Backend:**
- Endpoint: `POST /api/v2/pre-appointments/:id/confirm` ou `POST /api/v2/appointments`
- Service/Route: `back/routes/preAgendamento.engine.js` / `back/services/appointment/commands/createAppointmentCommand.js`

## Fluxo atual

### Caminho 1 — Criação via confirmação de pré-agendamento

```
Agenda Externa
   ↓
POST /api/v2/pre-appointments/:id/confirm
   ↓
preAgendamento.engine.js
   ↓
resolução de paciente (busca por telefone ou cria novo Patient)
   ↓
Patient.create({ ... })  // dentro da transação
   ↓
appointmentHybridService.create()
   ↓
saveToOutbox(APPOINTMENT_CREATED)
   ↓
commit
   ↓
publishEvent(PREAGENDAMENTO_IMPORTED)  // descartado (sem fila)
```

### Caminho 2 — Criação via agendamento com isNewPatient=true

```
Agenda Externa
   ↓
POST /api/v2/appointments
   ↓
createAppointmentCommand.js
   ↓
createWithHybridService()
   ↓
resolução de paciente (busca duplicata ou cria novo Patient)
   ↓
Patient.create({ ... })  // fora da transação principal
   ↓
appointmentHybridService.create()
   ↓
saveToOutbox(APPOINTMENT_CREATED)
   ↓
commit
```

## Status

⚠️ **Exceção arquitetural**

## Evidências

- `back/routes/preAgendamento.engine.js:314-344` — cria paciente dentro da transação de confirmação.
- `back/services/appointment/commands/createAppointmentCommand.js:118-145` — cria paciente fora da transação principal (`runTransactionWithRetry` inicia depois).
- `back/services/appointment/commands/createAppointmentCommand.js:189-210` — `appointmentHybridService.create()` chama `saveToOutbox(APPOINTMENT_CREATED)` dentro da transação.

## Risco atual

- Criação de paciente **não passa por um Command de paciente** nem emite `PATIENT_CREATED`/`PATIENT_REGISTERED` no fluxo de agendamento.
- No Caminho 2, criação de paciente ocorre **antes** da transação principal; se a transação falhar, o paciente permanece criado.
- `PatientsView` é atualizada indiretamente via `APPOINTMENT_CREATED` → `patient-projection`, não por evento de paciente.

## Por que não corrigir ainda

- Requer criação de um `CreatePatientCommand` canônico e integração com o fluxo de agendamento.
- Mudança no fluxo de `isNewPatient` pode afetar todos os pontos de entrada de agendamento.
- Risco de quebra de contrato com a Agenda Externa se a resposta do appointment mudar.

---

# 2. Fluxo: Criar agendamento particular

## Entrada

**Frontend:**
- Arquivo: `agenda/src/services/appointmentsRepo.js`
- Função: `upsertAppointment` → `v2.createAppointment`
- Arquivo alternativo: `agenda/src/services/preAppointmentsRepo.js:26` — `createPreAppointment` também usa `v2.createAppointment`

**Backend:**
- Endpoint: `POST /api/v2/appointments`
- Route: `back/routes/appointment.v2.js:121-160`
- Service: `back/services/appointmentV2Service.js:21-23`
- Command: `back/services/appointment/commands/createAppointmentCommand.js`

## Fluxo atual

```
Agenda Externa
   ↓
POST /api/v2/appointments
   ↓
appointment.v2.js
   ↓
createAppointment(payload, user)
   ↓
createAppointmentCommand.execute()
   ↓
createWithHybridService()
   ↓
appointmentHybridService.create()
   ↓
Transaction
   ↓
Appointment.save()
Session.save()
Payment.save()
Patient.appointments $addToSet
   ↓
saveToOutbox(APPOINTMENT_CREATED)
   ↓
commit
   ↓
syncEvent(appointment)  // hook legado → MedicalEvent
emitSocket(appointmentCreated)
```

## Status

✅ **Conforme** (com ressalva de que a criação de paciente ocorre fora da transação quando `isNewPatient=true`)

## Evidências

- `back/services/appointment/commands/createAppointmentCommand.js:53-100` — roteamento por tipo de agendamento.
- `back/services/appointment/commands/createAppointmentCommand.js:178-328` — `createWithHybridService()` com transação.
- `back/services/appointmentHybridService.js:165-184` — `saveToOutbox({ eventType: 'APPOINTMENT_CREATED' })` dentro da transação.
- `back/infrastructure/events/eventPublisher.js:221` — `APPOINTMENT_CREATED` mapeado para `['notification', 'patient-projection', 'clinical-orchestrator']`.

## Risco atual

- Baixo para o fluxo particular em si.
- A ressalva é a criação de paciente fora da transação principal (ver Fluxo 1).

## Por que não corrigir ainda

- O fluxo está alinhado ao pipeline canônico. A ressalva de paciente é tratada no Fluxo 1.

---

# 3. Fluxo: Criar agendamento convênio

## Entrada

**Frontend:**
- Arquivo: `agenda/src/utils/appointmentPayload.js`
- Função: `buildAppointmentPayload` deriva `serviceType='convenio_session'` quando `billingType='convenio'`
- Arquivo: `agenda/src/services/appointmentsRepo.js`
- Função: `upsertAppointment` → `v2.createAppointment`

**Backend:**
- Endpoint: `POST /api/v2/appointments`
- Route: `back/routes/appointment.v2.js:121-160`
- Service: `back/services/appointmentV2Service.js:21-23`
- Command: `back/services/appointment/commands/createAppointmentCommand.js`
- Subservice: `back/services/billing/BillingOrchestrator.js`
- Service final: `back/services/billing/insuranceBilling.js`

## Fluxo atual

```
Agenda Externa
   ↓
POST /api/v2/appointments  (com billingType='convenio' ou insuranceGuideId)
   ↓
createAppointmentCommand.execute()
   ↓
isInsuranceAppointment(payload) === true
   ↓
billingOrchestrator.handleBilling()
   ↓
insuranceBilling.createInsuranceAppointment()
   ↓
Transaction
   ↓
Session.save()
Appointment.save()
Payment.save()
updatePatientAppointments(patientId)
   ↓
commit
   ↓
MedicalEvent.sync via hook post('save')  // legado
   ↓
sem saveToOutbox
sem evento canônico
```

## Status

⚠️ **Exceção arquitetural congelada**

## Evidências

- `back/services/appointment/commands/createAppointmentCommand.js:29-36` — `isInsuranceAppointment()`.
- `back/services/appointment/commands/createAppointmentCommand.js:54-88` — delega para `billingOrchestrator.handleBilling()`.
- `back/services/billing/insuranceBilling.js:61-241` — `createInsuranceAppointment()` cria Session, Appointment, Payment dentro de transação.
- **Ausência de `saveToOutbox`:** busca por `saveToOutbox` em `insuranceBilling.js` retorna vazio.
- Hook legado: `back/models/Appointment.js:593-599` → `syncEvent(doc, 'appointment')` → `back/services/syncService.js:173-247` → upsert em `MedicalEvent`.

## Risco atual

- `PatientsView` não é rebuildada pelo worker para agendamentos de convênio.
- `clinical-orchestrator` não recebe evento para criação de sessão clínica.
- Notificações e integrações não são acionadas pelo pipeline canônico.
- `MedicalEvent` é atualizado apenas pelo hook legado.

## Por que não corrigir ainda

Adicionar `saveToOutbox(APPOINTMENT_CREATED)` em `insuranceBilling.js` sem preparar consumidores causa regressões maiores:

1. `clinicalOrchestrator.js:303` busca sessão existente por `{ appointment: appointmentId }`, mas o campo correto em `Session.js` é `appointmentId`. Resultado: sessão duplicada.
2. `notificationOrchestratorWorker.js:70` espera `payload.type` e `payload.to`; payload de `APPOINTMENT_CREATED` não tem esses campos. Resultado: jobs falham e vão para DLQ.
3. `sessionService.js:53` grava `appointment` em vez de `appointmentId`, reforçando o bug acima.

**Pré-requisitos para correção:**
- Corrigir `clinicalOrchestrator` para buscar por `appointmentId` e skipar se sessão já existir.
- Corrigir `sessionService.js` para usar `appointmentId`.
- Remover `'notification'` do `eventToQueueMap[APPOINTMENT_CREATED]` ou criar handler específico.

---

# 4. Fluxo: Criar pré-agendamento

## Entrada

**Frontend:**
- Arquivo: `agenda/src/services/crmApi.js`
- Função: `sendAppointmentToCrm` / `autoSendPreAgendamento` → `v2.createPreAppointment`
- Arquivo alternativo: `agenda/src/api/v2/agendaV2Client.js:35`
- Função: `createPreAppointment`

> Nota: o fluxo principal do `App.jsx` / `preAppointmentsRepo.js` migrou para `POST /api/v2/appointments`. Apenas `crmApi.js` (legado/exportação) ainda usa `POST /api/v2/pre-appointments`.

**Backend:**
- Endpoint: `POST /api/v2/pre-appointments`
- Route: `back/routes/preAgendamento.engine.js:151-245`

## Fluxo atual

```
Agenda Externa
   ↓
POST /api/v2/pre-appointments
   ↓
preAgendamento.engine.js
   ↓
validação básica
   ↓
new Appointment({ operationalStatus: 'pre_agendado' })
   ↓
preAppointment.save()  // sem transação explícita
   ↓
markIdempotency(requestId)
   ↓
publishEvent(PREAGENDAMENTO_CREATED)
   ↓
evento não está em eventToQueueMap
   ↓
throw UNKNOWN_EVENT_TYPE
   ↓
.catch(() => {})  // silenciado
   ↓
retorna success: true
```

## Status

⚠️ **Legado congelado**

## Evidências

- `back/routes/preAgendamento.engine.js:189-212` — cria pré-agendamento com `new Appointment(...).save()`.
- `back/routes/preAgendamento.engine.js:216-225` — `publishEvent(PREAGENDAMENTO_CREATED).catch(() => {})`.
- `back/infrastructure/events/eventPublisher.js:178-179` — eventos definidos em `EventTypes`.
- `back/infrastructure/events/eventPublisher.js:198-347` — **ausência** de `PREAGENDAMENTO_CREATED` em `eventToQueueMap`.
- `back/workers/preAgendamentoWorker.js:31, 46-50` — worker existe mas nunca recebe jobs.

## Risco atual

- Pré-agendamento é criado corretamente de forma síncrona.
- Evento é publicado e descartado silenciosamente.
- Nenhuma notificação/projeção depende do evento hoje.

## Por que não corrigir ainda

Ativar o evento no `eventToQueueMap` sem reescrever o worker causa regressões:

1. Worker espera payload com `patientInfo`, `preferredDate`, `preferredTime`; engine publica `preAppointmentId`, `patientName`, `specialty`, `source`.
2. `handleCreated` não tem idempotência de estado — criaria pré-agendamentos duplicados.
3. `handleImported` acessa `hybridResult.appointment._id`, mas `appointmentHybridService.create()` retorna `appointmentId` como string — geraria erro `Cannot read properties of undefined`.

**Decisão:** manter congelado até decisão de remover o worker ou reescrevê-lo.

---

# 5. Fluxo: Confirmar pré-agendamento

## Entrada

**Frontend:**
- Arquivo: `agenda/src/services/crmApi.js`
- Função: `sendAppointmentToCrm` / `autoSendPreAgendamento` → `v2.confirmPreAppointment`
- Arquivo: `agenda/src/api/v2/agendaV2Client.js:73`
- Função: `confirmPreAppointment`

> Nota: o fluxo principal do `App.jsx` usa `preAppointmentsRepo.approvePreAppointment` → `v2.updateAppointment` (POST/PUT para `/api/v2/appointments`).

**Backend:**
- Endpoint: `POST /api/v2/pre-appointments/:id/confirm`
- Route: `back/routes/preAgendamento.engine.js:250-445`

## Fluxo atual

```
Agenda Externa
   ↓
POST /api/v2/pre-appointments/:id/confirm
   ↓
preAgendamento.engine.js
   ↓
Transaction
   ↓
resolução de paciente (telefone/nome ou criação)
   ↓
libera slot do pré-agendamento (pre.doctor = null; pre.save())
   ↓
appointmentHybridService.create({ billingType: 'particular', paymentMethod: 'pix' })
   ↓
saveToOutbox(APPOINTMENT_CREATED)  // dentro do hybrid service
   ↓
marca pré-agendamento como canceled + appointmentId
   ↓
commit
   ↓
publishEvent(PREAGENDAMENTO_IMPORTED)
   ↓
evento descartado (sem fila)
```

## Status

⚠️ **Exceção arquitetural congelada**

## Evidências

- `back/routes/preAgendamento.engine.js:250-445` — confirmação transacional.
- `back/routes/preAgendamento.engine.js:361-374` — chama `appointmentHybridService.create()`.
- `back/routes/preAgendamento.engine.js:412-422` — `publishEvent(PREAGENDAMENTO_IMPORTED).catch(() => {})`.
- `back/services/appointmentHybridService.js:165-184` — emite `APPOINTMENT_CREATED` no Outbox.

## Risco atual

- Agendamento real é criado corretamente com evento canônico.
- Evento `PREAGENDAMENTO_IMPORTED` é descartado, mas o fluxo principal não depende dele.
- Pré-agendamento é marcado como `canceled` (não deletado), mantendo histórico.

## Por que não corrigir ainda

- Mesmos problemas do Fluxo 4 (worker incompatível).
- A funcionalidade core funciona sem o evento.

---

# 6. Fluxo: Editar agendamento

## Entrada

**Frontend:**
- Arquivo: `agenda/src/services/appointmentsRepo.js`
- Função: `updateAppointmentDirect` → `v2.updateAppointment`
- Arquivo: `agenda/src/App.jsx`
- Função: `saveAppointment` chama `upsertAppointment` → `updateAppointmentDirect`

**Backend:**
- Endpoint: `PUT /api/v2/appointments/:id`
- Route: `back/routes/appointment.v2.js:163-189`
- Service: `back/services/appointmentV2Service.js:25-27`
- Command: `back/services/appointment/commands/updateAppointmentCommand.js`

## Fluxo atual

```
Agenda Externa
   ↓
PUT /api/v2/appointments/:id
   ↓
updateAppointmentCommand.execute()
   ↓
runTransactionWithRetry
   ↓
Appointment.findByIdAndUpdate()
Session.sync
Payment.update
Patient.update (contato)
   ↓
saveToOutbox(APPOINTMENT_UPDATED)
   ↓
commit
   ↓
syncEvent(saved, 'appointment')  // MedicalEvent
   ↓
appointmentStateOrchestrator()
   ↓
syncAffectedViews('appointment.updated')
   ↓
buildPackageView(packageId, force: true)  // escrita síncrona em Read Model
   ↓
handlePackageSessionUpdate()  // se package_session
```

## Status

⚠️ **Exceção arquitetural congelada**

## Evidências

- `back/services/appointment/commands/updateAppointmentCommand.js:252-265` — `saveToOutbox(APPOINTMENT_UPDATED)` dentro da transação.
- `back/services/appointment/commands/updateAppointmentCommand.js:317-321` — chamada pós-commit a `appointmentStateOrchestrator`.
- `back/services/appointmentStateOrchestrator.js:85-99` → `syncAffectedViews`.
- `back/services/projections/syncAffectedViews.js:34-39` — handler `packages` chama `buildPackageView` diretamente.
- `back/infrastructure/events/eventPublisher.js:223` — `APPOINTMENT_UPDATED` mapeado para `['notification', 'patient-projection', 'appointment-integration']`, **mas não para `'package-projection'`**.

## Risco atual

- O bypass `appointmentStateOrchestrator`/`syncAffectedViews` existe porque `eventToQueueMap` não roteia `APPOINTMENT_UPDATED` para `package-projection`.
- Há múltiplos writers de `PackagesView`: worker assíncrono (via eventos de package/session), bypass síncrono (via update), fallback on-the-fly (via GET).

## Por que não corrigir ainda

A correção é segura **se feita na ordem correta**:

1. Adicionar `'package-projection'` ao `eventToQueueMap[APPOINTMENT_UPDATED]`.
2. Validar que `packageProjectionWorker.js` processa o evento corretamente (já sabe, linha 254).
3. Remover chamada pós-commit a `appointmentStateOrchestrator`.
4. Monitorar fila `package-projection`.

Se remover o bypass sem adicionar ao mapa, `PackagesView` ficará desatualizada após updates.

---

## Edição administrativa (appointments `completed`)

### Entrada

**Frontend:**
- Arquivo: `agenda/src/App.jsx`
- Função: `saveAppointment` chama `adminEditAppointment` quando `editingAppointment?.operationalStatus === 'completed'`.
- Arquivo: `agenda/src/services/appointmentsRepo.js:221-224`
- Arquivo: `agenda/src/api/v2/agendaV2Client.js:135-141`

**Backend:**
- Endpoint: `PATCH /api/v2/appointments/:id/admin-edit`
- Route: `back/routes/appointment.v2.js`
- Adapter: `back/utils/adminEditPayloadNormalizer.js`
- Command: `back/services/appointment/commands/updateAppointmentCommand.js`

### Fluxo atual

```
Agenda Externa
   ↓
PATCH /api/v2/appointments/:id/admin-edit
   ↓
normalizeAdminEditPayload()
   ↓
updateAppointmentCommand.execute()
   ↓
(same as PUT /api/v2/appointments/:id)
```

### Status

✅ **Corrigido na Fase 1**

### Evidências

- Rota implementada em `back/routes/appointment.v2.js`.
- Normalização de payload em `back/utils/adminEditPayloadNormalizer.js`.
- Testes unitários em `back/tests/unit/adminEditPayloadNormalizer.test.js`.
- Reutiliza `updateAppointmentCommand`, mantendo uma única regra de domínio.

### Notas

- Nenhuma mudança arquitetural profunda: mesmo Command, mesmo Outbox, mesmo bypass legado.
- O campo `adminReason` é preservado no payload mas ainda não possui destino no schema (não afeta funcionalidade).

---

# 7. Fluxo: Cancelar agendamento

## Entrada

**Frontend:**
- Arquivo: `agenda/src/services/appointmentsRepo.js`
- Função: `cancelAppointment` → `v2.cancelAppointment`
- Arquivo: `agenda/src/App.jsx`
- Função: `onCancel`

**Backend:**
- Endpoint: `PATCH /api/v2/appointments/:id/cancel`
- Route: `back/routes/appointment.v2.js:192-211`
- Service: `back/services/appointmentV2Service.js:29-31`
- Command: `back/services/appointment/commands/cancelAppointmentCommand.js`

## Fluxo atual

```
Agenda Externa
   ↓
PATCH /api/v2/appointments/:id/cancel
   ↓
cancelAppointmentCommand.execute()
   ↓
runTransactionWithRetry
   ↓
Payment.status = 'canceled'
Session.status = 'canceled'
Package.sessionsDone-- / $pull
Appointment.operationalStatus = 'canceled'
   ↓
saveToOutbox(APPOINTMENT_CANCELLED)
   ↓
commit
   ↓
syncEvent(appointment)  // MedicalEvent
handlePackageSessionUpdate()
```

## Status

✅ **Conforme**

## Evidências

- `back/services/appointment/commands/cancelAppointmentCommand.js:163-179` — `saveToOutbox(APPOINTMENT_CANCELLED)` dentro da transação.
- `back/infrastructure/events/eventPublisher.js:224` — `APPOINTMENT_CANCELLED` mapeado para `['sync-medical', 'patient-projection', 'clinical-orchestrator', 'package-projection']`.
- `back/domains/billing/workers/packageProjectionWorker.js:252` — processa `APPOINTMENT_CANCELLED`.

## Risco atual

- Baixo. O fluxo está alinhado ao pipeline canônico.

## Por que não corrigir ainda

- Não precisa de correção. Pode servir de modelo para os outros fluxos.

---

# 8. Fluxo: Hard delete de agendamento

## Entrada

**Frontend:**
- Arquivo: `agenda/src/services/appointmentsRepo.js`
- Função: `discardPreAppointment` → `v2.deleteAppointment`
- Arquivo: `agenda/src/App.jsx`
- Função: `onDelete`

**Backend:**
- Endpoint: `DELETE /api/v2/appointments/:id`
- Route: `back/routes/appointment.v2.js:279-297`
- Service: `back/services/appointmentV2Service.js:41-43`
- Command: `back/services/appointment/commands/deleteAppointmentCommand.js`

## Fluxo atual

```
Agenda Externa
   ↓
DELETE /api/v2/appointments/:id
   ↓
deleteAppointmentCommand.execute()
   ↓
runTransactionWithRetry
   ↓
Payment.findByIdAndDelete()
Session.appointmentId $unset
Patient.appointments $pull
Appointment.findByIdAndDelete()
   ↓
commit
   ↓
emitSocket(appointmentDeleted)
   ↓
sem saveToOutbox
sem APPOINTMENT_DELETED
   ↓
MedicalEvent removido via hook post('findOneAndDelete')  // fora da transação
PatientsView desatualizada
PackagesView desatualizada (se não tivesse package)
```

## Status

❌ **Não conforme**

## Evidências

- `back/services/appointment/commands/deleteAppointmentCommand.js:24-95` — transação sem `saveToOutbox`.
- `back/services/appointment/commands/deleteAppointmentCommand.js:67` — `Appointment.findByIdAndDelete()`.
- `back/services/appointment/commands/deleteAppointmentCommand.js:72-79` — única notificação: socket.
- `back/models/Appointment.js:611-622` — hook `post('findOneAndDelete')` remove `MedicalEvent` e Sessions.
- `back/domains/clinical/workers/patientProjectionWorker.js:129-188` — não processa `APPOINTMENT_DELETED`.

## Risco atual

- `PatientsView` continua com `stats.totalAppointments`, `lastAppointment`, `nextAppointment` desatualizados.
- `MedicalEvent` é removido pelo hook (fora da transação), mas o command já removeu a referência `Session.appointmentId`, então o hook remove 0 Sessions.
- Outros caminhos de delete (`importFromAgenda.js:1188`, `package.v2.js:635`, `insuranceGuides.v2.js:854/888`, scripts) também não emitem eventos.

## Por que não corrigir ainda

- Correção requer adicionar `APPOINTMENT_DELETED` a `EventTypes` e `eventToQueueMap`.
- Workers (`patientProjectionWorker`, `syncMedicalWorker`, `packageProjectionWorker`, `clinicalOrchestrator`) precisam ser atualizados.
- Estratégia para bulk deletes precisa ser definida.
- Risco médio-alto; pode ser feito após Fase 0/1, mas exige testes de integração.

---

# 9. Fluxo: Pacotes

## Entrada

**Frontend:**
- Arquivo: `agenda/src/api/v2/agendaV2Client.js`
- Funções: `getPackages`, `deletePackageSession`, `cancelPackageSession`
- Arquivo: `agenda/src/services/appointmentsRepo.js`
- Função: `syncDeleteWithPackage` (💀 código morto)

**Backend:**
- Endpoint: `GET /api/v2/packages`
- Route: `back/routes/package.v2.js:68-138`
- Endpoint: `POST /api/v2/packages`
- Controller: `back/controllers/packageController.v2.js`
- Endpoint: `PUT /api/v2/packages/:id`
- Route: `back/routes/package.v2.js:336-375`
- Endpoint: `DELETE /api/v2/packages/:id`
- Route: `back/routes/package.v2.js:535-712`

## Fluxo atual

### Criar pacote

```
POST /api/v2/packages
   ↓
packageController.v2.js createPackageV2()
   ↓
Transaction
   ↓
Package.create()
Appointment.create() (múltiplos)
Session.create()
Payment.create()
   ↓
saveToOutbox(PACKAGE_CREATED)
   ↓
commit
   ↓
buildPackageView()  // síncrono
```

### Editar pacote

```
PUT /api/v2/packages/:id
   ↓
package.v2.js
   ↓
updatePackageCommand.execute()
   ↓
runTransactionWithRetry
   ↓
Package.findByIdAndUpdate()
   ↓
saveToOutbox(PACKAGE_UPDATED)  // apenas se houver mudança real
   ↓
commit
   ↓
200 OK
```

### Deletar pacote

```
DELETE /api/v2/packages/:id
   ↓
package.v2.js
   ↓
Transaction
   ↓
PatientBalance ajuste
Appointment.deleteMany
Session.deleteMany
Payment.deleteMany
Package.deleteOne
PackagesView.delete
   ↓
commit
   ↓
sem evento
```

## Status

- Criar: ⚠️ **Exceção** (controller escreve diretamente, mas usa Outbox)
- Editar: ✅ **Corrigido na Fase 1** (`updatePackageCommand` + `PACKAGE_UPDATED` via Outbox)
- Deletar: ❌ **Não conforme** (sem evento)

## Evidências

- `back/controllers/packageController.v2.js:1287-1302` — `saveToOutbox(PACKAGE_CREATED)`.
- `back/routes/package.v2.js` — `PUT /api/v2/packages/:id` agora chama `updatePackageCommand.execute()`.
- `back/services/billing/commands/updatePackageCommand.js` — Command de update com transação e Outbox.
- `back/infrastructure/events/eventPublisher.js:261` — `PACKAGE_UPDATED` roteado para `package-projection`, `package-validation`, `patient-projection`.
- `back/tests/unit/updatePackageCommand.test.js` — testes do Command.
- `back/routes/package.v2.js:556-684` — delete transacional sem evento.

## Risco atual

- ✅ Edição de pacote corrigida.
- Delete de pacote deixa rastro apenas na transação; sem evento para auditoria/projeções.
- Não foi encontrado caller ativo no frontend para `PUT /api/v2/packages/:id` no código versionado.

## Notas

- **Editar:** corrigido usando `updatePackageCommand` + `saveToOutbox(PACKAGE_UPDATED)`. Não foi criado `PACKAGE_UPDATE_REQUESTED`.
- **Deletar:** requer command + evento `PACKAGE_DELETED` + movimentação da lógica de `PatientBalance`.

---

# 10. Fluxo: Pacientes

## Entrada

**Frontend:**
- Arquivo: `agenda/src/services/patientsRepo.js`
- Função: `fetchPatients`, `searchPatients`, `updatePatient`
- Arquivo: `agenda/src/App.jsx`
- Função: `updatePatient` chamada em `:528` e `:653`

**Backend:**
- Endpoint: `GET /api/patients` (V1)
- Endpoint: `PUT /api/patients/:id` (V1)
- Route: `back/routes/patient.js`
- Endpoint V2: `PUT /api/v2/patients/:id`
- Route: `back/routes/patient.v2.js:434-489`

## Fluxo atual

### Buscar pacientes

```
Agenda Externa
   ↓
GET /api/patients?limit=1000
   ↓
patient.js
   ↓
Patient.find()
```

### Atualizar paciente

```
Agenda Externa
   ↓
PUT /api/patients/:id
   ↓
patient.js
   ↓
Patient.findByIdAndUpdate(req.body)
   ↓
sem transação
sem evento
sem atualização de PatientsView
```

### Atualizar paciente V2 (não usado pela Agenda)

```
PUT /api/v2/patients/:id
   ↓
patient.v2.js
   ↓
Patient.findByIdAndUpdate()
buildPatientView()  // síncrono
   ↓
sem transação
sem Outbox (exceto no POST)
```

## Status

- Buscar: ✅ **Conforme** (apenas leitura)
- Atualizar (V1): ❌ **Não conforme**
- Atualizar (V2): ⚠️ **Exceção** (rebuild síncrono de view, sem Outbox)

## Evidências

- `agenda/src/services/patientsRepo.js:54-57` — `PUT /api/patients/${patientId}`.
- `back/routes/patient.js:241-249` — V1 atualiza direto.
- `back/routes/patient.v2.js:434-489` — V2 atualiza e rebuilda view síncrona.

## Risco atual

- `PatientsView` só reflete alterações do V1 quando outro evento ocorre ou cron roda.
- V2 rebuilda view síncrona, violando regra de Read Models apenas por workers.

## Por que não corrigir ainda

- Migrar Agenda Externa para V2 é seguro e de baixo risco.
- Tornar V2 async (transação + Outbox) introduz consistência eventual em listagens; requer testes e fallback.

---

# 11. Fluxo: Lembretes

## Entrada

**Frontend:**
- Arquivo: `agenda/src/services/remindersRepo.js`
- Funções: `fetchReminders`, `createReminder`, `updateReminder`, `snoozeReminderDays`
- Arquivo: `agenda/src/App.jsx`
- Função: `snoozeReminderDays` chamada em `:1148-1149`

**Backend:**
- Endpoint: `GET /api/reminders`, `POST /api/reminders`, `PATCH /api/reminders/:id`, `GET /api/reminders/:id`
- Route: `back/routes/reminder.js`

## Fluxo atual

```
Agenda Externa
   ↓
GET /api/reminders
POST /api/reminders
PATCH /api/reminders/:id
GET /api/reminders/:id
   ↓
reminder.js
   ↓
Reminder.find() / Reminder.create() / Reminder.findByIdAndUpdate()
   ↓
emit socket
   ↓
sem transação
sem Outbox
```

## Status

- Listar/criar/atualizar: ⚠️ **Exceção arquitetural** (CRUD síncrono + socket)
- Buscar por ID: ✅ **Corrigido na Fase 1**

## Evidências

- `back/routes/reminder.js` — rotas existentes, incluindo `GET /api/reminders/:id`.
- `agenda/src/services/remindersRepo.js:73` — `api.get('/api/reminders/${id}')`.
- Testes de integração em `back/tests/integration/reminder-get-by-id.test.js`.

## Risco atual

- Funcionalidade "Adiar 7 dias" agora funciona.
- Lembretes continuam como exceção arquitetural (CRUD síncrono + socket), mas domínio auxiliar de baixo impacto.

## Notas

- `GET /api/reminders/:id` foi implementado sem alterar o pipeline de eventos — leitura simples direta no model.
- Mover lembretes para Outbox permanece como dívida técnica de baixa prioridade.

---

# 12. Fluxo: Profissionais

## Entrada

**Frontend:**
- Arquivo: `agenda/src/services/professionalsRepo.js`
- Funções: `fetchProfessionals`, `addProfessional`, `deleteProfessional`
- Arquivo: `agenda/src/App.jsx`
- Funções: `handleAddProfessional`, `handleDeleteProfessional`

**Backend:**
- Endpoint: `GET /api/v2/doctors/active`, `POST /api/v2/doctors`, `DELETE /api/v2/doctors/:id`
- Route: `back/routes/doctor.v2.js`

## Fluxo atual

```
Agenda Externa
   ↓
GET /api/v2/doctors/active
POST /api/v2/doctors
DELETE /api/v2/doctors/:id
   ↓
doctor.v2.js
   ↓
Doctor.find() / Doctor.create() / Doctor.findByIdAndDelete()
   ↓
CRUD síncrono
sem evento
```

## Status

⚠️ **Exceção arquitetural consciente**

## Evidências

- `back/routes/doctor.v2.js:281-390` — POST/PUT/DELETE síncronos.
- `back/infrastructure/events/eventPublisher.js:259` — comentário: "Doctors V2 - eventos (sem filas específicas por enquanto)".

## Risco atual

- Não há read model de médicos; todas as leituras são do documento `Doctor`.
- `DELETE` de médico não verifica referências em `Appointment`, `Session`, `Payment`, comissões. Risco de dados órfãos.

## Por que não corrigir ainda

- Sem projeção dependente de eventos, a migração para commands + Outbox não traz ganho imediato.
- Prioridade maior: adicionar integridade referencial no DELETE.

---

# 13. Fluxo: WhatsApp / Baileys

## Entrada

**Frontend:**
- Arquivo: `agenda/src/services/baileysApi.js`
- Funções: `sendWhatsAppMessage`, `sendWhatsAppMediaMessage`, `getStatus`, `connect`, `disconnect`
- Arquivo: `agenda/src/services/whatsappExtension.js`
- Funções: `sendViaExtension`
- Arquivo: `agenda/src/components/PostAppointmentModal.jsx`
- Uso: `sendWhatsAppMessage` / `sendWhatsAppMediaMessage`

**Backend:**
- Endpoints existentes: `/api/whatsapp-web/*`, `/api/whatsapp-vps/*`, `/api/whatsapp/*`
- Endpoints inexistentes: `/api/baileys/*`

## Fluxo atual

```
PostAppointmentModal
   ↓
baileysApi.sendWhatsAppMessage(phone, message)
   ↓
GET /api/baileys/status  // inexistente (silenciado)
   ↓
POST /api/baileys/send  // inexistente
   ↓
fallback para /api/whatsapp-web/send
   ↓
fallback para /api/whatsapp-vps/send
   ↓
fallback para /api/whatsapp/send-text
```

## Status

- `/api/whatsapp-web/*`, `/api/whatsapp-vps/*`, `/api/whatsapp/*`: ✅ **Conforme** (operacional)
- `/api/baileys/*`: 💀 **Código morto / infraestrutura inexistente**

## Evidências

- `agenda/src/services/baileysApi.js:15-48` — tenta Baileys primeiro, depois fallback.
- `grep "baileys" /home/user/projetos/crm/back` — nenhuma implementação de rota/controller.
- `agenda/src/services/baileysApi.js:96, 109` — `connect()` e `disconnect()` estão **trocados**.

## Risco atual

- Envio de mensagem funciona via fallback, mas depende de endpoints fantasmas.
- `getStatus`, `connect`, `disconnect` não são usados em nenhum componente.

## Por que não corrigir ainda

- `/api/baileys/*` pode ser removido do frontend sem perda funcional.
- Requer apenas refatoração do `baileysApi.js` para usar diretamente os endpoints existentes.

---

# 14. Componentes fora do padrão

| Componente | Problema | Risco | Decisão |
|------------|----------|-------|---------|
| `insuranceBilling.js` | Cria agendamento de convênio sem `saveToOutbox` | 🔴 Alto | Manter congelado até corrigir `clinicalOrchestrator`, `sessionService` e roteamento de `notification` |
| `preAgendamentoWorker.js` | Incompatível com payload atual; bug interno | 🔴 Alto | Congelado; não ativar no `eventToQueueMap` |
| `preAgendamento.engine.js` | Route faz escrita direta; publica eventos órfãos | 🟠 Médio | Congelado; funcionalidade core é síncrona |
| `patient.js` (V1) | `PUT /api/patients/:id` sem transação/evento | 🟠 Médio | Migrar Agenda Externa para V2; deprecar V1 depois |
| `patient.v2.js` (PUT) | Atualiza `PatientsView` síncrono; sem Outbox | 🟠 Médio | Tornar async após preparar fallback em listagem e testes |
| `appointmentStateOrchestrator` + `syncAffectedViews` | Bypass síncrono de `PackagesView` | 🟠 Médio | Remover após adicionar `'package-projection'` a `eventToQueueMap[APPOINTMENT_UPDATED]` |
| `deleteAppointmentCommand.js` | Hard delete sem `APPOINTMENT_DELETED` | 🟠 Médio | Adicionar evento após atualizar workers e definir estratégia para bulk deletes |
| `package.v2.js` (PUT) | ✅ Corrigido: `updatePackageCommand` + `saveToOutbox(PACKAGE_UPDATED)` | 🟢 Baixo | Mantido; monitorar filas `package-projection`, `package-validation`, `patient-projection` |
| `package.v2.js` (DELETE) | Deleta documentos sem evento | 🟠 Médio | Criar `PackageDeleteCommand` + `PACKAGE_DELETED` |
| `doctor.v2.js` (CRUD) | Síncrono sem eventos | 🟡 Baixo-Médio | Manter; priorizar integridade referencial no DELETE |
| `reminder.js` | CRUD síncrono + socket | 🟡 Baixo-Médio | Manter como exceção; `GET /api/reminders/:id` implementado |
| `baileysApi.js` | Chama endpoints inexistentes | 🟡 Médio | Refatorar para usar endpoints WhatsApp existentes |

---

# 15. Regras temporárias

Até nova revisão deste documento, valem as seguintes regras para qualquer alteração na Agenda Externa ou em seus contratos com o CRM:

1. **Não adicionar novos usos de `publishEvent`** em rotas da Agenda Externa ou do CRM relacionados a ela. O caminho canônico é `saveToOutbox` dentro de transactions.
2. **Não criar novos writes diretos em Read Models** (`PatientsView`, `PackagesView`, `MedicalEvent`). Read Models só devem ser atualizados por workers, exceto nos casos já documentados neste arquivo.
3. **Não ativar eventos no `eventToQueueMap` sem validar todos os consumers**. Um evento roteado para um worker que não está preparado é pior que um evento descartado.
4. **Não remover bypasses legados** (`appointmentStateOrchestrator`, `syncEvent`, `syncAffectedViews`) sem garantir que o pipeline canônico cobre o mesmo caso.
5. **Não adicionar novos endpoints V1** (`/api/patients`, `/api/appointments` sem `/v2`) para a Agenda Externa. Novas integrações devem usar V2.
6. **Não criar novos commands que escrevam diretamente em models** sem salvar evento no Outbox.
7. **Qualquer novo fluxo de agendamento** deve seguir o padrão: `Route → Command → Transaction → saveToOutbox → Commit → Dispatcher → Workers → Read Models`.
8. **Código morto identificado neste documento** (`rescheduleAppointmentDirect`, `syncDeleteWithPackage`, `baileysApi` funções não usadas) só deve ser removido após validação de que não há referências ocultas (testes, scripts, imports dinâmicos).

---

# 16. Lista de código morto identificado

| Código | Arquivo | Motivo |
|--------|---------|--------|
| `rescheduleAppointmentDirect` | `agenda/src/services/appointmentsRepo.js:226` | Não importado/usado em nenhum componente |
| `syncDeleteWithPackage` | `agenda/src/services/appointmentsRepo.js:340` | Não importado/usado em nenhum componente |
| `rescheduleAppointment` (cliente V2) | `agenda/src/api/v2/agendaV2Client.js:184` | Chamado apenas por `rescheduleAppointmentDirect` (morto) |
| `deletePackageSession` (cliente V2) | `agenda/src/api/v2/agendaV2Client.js:203` | Chamado apenas por `syncDeleteWithPackage` (morto) |
| `cancelPackageSession` (cliente V2) | `agenda/src/api/v2/agendaV2Client.js:208` | Chamado apenas por `syncDeleteWithPackage` (morto) |
| `getStatus` | `agenda/src/services/baileysApi.js:81` | Não importado/usado |
| `connect` | `agenda/src/services/baileysApi.js:94` | Não importado/usado; ainda por cima, chama `/api/baileys/disconnect` |
| `disconnect` | `agenda/src/services/baileysApi.js:107` | Não importado/usado; ainda por cima, chama `/api/baileys/connect` |

> **Nota:** remoção depende de auditoria de referências (Fase 4 do plano do usuário).

---

# 17. Próximos passos recomendados

1. **Revisar este documento** com stakeholders técnicos.
2. **Criar `EVENT_DEPENDENCY_MATRIX.md`** com base neste estado congelado.
3. **Priorizar correções de contratos quebrados:**
   - ✅ `PATCH /api/v2/appointments/:id/admin-edit` — corrigido na Fase 1.
   - ✅ `GET /api/reminders/:id` — corrigido na Fase 1.
   - ✅ `PUT /api/v2/packages/:id` — corrigido na Fase 1.
4. **Preparar consumidores** antes de ativar eventos novos.
5. **Só então** criar `ARCHITECTURE.md`, `CANONICAL_FLOW.md`, `ARCHITECTURE_DECISIONS.md` e `MIGRATION_PLAN.md`.

---

*Documento congelado em 2026-07-08. Qualquer mudança deve gerar nova versão.*
