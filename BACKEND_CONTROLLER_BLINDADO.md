# Controller Blindado — Appointments V2

> Copiar e colar no teu backend Node.js + Mongoose
> Compatível com o frontend já preparado (builder DTO + separação semântica)

---

## 🛡️ Middleware — Validação de Campos Estruturais

```js
// middleware/appointmentValidation.js

const STRUCTURAL_FIELDS = ['date', 'time', 'startDateTime', 'endDateTime'];
const DOCTOR_CHANGE_TRIGGERS_RESCHEDULE = true; // 🎯 configure aqui

/**
 * Bloqueia UPDATE se houver mudança estrutural (data/hora).
 * Opcionalmente bloqueia mudança de profissional.
 */
function blockStructuralChanges(req, res, next) {
  if (req.method !== 'PUT') return next();

  const hasStructural = STRUCTURAL_FIELDS.some(f => f in req.body);

  if (hasStructural) {
    return res.status(400).json({
      success: false,
      error: 'Mudança de data/horário não permitida via UPDATE',
      code: 'STRUCTURAL_CHANGE_BLOCKED',
      message: 'Use POST /appointments/:id/reschedule para alterar data ou horário'
    });
  }

  if (DOCTOR_CHANGE_TRIGGERS_RESCHEDULE && 'doctorId' in req.body) {
    return res.status(400).json({
      success: false,
      error: 'Mudança de profissional requer remarcação',
      code: 'DOCTOR_CHANGE_BLOCKED',
      message: 'Use POST /appointments/:id/reschedule para alterar profissional'
    });
  }

  next();
}

module.exports = { blockStructuralChanges, STRUCTURAL_FIELDS };
```

---

## ✏️ PUT /appointments/:id (Blindado)

```js
// routes/appointments.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Session = require('../models/Session');
const Payment = require('../models/Payment');
const { emitEvent } = require('../services/socket');
const { blockStructuralChanges } = require('../middleware/appointmentValidation');

// Aplica middleware em TODOS os PUT
router.put('/:id', blockStructuralChanges);

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Appointment.findById(id)
      .populate('patient', 'fullName phone email dateOfBirth')
      .populate('doctor', 'fullName specialty');

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Agendamento não encontrado',
        code: 'NOT_FOUND'
      });
    }

    if (existing.operationalStatus === 'canceled') {
      return res.status(400).json({
        success: false,
        error: 'Agendamento cancelado não pode ser editado',
        code: 'ALREADY_CANCELED'
      });
    }

    // 🔒 Sanitização: remove lixo que o frontend não deveria enviar
    const cleanBody = { ...req.body };
    delete cleanBody._id;
    delete cleanBody.id;
    delete cleanBody.createdAt;
    delete cleanBody.updatedAt;
    delete cleanBody.__v;
    delete cleanBody.session; // populado, não pode sobrescrever

    // Atualiza
    const updated = await Appointment.findByIdAndUpdate(
      id,
      { $set: cleanBody },
      { new: true, runValidators: true }
    )
      .populate('patient', 'fullName phone email dateOfBirth')
      .populate('doctor', 'fullName specialty');

    // 🔔 Evento
    emitEvent('appointmentUpdated', {
      _id: updated._id,
      data: updated,
      changedBy: req.user?._id || 'system'
    });

    return res.json({
      success: true,
      data: { appointment: updated },
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('[PUT /appointments/:id] ERROR:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao atualizar agendamento',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});
```

---

## 🔁 POST /appointments/:id/reschedule (Completo)

```js
router.post('/:id/reschedule', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const {
      date,
      time,
      doctorId,
      professionalName,
      rescheduleReason = '',
      ...otherFields
    } = req.body;

    // ─────────────────────────────────────────
    // 1. VALIDAÇÕES
    // ─────────────────────────────────────────
    if (!date || !time) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Data e horário são obrigatórios para remarcação',
        code: 'MISSING_DATETIME'
      });
    }

    const existing = await Appointment.findById(id).session(session);
    if (!existing) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Agendamento não encontrado',
        code: 'NOT_FOUND'
      });
    }

    if (existing.operationalStatus === 'canceled') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Agendamento já cancelado não pode ser remarcado',
        code: 'ALREADY_CANCELED'
      });
    }

    // ─────────────────────────────────────────
    // 2. CHECAGEM DE CONFLITO NO NOVO HORÁRIO
    // ─────────────────────────────────────────
    const targetDoctorId = doctorId || existing.doctorId;
    const conflict = await Appointment.findOne({
      _id: { $ne: existing._id },
      doctorId: targetDoctorId,
      date,
      time,
      operationalStatus: { $nin: ['canceled', 'cancelado'] }
    }).session(session);

    if (conflict) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        error: 'Conflito de agenda no novo horário',
        code: 'SLOT_CONFLICT',
        conflictWith: conflict._id
      });
    }

    // ─────────────────────────────────────────
    // 3. CANCELA O ORIGINAL (soft)
    // ─────────────────────────────────────────
    existing.operationalStatus = 'canceled';
    existing.status = 'Cancelado';
    existing.canceledAt = new Date();
    existing.cancelReason = rescheduleReason || 'Remarcado para outro horário';
    await existing.save({ session });

    // ─────────────────────────────────────────
    // 4. ATUALIZA SESSION ANTIGA (se existir)
    // ─────────────────────────────────────────
    const oldSessionId = existing.sessionId || existing.session?._id;
    if (oldSessionId) {
      await Session.findByIdAndUpdate(
        oldSessionId,
        {
          status: 'canceled',
          canceledAt: new Date(),
          cancelReason: 'Remarcado para novo agendamento'
        },
        { session }
      );
    }

    // ─────────────────────────────────────────
    // 5. CRIA NOVO APPOINTMENT
    // ─────────────────────────────────────────
    const newAppointment = new Appointment({
      patientId: existing.patientId,
      isNewPatient: false,
      patientInfo: existing.patientInfo,
      doctorId: targetDoctorId,
      professionalName: professionalName || existing.professionalName,
      specialty: otherFields.specialty || existing.specialty,
      date,
      time,
      duration: otherFields.duration || existing.duration || 40,
      operationalStatus: 'scheduled',
      status: 'Agendado',
      notes: otherFields.notes || existing.notes || '',
      observations: otherFields.observations || existing.observations || '',
      billingType: otherFields.billingType || existing.billingType || 'particular',
      insuranceProvider: otherFields.insuranceProvider || existing.insuranceProvider || '',
      insuranceValue: otherFields.insuranceValue || existing.insuranceValue || 0,
      authorizationCode: otherFields.authorizationCode || existing.authorizationCode || '',
      paymentStatus: otherFields.paymentStatus || existing.paymentStatus || 'pending',
      sessionValue: otherFields.sessionValue || existing.sessionValue || 0,
      paymentMethod: otherFields.paymentMethod || existing.paymentMethod || 'pix',
      crm: otherFields.crm || existing.crm || {},
      package: otherFields.package || existing.package || null,
      responsible: otherFields.responsible || existing.responsible || '',
      metadata: {
        origin: { source: 'reschedule' },
        previousAppointmentId: existing._id,
        rescheduledAt: new Date().toISOString()
      },
      originalAppointmentId: existing._id,
      rescheduleReason,
      rescheduledAt: new Date()
    });

    await newAppointment.save({ session });

    // ─────────────────────────────────────────
    // 6. CRIA NOVA SESSION
    // ─────────────────────────────────────────
    const newSession = new Session({
      appointmentId: newAppointment._id,
      patient: newAppointment.patientId,
      doctor: newAppointment.doctorId,
      date: newAppointment.date,
      time: newAppointment.time,
      sessionType: newAppointment.specialty,
      sessionValue: newAppointment.sessionValue || 0,
      status: 'scheduled',
      paymentStatus: newAppointment.paymentStatus || 'pending',
      duration: newAppointment.duration || 40
    });

    await newSession.save({ session });

    // Vincula session ao appointment
    newAppointment.sessionId = newSession._id;
    await newAppointment.save({ session });

    // ─────────────────────────────────────────
    // 7. POLÍTICA DE PAYMENT
    // ─────────────────────────────────────────
    const originalPayment = await Payment.findOne({
      appointmentId: existing._id
    }).session(session);

    if (originalPayment) {
      if (originalPayment.status === 'paid') {
        // Pago: mantém no original, cria novo pendente
        await Payment.create([{
          appointmentId: newAppointment._id,
          sessionId: newSession._id,
          patientId: newAppointment.patientId,
          amount: originalPayment.amount,
          status: 'pending',
          method: originalPayment.method || 'pix',
          description: `Remarcação de ${existing.date} ${existing.time}`
        }], { session });
      } else {
        // Pendente: cancela original, cria novo pendente
        originalPayment.status = 'canceled';
        originalPayment.canceledAt = new Date();
        originalPayment.cancelReason = 'Remarcado';
        await originalPayment.save({ session });

        await Payment.create([{
          appointmentId: newAppointment._id,
          sessionId: newSession._id,
          patientId: newAppointment.patientId,
          amount: originalPayment.amount,
          status: 'pending',
          method: originalPayment.method || 'pix',
          description: `Remarcação de ${existing.date} ${existing.time}`
        }], { session });
      }
    }

    // ─────────────────────────────────────────
    // 8. COMMIT + EVENTOS
    // ─────────────────────────────────────────
    await session.commitTransaction();

    // Popula para resposta
    const populatedNew = await Appointment.findById(newAppointment._id)
      .populate('patient', 'fullName phone email dateOfBirth')
      .populate('doctor', 'fullName specialty');

    emitEvent('appointmentRescheduled', {
      from: existing._id,
      to: newAppointment._id,
      reason: rescheduleReason,
      at: new Date().toISOString()
    });

    emitEvent('appointmentCancelled', {
      _id: existing._id,
      reason: 'Remarcado',
      replacedBy: newAppointment._id
    });

    emitEvent('appointmentCreated', {
      _id: newAppointment._id,
      data: populatedNew
    });

    return res.json({
      success: true,
      data: {
        appointment: populatedNew,
        session: newSession
      },
      meta: {
        rescheduledFrom: existing._id,
        reason: rescheduleReason,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('[POST /reschedule] ERROR:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao remarcar agendamento',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  } finally {
    session.endSession();
  }
});

module.exports = router;
```

---

## 🧪 Schema Mongoose (campos novos)

```js
// models/Appointment.js

const appointmentSchema = new mongoose.Schema({
  // ... campos existentes

  // 🔗 Encadeamento
  originalAppointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null,
    index: true
  },

  rescheduleReason: {
    type: String,
    default: ''
  },

  rescheduledAt: {
    type: Date,
    default: null
  },

  // 🚫 Cancelamento estruturado
  canceledAt: {
    type: Date,
    default: null
  },

  cancelReason: {
    type: String,
    default: ''
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: busca cadeia de remarcações
appointmentSchema.virtual('rescheduleHistory', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'originalAppointmentId'
});

// Virtual: busca original
appointmentSchema.virtual('originalAppointment', {
  ref: 'Appointment',
  localField: 'originalAppointmentId',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Appointment', appointmentSchema);
```

---

## 📋 Checklist para deploy

- [ ] Adicionar `blockStructuralChanges` no router de appointments
- [ ] Adicionar campos novos no `AppointmentSchema`
- [ ] Criar índice `originalAppointmentId`
- [ ] Implementar `PUT /appointments/:id` blindado
- [ ] Implementar `POST /appointments/:id/reschedule`
- [ ] Testar: UPDATE sem data/hora → deve funcionar
- [ ] Testar: UPDATE com data/hora → deve bloquear (400)
- [ ] Testar: RESCHEDULE com data/hora → deve criar novo
- [ ] Testar: RESCHEDULE com conflito → deve bloquear (409)
- [ ] Verificar eventos socket chegando no frontend

---

## 🔗 Como o frontend reage

| Backend retorna | Frontend faz |
|-----------------|--------------|
| `PUT 200` | Toast: "Atualizado!" |
| `PUT 400` (STRUCTURAL_CHANGE_BLOCKED) | Toast: "Use remarcação para mudar horário" |
| `POST /reschedule 200` | Toast: "Remarcado!" + refresh lista |
| `POST /reschedule 409` (SLOT_CONFLICT) | Toast: "Conflito no novo horário" |
| `POST /reschedule 404` | Fallback automático para `PUT` (compatibilidade) |

---

**Pronto para copiar, colar e testar.**
