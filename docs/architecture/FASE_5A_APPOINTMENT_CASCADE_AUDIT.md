# Auditoria técnica — Hooks de cascade delete do model `Appointment`

**Data:** 2026-07-10  
**Escopo:** backend CRM (`/home/user/projetos/crm/back/models/Appointment.js`)  
**Status:** 🔍 Auditoria concluída — **nenhuma alteração de código foi feita**

---

## 1. Regra metodológica desta auditoria

> **Regra nº 1:** a existência de uma implementação alternativa nunca é, por si só, evidência de dívida técnica. Primeiro deve ser determinado, pela documentação arquitetural, se ela está classificada como canônica, em migração ou descontinuada.

Esta auditoria foi solicitada como parte da **Fase 5A**, antes de qualquer mudança em regras financeiras ou remoção de legado.

Referências oficiais utilizadas:
- `crm/docs/architecture/ARCHITECTURE_RULES.md` — pipeline obrigatório `Transaction → saveToOutbox()`.
- `crm/docs/architecture/CANONICAL_FILES.md` — ainda **não lista** DELETE de appointment/pacote como canônico, mas o `MIGRATION_PLAN.md` e o `FASE_4_IMPACT_REPORT.md` preveem a criação dos commands.
- `agenda/docs/architecture/MIGRATION_PLAN.md` — Fase 4 prevê `deleteAppointmentCommand` e `deletePackageCommand`; Fase 5 prevê remoção de legado.

---

## 2. Resumo executivo

O model `Appointment` possui **três hooks de deleção** que executam cascade delete em `Session` e `Payment`:

1. `post('findOneAndDelete')`
2. `pre('deleteOne', { document: true, query: false })`
3. `pre('deleteMany')`

Nenhum dos três recebe a `session` MongoDB da transação ativa. Em commands canônicos que rodam dentro de `runTransactionWithRetry`, os filhos (`Session` / `Payment`) correm risco de serem deletados **fora da transação**.

**Recomendação imediata:** não alterar os hooks nesta fase. A correção correta exige mapear todos os pontos de chamada e decidir entre (a) passar `session` para os hooks ou (b) mover o cascade explicitamente para os commands.

---

## 3. Commands canônicos afetados

### 3.1 `deleteAppointmentCommand` — dispara `post('findOneAndDelete')`

**Arquivo:** `back/services/appointment/commands/deleteAppointmentCommand.js`

**Operação:** `Appointment.findByIdAndDelete(appointment._id, { session: mongoSession })`

**Rota canônica:** `DELETE /api/v2/appointments/:id` → `appointmentV2Service.deleteAppointment` → command.

**Problema:**
- O hook `post('findOneAndDelete')` deleta `Session` e `MedicalEvent` **fora da transação**.
- O command já deleta `Payment` explicitamente dentro da transação, então o hook não precisa fazer isso.
- Se a transação abortar, o `MedicalEvent` e a `Session` já foram deletados pelo hook.

**Observação:** este command **está ativo em produção** hoje.

---

### 3.2 `deletePackageCommand` — disparará `pre('deleteMany')`

**Arquivo:** `back/services/billing/commands/deletePackageCommand.js`

**Operação:** `Appointment.deleteMany({ package: realPackageId }).session(session)`

**Rota canônica:** `DELETE /api/v2/packages/:id` — **ainda não integrada** ao command (código legado inline em `routes/package.v2.js:542-718`).

**Problema:**
- Quando a rota for migrada para usar o command, o hook `pre('deleteMany')` executará duas vezes o mesmo trabalho:
  1. O próprio command já chama `Session.deleteMany` e `Payment.deleteMany` dentro da transação.
  2. O hook faz query fora da transação e deleta os mesmos filhos novamente.
- Além disso, a query do hook (`Appointment.find(filter)`) pode não ver os appointments que ainda estão dentro da transação, dependendo do nível de isolamento.

**Observação:** este command foi criado na Fase 4, mas a rota ainda não o utiliza. A integração faz parte do fechamento da Fase 4.

---

## 4. Outros pontos de chamada relevantes

Abaixo estão apenas os pontos **não-testes** que podem afetar dados reais. Código legado e scripts de cleanup foram excluídos desta análise.

| Arquivo | Operação | Dentro de transação? | Relevância |
|---------|----------|----------------------|------------|
| `routes/insuranceGuides.v2.js:854, 888` | `Appointment.deleteMany` | ❌ Não | Rota legada de convênio; já deleta filhos manualmente antes |
| `domains/billing/workers/packageProjectionWorker.js:348` | `Appointment.deleteMany` | ❌ Não | Worker de projeção (`handlePackageDeleteRequested`) — pode ser legado |
| `controllers/therapyPackageController.js:1954` | `Appointment.deleteMany` | ✅ Sim | Controller legado de terapia; duplica lógica de package |

**Nota:** `controllers/therapyPackageController.js` e `domains/billing/workers/packageProjectionWorker.js` não fazem parte do fluxo canônico atual e devem ser tratados como legado na Fase 5.

---

## 5. Invariantes potencialmente afetadas

Se um appointment for deletado dentro de uma transação e o hook executar fora dela:

1. **Rollback parcial:** transação aborta, mas filhos já foram deletados.
2. **Inconsistência temporária:** entre o commit e o término do hook, é possível ver appointment deletado com `Session`/`MedicalEvent` ainda presentes.
3. **Eventos fora de ordem:** `deleteAppointmentCommand` emite `APPOINTMENT_DELETED` dentro da transação. Workers podem processar o evento antes do hook terminar.

---

## 6. Opções de correção

### Opção A — Passar `session` para os hooks

- **Vantagem:** mínima mudança nos commands.
- **Desvantagem:** Mongoose não expõe a `session` ativa de forma confiável. Requer `this.options.session` ou contexto customizado.
- **Risco:** médio — hooks são side effects implícitos.

### Opção B — Mover cascade para os commands e remover os hooks

- **Vantagem:** controle explícito, transacional, testável.
- **Desvantagem:** exige garantir que nenhuma rota/script legada dependa dos hooks.
- **Risco:** médio-alto — se algo legado for esquecido, surgirão orphan documents.

### Opção C — Manter hooks como safety-net

- **Vantagem:** não quebra legado.
- **Desvantagem:** duplicação e writes fora da transação permanecem.
- **Risco:** baixo a médio — não resolve, mas não piora.

---

## 7. Recomendação

**Não alterar os hooks na Fase 5A.**

Antes da correção, é necessário:

1. Concluir a integração da rota `DELETE /api/v2/packages/:id` com `deletePackageCommand`.
2. Mapear **todos** os pontos de chamada de deleção de appointment (commands, rotas legadas, scripts).
3. Decidir entre as opções A, B ou C.
4. Criar testes de integração com `MongoMemoryReplSet` forçando falhas de transação.
5. Implementar em fase dedicada (por exemplo, Fase 5B ou Fase 6).

---

## 8. Estado de migração do delete de pacotes

Conforme `CURRENT_STATE_AUDIT.md` (seção 9), a operação de delete de pacotes estava classificada como **não conforme** e previa a criação de um command com evento `PACKAGE_DELETED`. O `MIGRATION_PLAN.md` (Fase 4, item 4) e o `FASE_4_IMPACT_REPORT.md` confirmavam essa previsão.

O `deletePackageCommand` foi criado na Fase 4 e está testado. No entanto, a rota `DELETE /api/v2/packages/:id` em `back/routes/package.v2.js` ainda não o utiliza.

### Critério de classificação

Esta operação foi classificada como **"em migração"** porque atende simultaneamente aos seguintes critérios:

1. Existe implementação parcial (`deletePackageCommand` criado e testado).
2. O caminho principal (`DELETE /api/v2/packages/:id`) ainda não utiliza essa implementação.
3. A documentação oficial (`CANONICAL_FILES.md`) não declara a operação como canônica.
4. Não há evidência documental de adiamento deliberado ou abandono.

Essa classificação **não** é "legado morto", pois o `MIGRATION_PLAN.md` previu a canonicalização. Também **não** é "canônica", pois `CANONICAL_FILES.md` ainda não a lista.

**Sugestão:** tratar essa integração como **fechamento da Fase 4**, separadamente da Fase 5A.
