# Fase 5A — Checkpoint: Correção de infraestrutura (Outbox na transação)

**Data:** 2026-07-10  
**Escopo:** backend CRM (`/home/user/projetos/crm/back`)  
**Status:** ✅ Concluída — aguardando decisão sobre fechamento da Fase 4

---

## 1. Resumo executivo

A Fase 5A executou apenas o item de **menor risco e maior ganho arquitetural** levantado no final da Fase 4:

> Mover o `saveToOutbox()` do `expirePreAgendamentoCommand` para dentro do `runTransactionWithRetry`.

Além disso, foi realizada uma **auditoria técnica dos hooks de cascade delete do model `Appointment`**, focada nos commands canônicos e no impacto no pipeline transacional, **sem nenhuma alteração de código**.

**O que NÃO foi feito nesta fase (conforme estratégia definida):**
- Nenhuma alteração em regras financeiras (`PatientBalance`).
- Nenhuma remoção ou modificação de hooks legados.
- Nenhum producer financeiro migrado.

---

## 2. Correção realizada

### 2.1 `expirePreAgendamentoCommand` — Outbox dentro da transação

**Arquivo:** `back/services/appointment/commands/expirePreAgendamentoCommand.js`

**Mudança:**
- O `saveToOutbox` foi movido de **fora** para **dentro** do callback do `runTransactionWithRetry`, recebendo a `session` MongoDB.
- O `recordAudit` permanece **fora** da transação (padrão best-effort de auditoria).

**Garantia obtida:**
- Se a gravação do evento no Outbox falhar, a transação inteira é abortada.
- O estado do `Appointment`/`Session` e o evento `APPOINTMENT_UPDATED` são **atômicos**.
- Elimina a janela de inconsistência em que o banco confirmava a expiração, mas o evento não era publicado.

### 2.2 Testes

O teste `back/tests/integration/fase4-outbox-producers.test.js` foi reexecutado para validar que a mudança preservou o comportamento funcional:

```
Test Files  1 passed (1)
     Tests  5 passed (5)
```

---

## 3. Auditoria dos hooks de cascade delete do `Appointment`

**Arquivo da auditoria:** `FASE_5A_APPOINTMENT_CASCADE_AUDIT.md`

### 3.1 Hooks identificados

| Hook | Local | Disparado por | Problema |
|------|-------|---------------|----------|
| `post('findOneAndDelete')` | `Appointment.js:611` | `findByIdAndDelete`, `findOneAndDelete` | Deleta `Session` fora da transação |
| `pre('deleteOne')` | `Appointment.js:625` | `appointmentDoc.deleteOne()` | Deleta `Session`/`Payment` fora da transação |
| `pre('deleteMany')` | `Appointment.js:643` | `Appointment.deleteMany(filter)` | Faz query + deleta filhos fora da transação |

### 3.2 Quem passa pelos hooks

| Hook | Command/Arquivo | Contexto | Dentro de transação? | Risco |
|------|-----------------|----------|----------------------|-------|
| `post('findOneAndDelete')` | `deleteAppointmentCommand` | Deleta appointment avulso | ✅ Sim | **Médio-Alto** |
| `pre('deleteMany')` | `deletePackageCommand` (quando a rota for integrada) | Deleta appointments do pacote | ✅ Sim | **Alto** |
| `pre('deleteMany')` | `controllers/therapyPackageController.js` | Deleção de pacote de terapia | ✅ Sim | **Alto** (legado) |
| `pre('deleteMany')` | `routes/insuranceGuides.v2.js` | Cancelamento de guia | ❌ Não | Médio (legado) |
| `pre('deleteMany')` | `packageProjectionWorker.js` | `handlePackageDeleteRequested` | ❌ Não | Médio (legado) |

### 3.3 Recomendação da auditoria

**Não alterar os hooks nesta fase.**

A correção correta exige:
1. Mapear todos os pontos de chamada.
2. Escolher entre passar `session` para os hooks (frágil) ou mover o cascade para os commands (explícito).
3. Criar testes de concorrência com `MongoMemoryReplSet` forçando falhas de transação.
4. Implementar em uma fase dedicada (5B ou 6).

---

## 4. Estado de migração do delete de pacotes

Conforme `CURRENT_STATE_AUDIT.md` (seção 9), a operação de delete de pacotes estava classificada como **não conforme** e previa a criação de um command com evento `PACKAGE_DELETED`. O `MIGRATION_PLAN.md` (Fase 4, item 4) e o `FASE_4_IMPACT_REPORT.md` confirmavam essa previsão.

O `deletePackageCommand` foi criado na Fase 4 e está testado. No entanto, a rota `DELETE /api/v2/packages/:id` em `back/routes/package.v2.js` ainda não o utiliza.

**Classificação:** a rota está **em migração**, não como legado morto. `CANONICAL_FILES.md` ainda não lista DELETE de pacote como operação canônica. Não foi encontrada, na documentação analisada, evidência de que essa integração tenha sido deliberadamente adiada.

### Critério de classificação

Esta operação foi classificada como **"em migração"** porque atende simultaneamente aos seguintes critérios:

1. Existe implementação parcial (`deletePackageCommand` criado e testado).
2. O caminho principal (`DELETE /api/v2/packages/:id`) ainda não utiliza essa implementação.
3. A documentação oficial (`CANONICAL_FILES.md`) não declara a operação como canônica.
4. Não há evidência documental de adiamento deliberado ou abandono.

---

## 5. Próximos passos

### 5.1 Decisão sobre canonicalização do delete de pacotes

- Decidir se `DELETE /api/v2/packages/:id` será incluído em `CANONICAL_FILES.md` como operação oficial.
- Se sim: integrar rota ao `deletePackageCommand.execute`, validar evento `PACKAGE_DELETED` no Outbox e atualizar `FASE_4_CHECKPOINT.md`.
- Se não: documentar o adiamento no `MIGRATION_PLAN.md` ou `CURRENT_STATE_AUDIT.md`.

### 5.2 Fase 5B (regras financeiras)

- Quando o `deletePackageCommand` estiver em uso, revisar a regra de ajuste de `PatientBalance` com o time de domínio.
- Adicionar testes de valor exato.

### 5.3 Fase 6 (hooks de cascade)

- Escolher estratégia de correção dos hooks de cascade delete do `Appointment`.
- Implementar com testes de concorrência.
- Remover ou reter hooks como safety-net, conforme decisão arquitetural.

---

## 6. Parecer

A Fase 5A cumpriu o objetivo de corrigir a infraestrutura crítica (`saveToOutbox` dentro da transação) sem introduzir novos riscos.

A auditoria confirmou que a Fase 5A cumpriu seu objetivo de infraestrutura. Quanto ao delete de pacotes, a documentação de planejamento previa a criação do `deletePackageCommand`, o que foi feito. A integração com a rota ainda não ocorreu, mas essa operação ainda não está listada como canônica em `CANONICAL_FILES.md`.

A sequência sugerida permanece:

1. Concluir a Fase 5A (já feito).
2. Decidir se o delete de pacotes será canonicalizado agora; se sim, integrar rota com `deletePackageCommand`.
3. Fase 5B (regras financeiras, quando aplicável).
4. Fase 6 (correção dos hooks de cascade, quando deletes forem canônicos).
