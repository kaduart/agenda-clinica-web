# 🔄 Como Consolidar Pacientes Duplicados

## Problema
O paciente "Davi Felipe" tem 3-4 registros duplicados no sistema.

## Solução Rápida (via MongoDB)

### 1. Identifique os IDs
Execute no MongoDB Compass ou shell:

```javascript
// Buscar todos os pacientes com nome "Davi"
db.patients.find({ fullName: /Davi/i }).toArray()
```

### 2. Determine qual é o mais antigo
Verifique o campo `createdAt` - o mais antigo deve ser mantido.

### 3. Migre os agendamentos
Supondo que o ID principal seja `507f1f77bcf86cd799439011` e os duplicados sejam `AAA`, `BBB`, `CCC`:

```javascript
// Migrar agendamentos do duplicado 1 para o principal
db.appointments.updateMany(
  { patientId: ObjectId("AAA") },
  { $set: { patientId: ObjectId("507f1f77bcf86cd799439011") } }
)

// Migrar agendamentos do duplicado 2
db.appointments.updateMany(
  { patientId: ObjectId("BBB") },
  { $set: { patientId: ObjectId("507f1f77bcf86cd799439011") } }
)

// E assim por diante...
```

### 4. Delete os duplicados
```javascript
db.patients.deleteMany({
  _id: { $in: [
    ObjectId("AAA"),
    ObjectId("BBB"),
    ObjectId("CCC")
  ]}
})
```

## Via Script Node.js (se a API permitir)

Se você tiver acesso ao backend, pode criar um endpoint específico:

```javascript
// POST /api/admin/consolidar-pacientes
{
  "pacientePrincipalId": "507f1f77bcf86cd799439011",
  "pacientesDuplicadosIds": ["AAA", "BBB", "CCC"]
}
```

## ⚠️ Importante

1. **Faça backup** antes de executar qualquer operação de delete
2. **Verifique** se os agendamentos foram migrados corretamente
3. **Teste** com um paciente primeiro antes de fazer em massa

## Consulta para verificar duplicados

```javascript
// Lista todos os pacientes com nome duplicado
db.patients.aggregate([
  { $group: {
    _id: { $toLower: "$fullName" },
    count: { $sum: 1 },
    ids: { $push: "$_id" },
    datas: { $push: "$createdAt" }
  }},
  { $match: { count: { $gt: 1 } } },
  { $sort: { count: -1 } }
])
```
