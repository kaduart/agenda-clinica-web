# Especificação Técnica: Reschedule de Agendamentos (V2)

> **Status:** Pronto para implementação no backend
> **Frontend:** Já preparado (builder DTO + separação semântica)

---

## 🎯 Objetivo

Separar semanticamente **UPDATE** de **RESCHEDULE**, garantindo:
- Histórico completo de remarcações
- Consistência da trinca Appointment → Session → Payment
- Event-driven correto
- Auditoria rastreável

---

## 🧩 Modelo de Domínio

### Appointment (novos campos)

```js
{
  // ... campos existentes

  // 🔗 Encadeamento de histórico
  originalAppointmentId: { type: ObjectId, ref: 'Appointment', default: null },
  rescheduleReason: { type: String, default: '' },
  rescheduledAt: { type: Date, default: null },
  
  // 🚫 Cancelamento
  canceledAt: { type: Date, default: null },
  cancelReason: { type: String, default: '' }
}
```

### Índices recomendados

```js
AppointmentSchema.index({ originalAppointmentId: 1 });
AppointmentSchema.index({ operationalStatus: 1, date: 1, time: 1 });
```

---

## 🔗 Endpoints

### 1. UPDATE (edição simples)

```http
PUT /api/v2/appointments/:id
```

**Regra:** NÃO pode alterar `date` ou `time`.

```js
router.put('/:id', async (req, res) => {
  const existing = await Appointment.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  if (existing.operationalStatus === 'canceled') {
    return res.status(400).json({ error: 'Agendamento cancelado não pode ser editado' });
  }

  // 🔒 Bloqueia reschedule escondido
  if (req.body.date && req.body.date !== existing.date) {
    return res.status(400).json({
      error: 'Use POST /appointments/:id/reschedule para mudar data'
    });
  }
  if (req.body.time && req.body.time !== existing.time) {
    return res.status(400).json({
      error: 'Use POST /appointments/:id/reschedule para mudar horário'
    });
  }

  const updated = await Appointment.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('patient doctor');

  // 🔔 Evento
  emitEvent('appointmentUpdated', { _id: updated._id, data: updated });

  res.json({ success: true, data: { appointment: updated } });
});
```

---

### 2. RESCHEDULE (remarcação explícita)

```http
POST /api/v2/appointments/:id/reschedule
```

**Body:**
```json
{
  "date": "2026-04-21",
  "time": "10:00",
  "rescheduleReason": "Paciente solicitou mudança",
  "patientId": "...",
  "professionalName": "...",
  "specialty": "...",
  "duration": 40,
  "crm": { ... }
}
```

**Implementação:**

```js
router.post('/:id/reschedule', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existing = await Appointment.findById(req.params.id).session(session);
    if (!existing) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    if (existing.operationalStatus === 'canceled') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Agendamento já cancelado' });
    }

    // ───────────────────────────────────────────
    // 1. CANCELA O ANTIGO
    // ───────────────────────────────────────────
    existing.operationalStatus = 'canceled';
    existing.canceledAt = new Date();
    existing.cancelReason = req.body.rescheduleReason || 'Remarcado';
    existing.status = 'Cancelado';
    await existing.save({ session });

    // ───────────────────────────────────────────
    // 2. ATUALIZA SESSION (se existir)
    // ───────────────────────────────────────────
    if (existing.sessionId || existing.session?._id) {
      await Session.findByIdAndUpdate(
        existing.sessionId || existing.session._id,
        {
          status: 'canceled',
          canceledAt: new Date(),
          cancelReason: 'Remarcado para novo agendamento'
        },
        { session }
      );
    }

    // ───────────────────────────────────────────
    // 3. CRIA NOVO APPOINTMENT
    // ───────────────────────────────────────────
    const newAppointmentData = {
      ...req.body,
      _id: undefined,
      originalAppointmentId: existing._id,
      rescheduleReason: req.body.rescheduleReason || '',
      rescheduledAt: new Date(),
      operationalStatus: 'scheduled',
      status: 'Agendado',
      createdAt: new Date()
    };

    const newAppointment = new Appointment(newAppointmentData);
    await newAppointment.save({ session });

    // ───────────────────────────────────────────
    // 4. CRIA NOVA SESSION (vinculada ao novo)
    // ───────────────────────────────────────────
    const newSession = new Session({
      appointmentId: newAppointment._id,
      patient: newAppointment.patientId,
      doctor: newAppointment.doctorId,
      date: newAppointment.date,
      time: newAppointment.time,
      sessionType: newAppointment.specialty,
      sessionValue: newAppointment.sessionValue || 0,
      status: 'scheduled',
      paymentStatus: newAppointment.paymentStatus || 'pending'
    });
    await newSession.save({ session });

    // Vincula session ao appointment
    newAppointment.sessionId = newSession._id;
    await newAppointment.save({ session });

    // ───────────────────────────────────────────
    // 5. PAYMENT — política de cópia
    // ───────────────────────────────────────────
    const originalPayment = await Payment.findOne({
      appointmentId: existing._id
    }).session(session);

    if (originalPayment) {
      // Opção A: Copiar payment para novo (se não estiver pago)
      if (originalPayment.status !== 'paid') {
        const newPayment = new Payment({
          ...originalPayment.toObject(),
          _id: undefined,
          appointmentId: newAppointment._id,
          sessionId: newSession._id,
          status: 'pending',
          createdAt: new Date()
        });
        await newPayment.save({ session });
      }
      // Opção B: Se já estava pago, manter no original e criar novo pending
      // (descomente se preferir)
    }

    // ───────────────────────────────────────────
    // 6. COMMIT + EVENTOS
    // ───────────────────────────────────────────
    await session.commitTransaction();

    emitEvent('appointmentRescheduled', {
      from: existing._id,
      to: newAppointment._id,
      reason: req.body.rescheduleReason
    });

    emitEvent('appointmentCancelled', {
      _id: existing._id,
      reason: 'Remarcado'
    });

    emitEvent('appointmentCreated', {
      _id: newAppointment._id,
      data: newAppointment
    });

    return res.json({
      success: true,
      data: {
        appointment: newAppointment,
        session: newSession
      },
      meta: {
        rescheduledFrom: existing._id,
        reason: req.body.rescheduleReason
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('[reschedule] ERROR:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao remarcar agendamento',
      details: error.message
    });
  } finally {
    session.endSession();
  }
});
```

---

## 🔄 Query de histórico

```js
// Buscar toda cadeia de remarcações
const getRescheduleChain = async (appointmentId) => {
  const chain = [];
  let current = await Appointment.findById(appointmentId);
  
  while (current) {
    chain.unshift(current);
    if (!current.originalAppointmentId) break;
    current = await Appointment.findById(current.originalAppointmentId);
  }
  
  return chain;
};
```

---

## 🧪 Testes sugeridos

```js
describe('POST /appointments/:id/reschedule', () => {
  it('deve cancelar original e criar novo', async () => {
    // ...
  });

  it('deve bloquear reschedule de agendamento já cancelado', async () => {
    // ...
  });

  it('deve manter payment pendente no novo agendamento', async () => {
    // ...
  });

  it('deve propagar eventos socket corretos', async () => {
    // ...
  });
});
```

---

## 📋 Checklist de implementação

- [ ] Adicionar campos `originalAppointmentId`, `rescheduleReason`, `rescheduledAt`, `canceledAt`, `cancelReason` no Schema
- [ ] Criar índice `originalAppointmentId`
- [ ] Implementar `PUT /appointments/:id` com bloqueio de date/time
- [ ] Implementar `POST /appointments/:id/reschedule` com transação
- [ ] Atualizar Session ao cancelar original
- [ ] Criar nova Session ao criar novo appointment
- [ ] Definir política de Payment (copiar / manter / criar novo)
- [ ] Emitir eventos: `appointmentRescheduled`, `appointmentCancelled`, `appointmentCreated`
- [ ] Atualizar `mapV2Appointment` se necessário (frontend já preparado)

---

## 🔗 Contrato com Frontend

O frontend já envia:
- `date`, `time`, `patientId`, `professionalName`, `specialty`, etc.
- `_id` e `id` no modo update
- `operationalStatus`

O backend deve aceitar no `/reschedule`:
- Todos os campos de `buildAppointmentPayload` (modo update)
- `rescheduleReason` (opcional)

O backend deve retornar:
```json
{
  "success": true,
  "data": {
    "appointment": { ...novoAppointment },
    "session": { ...novaSession }
  },
  "meta": {
    "rescheduledFrom": "id_do_original"
  }
}
```
