# 🔥 Backend Cleanup Required — Zero Legacy Leakage

> Frontend já foi limpo. Agora o backend precisa garantir que nunca vaza estados transitórios internos.

---

## 1. GET /api/v2/appointments — NUNCA retornar `converted`

### Problema
`converted` é estado transitório de processamento interno (engine de confirmação). Não é um estado de domínio válido para consumo.

### Fix
```js
// No controller/service de listagem
const query = {
  // ...existing filters
  operationalStatus: { $ne: 'converted' }  // ou equivalente
};
```

Ou, melhor ainda: o `converted` deveria ser um estado **temporário em memória** ou **flag interna**, nunca persistido como `operationalStatus` no banco.

---

## 2. Engine de confirmação — garantir atomicidade

### Problema
Sem lock/idempotência, múltiplos cliques criam múltiplos registros `converted` + `scheduled`.

### Fix (sugestão)
```js
// Pseudo-code
async function confirmPreAppointment(id, data) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const pre = await Appointment.findOne({ _id: id, operationalStatus: 'pre_agendado' }).session(session);
    if (!pre) throw new Error('Already converted or not found');
    
    pre.operationalStatus = 'scheduled';
    // ...apply data
    await pre.save({ session });
    
    await session.commitTransaction();
    return pre;
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}
```

**Chave:** UPDATE in-place, não CREATE novo + DELETE antigo.

---

## 3. Índice único ou idempotency key

### Problema
Backend não impede duplicatas de agendamento (mesmo paciente, mesma data, mesmo horário, mesmo profissional).

### Fix (sugestão)
```js
// MongoDB unique index (parcial, excluindo canceled)
db.appointments.createIndex(
  { patientId: 1, date: 1, time: 1, doctorId: 1 },
  { 
    unique: true, 
    partialFilterExpression: { operationalStatus: { $nin: ['canceled', 'converted'] } }
  }
);
```

Ou usar `x-client-request-id` que o frontend já envia como header de idempotência.

---

## 4. Migrar dados legacy

### Tarefa
Verificar se existe algum registro `operationalStatus: 'converted'` no banco e:
- Migrar para `scheduled` (se tiver appointment válido associado)
- Ou deletar (se for lixo de pipeline quebrado)

### Script
```js
db.appointments.find({ operationalStatus: 'converted' })
// Analisar e limpar
```

---

## Checklist

- [ ] GET /appointments exclui `converted` do resultado
- [ ] Engine de confirmação usa UPDATE in-place (não create/delete)
- [ ] Lock/idempotência impede duplicação
- [ ] Zero registros `converted` no banco de produção
- [ ] `x-client-request-id` respeitado para idempotência

---

**Quando isso estiver feito, o sistema estará 100% limpo — sem compensações no frontend.**
