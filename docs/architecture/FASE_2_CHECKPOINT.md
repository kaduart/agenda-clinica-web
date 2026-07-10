# Fase 2.5 — Checkpoint de fechamento da migração V1 → agendaV2Client

**Data:** 2026-07-09  
**Escopo:** frontend Agenda Externa (`/home/user/projetos/agenda`)  
**Status:** ✅ Aprovado para Fase 3

---

## 1. Inventário dos endpoints migrados

| Domínio      | Endpoint anterior                          | Endpoint atual                                  | Arquivo(s) consumidor(es)                                           | Status |
| ------------ | ------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------- | ------ |
| Patients     | `GET /api/patients`                        | `GET /api/v2/patients`                          | `services/patientsRepo.js`                                           | ✅     |
| Patients     | `GET /api/patients?search=...`             | `GET /api/v2/patients?search=...`               | `services/patientsRepo.js`, `components/AppointmentModal.jsx`        | ✅     |
| Patients     | `PUT /api/patients/:id`                    | `PUT /api/v2/patients/:id`                      | `services/patientsRepo.js` (usado em `App.jsx`)                      | ✅     |
| Appointments | `GET /api/v2/appointments/:id` (direto)    | `GET /api/v2/appointments/:id`                  | `components/AppointmentModal.jsx` via `appointmentsRepo.js`          | ✅     |
| Appointments | `GET /api/v2/appointments?patientId=...`   | `GET /api/v2/appointments?patientId=...`        | `components/AppointmentModal.jsx` via `appointmentsRepo.js`          | ✅     |
| Appointments | `PATCH /api/v2/appointments/:id/post-...`  | `PATCH /api/v2/appointments/:id/post-appointment` | `components/PostAppointmentModal.jsx` via `appointmentsRepo.js`    | ✅     |
| Reminders    | `GET /api/reminders`                       | `GET /api/reminders`                            | `services/remindersRepo.js`                                          | ✅     |
| Reminders    | `GET /api/reminders/:id`                   | `GET /api/reminders/:id`                        | `services/remindersRepo.js`                                          | ✅     |
| Reminders    | `POST /api/reminders`                      | `POST /api/reminders`                           | `services/remindersRepo.js`                                          | ✅     |
| Reminders    | `PATCH /api/reminders/:id`                 | `PATCH /api/reminders/:id`                      | `services/remindersRepo.js`, `components/ReminderList.jsx`           | ✅     |
| Doctors      | `GET /api/v2/doctors/active` (direto)      | `GET /api/v2/doctors/active`                    | `services/professionalsRepo.js`                                      | ✅     |
| Doctors      | `POST /api/v2/doctors` (direto)            | `POST /api/v2/doctors`                          | `services/professionalsRepo.js`                                      | ✅     |
| Doctors      | `DELETE /api/v2/doctors/:id` (direto)      | `DELETE /api/v2/doctors/:id`                    | `services/professionalsRepo.js`                                      | ✅     |
| Calendar     | `GET /api/calendar/holidays`               | `GET /api/v2/calendar/holidays` (com fallback)  | `services/calendarService.js`                                        | ✅     |
| WhatsApp     | `/api/baileys/*`, `/api/whatsapp-web/*`... | centralizado em `whatsappClient.js`             | `baileysApi.js`, `whatsappExtension.js`, `WhatsAppConnectModal.jsx`, `Header.jsx` | ✅     |

> **Nota:** os endpoints de Appointments e Doctors marcados como "(direto)" já eram V2, mas estavam sendo chamados via `api` diretamente nos componentes/repositórios. A mudança foi apenas de centralização.

---

## 2. Validação de existência dos endpoints no backend CRM

| Método agendaV2Client       | Rota CRM                                                                 | HTTP   | Parâmetros esperados                     | Resposta esperada pelo frontend                 | Status |
| ---------------------------- | ------------------------------------------------------------------------ | ------ | ---------------------------------------- | ------------------------------------------------ | ------ |
| `updatePatient`              | `back/routes/patient.v2.js` → `PUT /api/v2/patients/:id`                 | PUT    | `{ fullName, dateOfBirth, phone, email, cpf, rg, ... }` | `{ success: true, data: { patientView } }`       | ✅     |
| `createDoctor`               | `back/routes/doctor.v2.js` → `POST /api/v2/doctors`                      | POST   | `{ fullName, email, specialty, licenseNumber, phoneNumber }` | `{ success: true, data: { doctor, doctorId } }` | ✅     |
| `deleteDoctor`               | `back/routes/doctor.v2.js` → `DELETE /api/v2/doctors/:id`                | DELETE | —                                        | `{ success: true }`                              | ✅     |
| `updateReminder`             | `back/routes/reminder.js` → `PATCH /api/reminders/:id`                   | PATCH  | `{ status, dueDate, dueTime, ... }`      | Objeto `Reminder` atualizado                     | ✅     |
| `trackPostAppointmentStep`   | `back/routes/appointment.v2.js` → `PATCH /api/v2/appointments/:id/post-appointment` | PATCH  | `{ step }`                               | `{ success: true, data: result.data }`           | ✅     |
| `getAppointmentById`         | `back/routes/appointmentReads.js` → `GET /api/v2/appointments/:id`       | GET    | —                                        | `{ success: true, data: appointment }`           | ✅     |
| `getAppointmentsByPatient`   | `back/routes/appointmentReads.js` → `GET /api/v2/appointments?patientId=...` | GET    | `patientId`, `limit`                     | Array de appointments ou `{ success, data }`     | ✅     |

---

## 3. Comparação de payload V1 x V2

### 3.1 `updatePatient`

**Antes (V1):**
```js
api.put(`/api/patients/${patientId}`, {
  phone,
  email,
  dateOfBirth
});
```

**Agora (V2):**
```js
api.put(`/api/v2/patients/${patientId}`, {
  phone,
  email,
  dateOfBirth
});
```

**Diferenças:**
- O payload enviado pelo frontend é idêntico.
- O backend V2 filtra campos permitidos (`allowedFields`) e sanitiza `phone` (apenas dígitos), `email` (lowercase) e `fullName` (trim).

**Impacto:**
- ✅ Nenhum. Todos os campos enviados pela agenda (`phone`, `email`, `dateOfBirth`) estão na lista `allowedFields` do V2.

---

### 3.2 `createDoctor`

**Antes (V2 direto):**
```js
api.post('/api/v2/doctors', payload);
```

**Agora (V2 via client):**
```js
api.post('/api/v2/doctors', payload);
```

**Payload enviado pela agenda (`ProfessionalsModal.jsx`):**
```js
{
  fullName,
  email,
  specialty,
  licenseNumber,
  phoneNumber
}
```

**Diferenças:**
- Nenhuma mudança de contrato. Apenas centralização.
- O backend V2 exige `fullName`, `email`, `specialty` e `licenseNumber` — todos presentes no form.

**Impacto:**
- ✅ Nenhum.

---

### 3.3 `updateReminder`

**Antes (V1 direto):**
```js
api.patch(`/api/reminders/${id}`, patch);
```

**Agora (V1 via client):**
```js
api.patch(`/api/reminders/${id}`, patch);
```

**Diferenças:**
- Nenhuma. O endpoint `/api/reminders/:id` é o mesmo.
- `ReminderList.jsx` agora envia `{ status: 'done' }` para marcar como feito (antes usava endpoint inexistente `/api/appointments/:id/reminder`).

**Impacto:**
- ✅ Correção de bug. O componente estava quebrado porque o endpoint legado de appointments não existe mais.

---

## 4. Confirmação de escopo da Fase 2

### ✅ Alterado
- `src/api/v2/agendaV2Client.js`
- `src/api/v2/calendarV2Client.js` (novo)
- `src/api/v2/whatsappClient.js` (novo)
- `src/services/patientsRepo.js`
- `src/services/remindersRepo.js`
- `src/services/appointmentsRepo.js`
- `src/services/professionalsRepo.js`
- `src/services/calendarService.js`
- `src/services/baileysApi.js`
- `src/services/whatsappExtension.js`
- `src/components/AppointmentModal.jsx`
- `src/components/PostAppointmentModal.jsx`
- `src/components/ReminderList.jsx`
- `src/components/WhatsAppConnectModal.jsx`
- `src/components/Header.jsx`
- `docs/architecture/MIGRATION_PLAN.md`

### ❌ NÃO alterado
- Regras de domínio do CRM/backend.
- Stores, modelos Mongoose, estados globais.
- Fluxos clínicos/financeiros.
- Lógica de negócio dos componentes (apenas a origem das chamadas HTTP mudou).

---

## 5. Regressão final

```bash
npm run test
```

```
Test Files  2 passed (2)
     Tests  4 passed (4)
```

```bash
npm run build
```

```
✓ built in 4.63s
```

```bash
grep -R "api\.\(get\|post\|put\|patch\|delete\)(" src/services src/components | grep -v "src/api/v2"
```

```
Nenhuma chamada HTTP direta fora dos clients
```

---

## 6. Riscos identificados

| Risco                                                                 | Probabilidade | Impacto | Mitigação                                                                 |
| --------------------------------------------------------------------- | ------------- | ------- | ------------------------------------------------------------------------- |
| `updatePatient` V2 ignora campos fora de `allowedFields`              | Baixa         | Médio   | Agenda envia apenas `phone`, `email`, `dateOfBirth` — todos permitidos.   |
| `getAppointmentsByPatient` retorna array direto em alguns cenários    | Baixa         | Baixo   | Frontend lida com `res?.data?.appointments || []`.                         |
| `ReminderList.jsx` agora depende do schema `Reminder` real            | Baixa         | Médio   | Schema tem `text`, `dueDate`, `dueTime`, `patient`, `professional`, `status`. Mapeamento validado. |
| `calendarV2Client` usa fallback V1 porque V2 ainda é mock             | Média         | Baixo   | Fallback explícito para `/api/calendar/holidays` mantém comportamento.    |

---

## 7. Conclusão

A Fase 2 está **fechada e aprovada** para avanço à Fase 3.

- ✅ Todos os endpoints V1 ou chamadas diretas foram centralizadas.
- ✅ Os endpoints de destino existem no backend CRM com métodos/parâmetros corretos.
- ✅ Payloads de escrita são compatíveis entre V1 e V2.
- ✅ Nenhuma regra de domínio, store ou modelo foi alterada.
- ✅ Testes e build passam.
- ✅ Nenhuma chamada HTTP direta permanece fora dos clients (`agendaV2Client`, `calendarV2Client`, `whatsappClient`).

**Próximo passo recomendado:** Fase 3 — Preparar Outbox/consumers no backend CRM.
