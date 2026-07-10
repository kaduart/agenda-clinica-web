# ARCHITECTURE.md — Agenda Externa

**Version:** 1.0  
**Date:** 2026-07-08  
**Status:** Canonical Target Architecture  

---

## Objetivo

A **Agenda Externa** é um cliente operacional do CRM. Ela fornece a interface onde secretaria, profissionais e sistemas externos visualizam e operam agendamentos, pacientes, pacotes e pré-agendamentos.

Ela **não possui autoridade** para criar, alterar ou remover entidades de domínio diretamente. Todo comando de escrita deve passar por um **Command** do CRM, dentro de uma transação MongoDB, e o evento resultante deve ser persistido no **Transactional Outbox**.

> Este documento define a **arquitetura alvo**. O estado real está congelado em [`CURRENT_STATE_AUDIT.md`](./CURRENT_STATE_AUDIT.md) e as dependências de eventos estão detalhadas em [`EVENT_DEPENDENCY_MATRIX.md`](./EVENT_DEPENDENCY_MATRIX.md).

---

## Escopo

- **Frontend:** `/home/user/projetos/agenda`
- **Backend proprietário das entidades:** `/home/user/projetos/crm/back`
- **Entidades sob responsabilidade do CRM:**
  - `Appointment`
  - `Session`
  - `Payment`
  - `Patient`
  - `Package` / `PackageCredit`
  - `InsuranceGuide`, `InsuranceBatch`, `InsuranceAuthorization`
  - `PreAppointment`
  - `Reminder` / `Notification`

A Agenda Externa pode possuir **Read Models** locais (cache de UI), mas a fonte de verdade das projeções é o CRM.

---

# 1. Princípio fundamental

Toda alteração de domínio deve seguir o pipeline:

```
Frontend Agenda
        ↓
   API Contract
        ↓
      Command
        ↓
  Mongo Transaction
        ↓
   Domain Change
        ↓
   saveToOutbox()
        ↓
 Outbox Dispatcher
        ↓
     Workers
        ↓
Read Models / Integrações / Notificações
```

**Regras:**

1. O frontend nunca escreve diretamente no banco de dados do CRM.
2. O frontend nunca publica eventos.
3. O frontend nunca atualiza Read Models do CRM.
4. Toda operação de escrita passa por um endpoint V2 e por um Command.
5. Toda mutação de domínio duradoura gera um evento no Outbox.
6. Consumers processam eventos de forma assíncrona e idempotente.

---

# 2. Responsabilidades

## 2.1 Agenda Externa

**Responsável por:**

- Interface operacional (calendário, listas, formulários);
- Coleta de dados do usuário;
- Chamadas autenticadas às APIs V2 do CRM;
- Validações de UX (campos obrigatórios, máscaras, feedback imediato);
- Renderização de Read Models (projeções) consumidas do CRM;
- Emissão de comandos de domínio (via endpoints) — **nunca de mutações diretas**.

**Não responsável por:**

- Criar `Appointment` diretamente;
- Criar `Session` diretamente;
- Criar, atualizar ou excluir `Payment` diretamente;
- Atualizar `PatientsView`, `PackagesView` ou qualquer projeção;
- Publicar eventos (`publishEvent`, `appendEvent`, sockets como substituto de evento);
- Decidir regras de negócio financeiras (faturamento, convênio, saldo de pacote);
- Manter lógica de convênio, guias ou autorizações.

## 2.2 CRM (sistema dono do domínio)

**Responsável por:**

- Manter a consistência das entidades de domínio;
- Executar Commands dentro de transações MongoDB;
- Emitir eventos via `saveToOutbox()`;
- Disparar Workers a partir do Outbox;
- Atualizar Read Models e integrações;
- Aplicar regras de negócio, validações de domínio e políticas financeiras.

---

# 3. Transactional Outbox

## 3.1 Regra absoluta

**Nenhum evento de domínio deve ser publicado diretamente.**

### Proibido

```js
// ❌ Publicação fora de transação
publishEvent(EventTypes.APPOINTMENT_CREATED, payload);

// ❌ Append direto em event store sem transação
appendEvent(EventTypes.APPOINTMENT_CREATED, payload);

// ❌ Socket como substituto de evento de domínio
io.emit('appointmentCreated', payload);
```

### Permitido

```js
// ✅ Dentro da transação do Command
await saveToOutbox({
  eventType: EventTypes.APPOINTMENT_CREATED,
  payload: { appointmentId, patientId, ... },
  correlationId,
  userId,
}, mongoSession);
```

## 3.2 Garantias exigidas

- O evento é salvo na mesma transação MongoDB da mutação de domínio.
- Se a transação falhar, o evento não é persistido.
- Se o evento for persistido, a mutação de domínio também foi confirmada.
- O Dispatcher lê o Outbox e publica nas filas BullMQ.
- Workers consomem as filas e atualizam Read Models/integrações.

## 3.3 Exceções documentadas

Ver seção [8. Exceções temporárias](#8-exceções-temporárias).

---

# 4. Commands

Toda operação de escrita da Agenda Externa deve possuir um **Command** correspondente no CRM.

## 4.1 Commands existentes e canônicos

| Operação da Agenda | Endpoint V2 | Command existente | Status |
|--------------------|-------------|-------------------|--------|
| Criar agendamento | `POST /api/v2/appointments` | `createAppointmentCommand` | ✅ Canônico |
| Editar agendamento | `PUT /api/v2/appointments/:id` | `updateAppointmentCommand` | ✅ Canônico (com bypass legado) |
| Cancelar agendamento | `PATCH /api/v2/appointments/:id/cancel` | `cancelAppointmentCommand` | ✅ Canônico |
| Completar agendamento | `POST /api/v2/appointments/:id/complete` | `completeInsuranceAppointmentCommand` / `completeOrchestrator` | ⚠️ Parcial |
| Hard delete de agendamento | `DELETE /api/v2/appointments/:id` | `deleteAppointmentCommand` | ⚠️ Sem Outbox |
| Criar pacote | `POST /api/v2/packages` | — (controller direto) | ⚠️ Parcial (usa Outbox, mas não é Command) |
| Editar pacote | `PUT /api/v2/packages/:id` | `updatePackageCommand` | ✅ Canônico |
| Inativar/cancelar pacote | `POST /api/v2/packages/:id/inactivate` | — | ❌ Criar `cancelPackageCommand` |
| Deletar pacote | `DELETE /api/v2/packages/:id` | — | ❌ Criar `deletePackageCommand` |
| Criar paciente | `POST /api/v2/patients` | — (controller/service) | ⚠️ Parcial |
| Editar paciente | `PUT /api/v2/patients/:id` | — | ❌ Criar Command |
| Deletar paciente | `DELETE /api/v2/patients/:id` | — | ❌ Criar Command |
| Criar pré-agendamento | `POST /api/v2/pre-appointments` | `expirePreAgendamentoCommand` (apenas expiração) | ⚠️ Legado |
| Confirmar pré-agendamento | `POST /api/v2/pre-appointments/:id/confirm` | — | ⚠️ Legado |
| Editar administrativa | `PATCH /api/v2/appointments/:id/admin-edit` | — | ❌ Endpoint inexistente |
| Adiar lembrete | `GET /api/reminders/:id` | — | ❌ Endpoint inexistente |

## 4.2 Padrão de um Command

```js
export async function execute(input, user, mongoSession = null) {
  return await runTransactionWithRetry(async (session) => {
    // 1. Carregar agregado
    // 2. Validar regras de domínio
    // 3. Aplicar mutação
    // 4. Salvar agregado
    // 5. Salvar evento no Outbox
    await saveToOutbox({ eventType, payload, correlationId, userId }, session);
    // 6. Retornar resultado enxuto
  }, mongoSession);
}
```

**Regras:**

- Commands não retornam projeções completas.
- Commands não chamam workers diretamente.
- Commands não atualizam views.
- Commands podem lançar erros de domínio; a Agenda deve tratá-los.

---

# 5. Read Models

Read Models possuem **dono único**: um Worker que consome eventos de domínio e atualiza a projeção.

| Read Model | Dono (Worker) | Eventos que consome |
|------------|---------------|---------------------|
| `PatientsView` | `patientProjectionWorker` | `PATIENT_CREATED`, `PATIENT_REGISTERED`, `PATIENT_UPDATED`, `PATIENT_DELETED`, `APPOINTMENT_CREATED`, `APPOINTMENT_UPDATED`, `APPOINTMENT_CANCELLED`, `SESSION_COMPLETED`, `SESSION_CANCELLED`, `PAYMENT_*`, `PACKAGE_*` |
| `PackagesView` | `packageProjectionWorker` | `PACKAGE_CREATED`, `PACKAGE_UPDATED`, `PACKAGE_CANCELLED`, `PACKAGE_DELETED`, `APPOINTMENT_CREATED`, `APPOINTMENT_UPDATED`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_DELETED`, `SESSION_COMPLETED`, `SESSION_CANCELLED` |
| `MedicalEvent` / prontuário | `syncMedicalWorker` | `APPOINTMENT_CANCELLED`, `APPOINTMENT_DELETED`, `SESSION_*` |
| Views financeiras | workers financeiros | `PAYMENT_*`, `PACKAGE_CREDIT_*`, `APPOINTMENT_*` |

**Regras:**

- Nenhum endpoint pode escrever diretamente em Read Models.
- A Agenda Externa consome Read Models apenas por leitura.
- Se um Read Model estiver desatualizado, o problema está no Worker, nunca no frontend.

---

# 6. Eventos como contratos

Eventos não são notificações. São **contratos arquiteturais** entre producers e consumers.

## 6.1 Eventos canônicos da Agenda Externa

| Evento | Producer alvo | Consumers alvo | Prioridade |
|--------|---------------|----------------|------------|
| `APPOINTMENT_CREATED` | `createAppointmentCommand`, `insuranceBilling` | `patient-projection`, `package-projection`, `clinical-orchestrator`, `notification` (a preparar) | Alta |
| `APPOINTMENT_UPDATED` | `updateAppointmentCommand` | `patient-projection`, `package-projection`, `appointment-integration`, `notification` (a preparar) | Alta |
| `APPOINTMENT_CANCELLED` | `cancelAppointmentCommand` | `patient-projection`, `package-projection`, `sync-medical`, `clinical-orchestrator` | Alta |
| `APPOINTMENT_DELETED` | `deleteAppointmentCommand` | `patient-projection`, `package-projection`, `sync-medical`, `clinical-orchestrator` | Alta |
| `APPOINTMENT_RESCHEDULED` | Novo command de reagendamento | `patient-projection`, `notification` | Média |
| `PATIENT_REGISTERED` | `createPatientCommand` | `patient-projection` | Alta |
| `PATIENT_UPDATED` | `updatePatientCommand` | `patient-projection` | Alta |
| `PATIENT_DELETED` | `deletePatientCommand` | `patient-projection` | Média |
| `PACKAGE_CREATED` | `createPackageCommand` | `package-projection`, `package-validation`, `patient-projection` | Alta |
| `PACKAGE_UPDATED` | `updatePackageCommand` | `package-projection`, `package-validation`, `patient-projection` | Alta |
| `PACKAGE_CANCELLED` | `cancelPackageCommand` | `package-projection`, `package-validation`, `patient-projection` | Alta |
| `PACKAGE_DELETED` | `deletePackageCommand` | `package-projection`, `patient-projection` | Média |
| `PREAGENDAMENTO_CREATED` | `createPreAgendamentoCommand` | `preagendamento-processing` (novo worker) | Baixa |
| `PREAGENDAMENTO_IMPORTED` | `confirmPreAgendamentoCommand` | `preagendamento-processing` (novo worker) | Baixa |

## 6.2 Regras de evolução de eventos

- **Não remover campos** de um evento sem coordenação entre producer e todos os consumers.
- **Adicionar campos opcionais** é permitido, mas deve ser documentado.
- **Renomear evento** exige depreciação gradual.
- **Alterar semântica** (ex.: `APPOINTMENT_CREATED` passar a significar "agendamento persistido" vs "agendamento confirmado") exige novo evento.

---

# 7. Estados de domínio

Estados são contratos. Não criar estados paralelos, sinônimos ou "flags de tela".

## 7.1 Estados oficiais de `Appointment.operationalStatus`

```
pre_agendado
scheduled
confirmed
pending
canceled
suspended
paid
missed
completed
processing_create
processing_complete
processing_cancel
force_cancelled
```

## 7.2 Estados oficiais de `Appointment.clinicalStatus`

```
pending
in_progress
completed
missed
scheduled
canceled
```

## 7.3 Estados proibidos

Não criar estados fora dos enums oficiais, nem sinônimos como:

- ❌ `confirmado` (usar `confirmed`)
- ❌ `finalizado_ok` (usar `completed`)
- ❌ `cancelado` (usar `canceled`)
- ❌ `nao_veio` (usar `missed`)
- ❌ Qualquer status prefixado com `temp_`, `old_`, `legacy_`

## 7.4 Regra de transição

Toda mudança de status deve ser feita por um Command que:

1. Valida a transição de estado permitida;
2. Persiste o novo estado;
3. Salva o evento correspondente no Outbox.

---

# 8. API Contract

A Agenda Externa deve consumir **apenas endpoints V2** do CRM.

## 8.1 Recursos permitidos

| Recurso | Operações permitidas | Endpoint canônico |
|---------|----------------------|-------------------|
| Appointment | CRIAR, EDITAR, CANCELAR, COMPLETAR, DELETAR, REAGENDAR | `/api/v2/appointments` e sub-rotas |
| Patient | CRIAR, EDITAR, DELETAR, LISTAR | `/api/v2/patients` |
| Package | CRIAR, EDITAR, CANCELAR, DELETAR | `/api/v2/packages` |
| PreAppointment | CRIAR, CONFIRMAR, CANCELAR | `/api/v2/pre-appointments` |
| Reminder | LISTAR, ADIAR, DESCARTAR | `/api/v2/reminders` |
| Doctor / Availability | LISTAR | `/api/v2/doctors`, `/api/v2/availability` |

## 8.2 Endpoints V1 proibidos para a Agenda Externa

- `PUT /api/patients/:id` — não emite eventos, não atualiza `PatientsView`.
- `GET /api/reminders/:id` — inexistente.
- Qualquer outro endpoint V1 que bypass Commands ou Outbox.

## 8.3 Resposta de escrita

Endpoints de escrita devem retornar:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "correlationId": "..."
  }
}
```

Não devem retornar Read Models completos. A Agenda consulta as projeções separadamente.

---

# 9. Exceções temporárias

As exceções abaixo estão documentadas no [`CURRENT_STATE_AUDIT.md`](./CURRENT_STATE_AUDIT.md) e mapeadas no [`EVENT_DEPENDENCY_MATRIX.md`](./EVENT_DEPENDENCY_MATRIX.md). Elas existem por necessidade operacional e **devem ser eliminadas** antes da arquitetura estar totalmente consolidada.

## 9.1 `insuranceBilling.js`

**Problema:** cria `Appointment`, `Session` e `Payment` de convênio dentro de uma transação, mas **não salva evento no Outbox**.

**Bloqueio:** consumers `clinicalOrchestrator` e `notification` não estão preparados para receber `APPOINTMENT_CREATED` de convênio.

**Caminho:** preparar consumers → adicionar `saveToOutbox(APPOINTMENT_CREATED)` → validar em staging.

## 9.2 `appointmentStateOrchestrator` + `syncAffectedViews`

**Problema:** bypass síncrono que atualiza `PackagesView` após `updateAppointmentCommand`.

**Bloqueio:** `eventToQueueMap[APPOINTMENT_UPDATED]` não inclui `'package-projection'`.

**Caminho:** adicionar `'package-projection'` ao mapa → remover chamadas ao `appointmentStateOrchestrator` → monitorar projeções.

## 9.3 `preAgendamentoWorker`

**Problema:** worker legado com payload desalinhado e bug interno.

**Bloqueio:** ativar `PREAGENDAMENTO_CREATED` ou `PREAGENDAMENTO_IMPORTED` causaria duplicação e erros.

**Caminho:** decidir entre reescrever o worker ou remover o `publishEvent` e manter o fluxo síncrono até nova implementação.

## 9.4 Patient V1 (`PUT /api/patients/:id`)

**Problema:** a Agenda Externa ainda usa V1, que não emite eventos e não atualiza `PatientsView`.

**Bloqueio:** migração para `PUT /api/v2/patients/:id` requer refatorar o update de paciente para Command + Outbox.

**Caminho:** criar `updatePatientCommand` → migrar Agenda Externa para V2 → desativar V1.

## 9.5 `deleteAppointmentCommand.js`

**Problema:** hard delete sem evento `APPOINTMENT_DELETED`.

**Bloqueio:** evento não existe; consumers não foram atualizados.

**Caminho:** criar `APPOINTMENT_DELETED` → atualizar `patientProjectionWorker`, `syncMedicalWorker`, `packageProjectionWorker` → adicionar Outbox ao command.

## 9.6 `package.v2.js` (DELETE)

**Problema:** `DELETE /api/v2/packages/:id` não emite evento.

**Caminho:** criar `deletePackageCommand` + `PACKAGE_DELETED`.

> **Nota:** `PUT /api/v2/packages/:id` foi corrigido na Fase 1 com `updatePackageCommand` + `PACKAGE_UPDATED`. |

---

# 10. Anti-patterns proibidos

| Anti-pattern | Por que é proibido | Exemplo no estado atual |
|--------------|--------------------|-------------------------|
| Rota chama serviço de domínio diretamente | Perde transação, auditabilidade e evento | `packageController.v2.js` cria pacote sem Command |
| Rota publica evento com `publishEvent` | Não é atômico com a mutação; pode perder evento | `preAgendamento.engine.js` |
| Socket emite evento de domínio | Não persistente; não alimenta projeções | `deleteAppointmentCommand.js` emite `appointmentDeleted` |
| Frontend atualiza Read Model | Quebra consistência e dono único | Não deve ocorrer |
| Bypass síncrono para projeção | Viola Outbox → Worker | `appointmentStateOrchestrator` |
| Estado paralelo / sinônimo | Dificulta queries e relatórios | Qualquer status fora do enum |
| Endpoint inexistente usado em produção | Quebra funcionalidade | `GET /api/reminders/:id` |

---

# 11. Decisões arquiteturais (ADR)

## ADR-001: Agenda Externa é cliente, não dona do domínio

**Contexto:** A Agenda Externa foi criada como frontend operacional, mas historicamente passou a conter lógica de negócio e chamadas diretas.

**Decisão:** A Agenda Externa não possui entidades de domínio. Ela consome APIs V2 do CRM e obedece aos Commands.

**Consequências:**
- Toda lógica de domínio fica centralizada no CRM.
- A Agenda pode ser substituída por outro cliente sem alterar regras de negócio.

## ADR-002: Transactional Outbox é obrigatório para eventos de domínio

**Contexto:** Publicações diretas (`publishEvent`, sockets) causam inconsistências entre entidades e projeções.

**Decisão:** Todo evento de domínio deve ser salvo no Outbox dentro da transação da mutação.

**Consequências:**
- Consistência eventual garantida.
- Workers podem ser reiniciados sem perda de eventos.

## ADR-003: Read Models têm dono único

**Contexto:** Várias rotas e scripts atualizavam `PatientsView` e `PackagesView` diretamente.

**Decisão:** Apenas Workers de projeção específicos podem escrever em seus respectivos Read Models.

**Consequências:**
- Facilita debug e manutenção.
- Permite recriar projeções a partir do event log.

## ADR-004: Não expandir legado

**Contexto:** `preAgendamentoWorker` e rotas de importação legadas estão quebradas.

**Decisão:** Não adicionar novas features sobre componentes legados. Refatorar ou congelar.

**Consequências:**
- Evita acúmulo de débito técnico.
- Força criação de Commands canônicos para novos fluxos.

---

# 12. Checklist para novos desenvolvimentos

Antes de criar ou alterar uma feature na Agenda Externa, responder:

### Arquitetura

- [ ] Existe um endpoint V2 no CRM?
- [ ] Existe um Command correspondente?
- [ ] O Command executa dentro de `runTransactionWithRetry`?
- [ ] O Command salva evento no Outbox via `saveToOutbox()`?
- [ ] O evento está em `EventTypes`?
- [ ] O evento está mapeado em `eventToQueueMap`?

### Consumers

- [ ] Existe worker para cada fila mapeada?
- [ ] O worker sabe processar o payload do evento?
- [ ] O worker tem idempotência de estado (ex.: verifica se já processou antes de alterar)?
- [ ] O worker atualiza apenas o Read Model de sua responsabilidade?

### Frontend

- [ ] A Agenda chama apenas endpoints V2?
- [ ] A Agenda não atualiza Read Models diretamente?
- [ ] A Agenda trata erros de domínio retornados pelo Command?
- [ ] Existe teste de integração cobrindo fluxo completo?

### Documentação

- [ ] O fluxo foi adicionado/atualizado no `CURRENT_STATE_AUDIT.md`?
- [ ] Os eventos foram adicionados/atualizados no `EVENT_DEPENDENCY_MATRIX.md`?
- [ ] As exceções foram registradas na seção 8 deste documento?

---

# 13. Relação com os documentos de auditoria

```
CURRENT_STATE_AUDIT.md
        ↓
   (o que existe hoje)

EVENT_DEPENDENCY_MATRIX.md
        ↓
   (o que existe, o que falta e o risco)

ARCHITECTURE.md
        ↓
   (o modelo alvo)
```

- [`CURRENT_STATE_AUDIT.md`](./CURRENT_STATE_AUDIT.md): fotografia congelada do estado real. Usado para não perder o contexto durante a migração.
- [`EVENT_DEPENDENCY_MATRIX.md`](./EVENT_DEPENDENCY_MATRIX.md): dependências entre eventos, consumers e riscos. Usado para priorizar correções.
- `ARCHITECTURE.md` (este documento): define o modelo canônico. Usado para decidir como devem ser implementadas as correções.

O próximo documento derivado será:

- `MIGRATION_PLAN.md`: plano comparando estado atual vs arquitetura alvo, com fases, prioridades e critérios de aceitação.

---

# 14. Glossário

| Termo | Definição |
|-------|-----------|
| **Command** | Função que encapsula uma operação de escrita no domínio, executada dentro de uma transação. |
| **Outbox** | Tabela/coleção que armazena eventos de domínio de forma atômica com a mutação. |
| **Dispatcher** | Processo que lê o Outbox e publica eventos nas filas BullMQ. |
| **Worker** | Processo assíncrono que consome uma fila e executa side-effects (projeções, integrações, notificações). |
| **Read Model** | Projeção otimizada para leitura, derivada de eventos de domínio. |
| **Evento de domínio** | Registro imutável de que algo aconteceu no domínio. Contrato entre producers e consumers. |
| **Agenda Externa** | Frontend operacional que consome APIs do CRM. Não detém entidades de domínio. |

---

*Arquitetura canônica da Agenda Externa. Documento vivo — atualizar sempre que uma exceção for eliminada ou uma nova decisão arquitetural for tomada.*
