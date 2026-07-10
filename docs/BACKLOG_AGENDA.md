# Backlog Priorizado — Agenda Externa

**Data:** 2026-07-10  
**Objetivo:** entregar a Agenda Externa funcionando de ponta a ponta.  
**Metodologia:** auditoria funcional focada no usuário. Nenhuma alteração arquitetural sem bloqueio funcional comprovado.

**Revisado em:** 2026-07-10 após fechamento dos 7 itens críticos originais.

---

## Como usar este backlog

- Itens 🔴 **críticos** impedem uso diário ou causam perda/erro. Devem ser tratados primeiro.
- Itens 🟡 **médios** funcionam, mas degradam a operação ou geram comportamento inesperado.
- Itens 🟢 **baixos** são refinamentos de UX, melhorias ou dívida técnica.
- A ordem dentro de cada prioridade reflete impacto operacional real.

---

## 🔴 Crítico — entregar primeiro

> *Regra aplicada: "Se a secretária usar a Agenda amanhã das 8h às 18h, esse problema impede o trabalho?"*

### 1. Fechar modal cancela pré-agendamento existente ✅ CONCLUÍDO
- **Arquivo:** `src/App.jsx` (~linha 741)
- **Problema:** `handleCloseModal` chama `cancelPreAppointment(id)` quando `operationalStatus === 'pre_agendado'`.
- **Impacto:** usuário perde um interesse real ao simplesmente fechar o modal de edição.
- **Correção:** `handleCloseModal` agora apenas fecha o modal e limpa `editingAppointment`. Cancelamento explícito continua funcionando via menu/listagem e mudança de status no modal.
- **Validação:** `npm run build` ✅ e `npm test -- --run` ✅.

### 2. Botão "Enviar Lembretes" não faz nada ✅ CONCLUÍDO
- **Arquivo:** `src/components/RemindersListModal.jsx`, `src/components/ReminderModal.jsx`, `back/models/Reminder.js`
- **Problema:** botão no footer do modal sem `onClick`.
- **Impacto:** ação visível que não executa nada.
- **Correção:** implementado envio em lote de lembretes via WhatsApp para paciente e profissional; modelo `Reminder` ampliado com snapshot de telefones e dados do agendamento.
- **Validação:** `npm run build` ✅ e `npm test -- --run` ✅.
- **Débito técnico:** DT-01 — centralização futura do envio no backend.

### 3. Filtro de status "Pendente" não retorna resultados ✅ CONCLUÍDO
- **Arquivo:** `src/components/FiltersPanel.jsx`, `src/App.jsx`
- **Problema:** select oferece "Pendente", mas o filtro local só comparava com `"Pendente"`; agendamentos `scheduled` são traduzidos como `"Agendado"`.
- **Impacto:** filtro inutilizável para "Pendente".
- **Correção:** filtro `"Pendente"` agora aceita tanto `"Pendente"` quanto `"Agendado"`, alinhando com a semântica do backend (`scheduled` + `pending`).
- **Validação:** `npm run build` ✅ e `npm test -- --run` ✅.

### 4. Connect/Disconnect do Baileys estão trocados ✅ CONCLUÍDO
- **Arquivo:** `src/services/baileysApi.js`
- **Problema:** `connect()` chamava `disconnectBaileys()` e vice-versa.
- **Impacto:** ações de conexão invertidas; usuário não consegue gerenciar WhatsApp Baileys.
- **Correção:** `connect()` chama `connectBaileys()`; `disconnect()` chama `disconnectBaileys()`.
- **Validação:** `npm run build` ✅ e `npm test -- --run` ✅.

### 5. ReferenceError em `autoSendPreAgendamento` ✅ CONCLUÍDO
- **Arquivo:** `src/services/crmApi.js`
- **Problema:** variável `patientNameForExport` não declarada.
- **Impacto:** chamada gera `ReferenceError`.
- **Correção:** substituída por `appointment.patientName || appointment.patient || ""`.
- **Validação:** `npm run build` ✅ e `npm test -- --run` ✅.

---

## 🟡 Médio — degrada a operação, mas não impede

> *Regra aplicada: funciona, mas causa lentidão, confusão ou risco operacional claro.*

### 6. Grade semanal não respeita especialidade ativa ✅ CONCLUÍDO
- **Arquivo:** `src/components/WeeklyView.jsx`, `src/App.jsx`
- **Problema:** `WeeklyView` recebe todos os profissionais e appointments; não aplica `activeSpecialty`.
- **Impacto:** grade mostra profissionais de outras áreas, dificultando a leitura.
- **Causa raiz:** categoria **filtro local não propagado**. `WeeklyView` recebia `activeSpecialtyLabel` apenas para exibição, mas não recebia `activeSpecialty` e não filtrava a lista de profissionais.
- **Correção:**
  - `App.jsx` passa `activeSpecialty` para `WeeklyView`;
  - `WeeklyView` filtra `professionals` exibindo apenas aqueles com `pro.specialty === activeSpecialty` (ou todos quando `activeSpecialty === "todas"`).
- **Validação:** `npm run build` ✅ e `npm test -- --run` ✅.

### 7. Dupla via de lembretes confusa ✅ CONCLUÍDO
- **Arquivo:** `src/components/ReminderModal.jsx`, `src/App.jsx`, `src/components/AppointmentRow.jsx`
- **Problema:** `ReminderModal` cria entidade `Reminder`; `App.saveReminder` faz upsert no campo `reminderText` do agendamento. `AppointmentRow` mostrava badge e menu baseado no campo legado.
- **Impacto:** usuário não sabia qual lembrete estava criando; badge e entidade Reminder coexistiam.
- **Causa raiz:** categoria **duplicação funcional + visual**. Existiria uma via legada (campo no appointment) e uma via nova (entidade `Reminder`).
- **Correção:**
  - Via oficial definida: **entidade `Reminder`** (tem backend, listagem e envio em lote).
  - `AppointmentRow.jsx`: removido badge `hasReminder` e texto "lembrete interno" do menu.
  - `ReminderModal.jsx`: não inicializa mais o form a partir de `appointment.reminderText`/`reminderDate`.
  - `App.jsx`: `saveReminder` tornou-se `noop` com `console.warn`; upsert no campo legado removido.
- **Auditoria final de leitura:**
  - Frontend: `reminderText`/`reminderDate`/`reminderTime`/`reminderDone` só aparecem no form local do `ReminderModal`; nenhuma leitura dos campos do `Appointment`.
  - Backend: nenhuma ocorrência ativa nos arquivos de código (logs e auditoria excluídos).
- **Validação:** `npm run build` ✅ e `npm test -- --run` ✅.

### 8. Loading de salvamento não bloqueia modal em todos os caminhos ✅ CONCLUÍDO
- **Arquivo:** `src/components/AppointmentModal.jsx`
- **Problema:** spinner pode ficar preso ou permitir duplo-clique em certos fluxos.
- **Impacto:** risco de ação duplicada ou estado preso.
- **Causa raiz:** categoria **UX/frontend**. `handleConfirmPre` não tinha guarda `if (isLoading) return`; botões "Cancelar" e "X" não eram explicitamente desabilitados durante loading (embora o container usasse `pointer-events-none`).
- **Correção:**
  - adicionada guarda `if (isLoading) return` em `handleConfirmPre`;
  - botão "X" e botão "Cancelar" agora têm `disabled={isLoading || isLoadingDetails}` e estilo visual de desabilitado;
  - proteção `pointer-events-none` no container mantida como defesa adicional.
- **Validação:** `npm run build` ✅ e `npm test -- --run` ✅.

### 9. Token hardcoded no fallback de `api.js` ✅ CONCLUÍDO
- **Arquivo:** `src/services/api.js` (~linha 15), `src/constants.js`
- **Problema:** token fixo no código (`agenda_export_token_fono_inova_2025_secure_abc123`).
- **Impacto:** risco de segurança; token presente no bundle; quebra em ambientes diferentes.
- **Causa raiz:** categoria **segredo hardcoded**. O interceptor usava fallback `|| 'token...'` e `src/constants.js` exportava o mesmo token morto.
- **Correção:**
  - `api.js`: removido fallback; token agora vem obrigatoriamente de `import.meta.env.VITE_API_TOKEN`.
  - `src/constants.js`: removido `EXPORT_TOKEN` (código morto).
- **Auditoria de segredos:** `git grep -i "password|secret|apikey|api_key|token" src` não encontra mais tokens fixos no código.
- **Validação:** `npm run build` ✅ e `npm test -- --run` ✅.

---

## 🟢 Baixo — refinamento, UX ou dívida técnica

> *Regra aplicada: não afeta a operação diária diretamente.*

### 10. View Calendário mostra grade semanal ✅ CONCLUÍDO (mitigado)
- **Arquivo:** `src/components/CalendarView.jsx`, `src/components/Header.jsx`
- **Problema:** `CalendarView.jsx` era cópia de `WeeklyView.jsx`.
- **Correção:** botão "Calendário" oculto até implementação de calendário mensal real.
- **Validação:** `npm run build` ✅ e `npm test -- --run` ✅.

### 11. WhatsAppQRGlobal não exibe QR code ✅ CONCLUÍDO (removido)
- **Arquivo:** `src/components/WhatsAppQRGlobal.jsx`
- **Problema:** componente morto; não exibia QR code.
- **Correção:** removido. `WhatsAppConnectModal` é a única interface de conexão.
- **Validação:** `npm run build` ✅ e `npm test -- --run` ✅.

### 12. Modal de agendamento excessivamente complexo
- **Arquivo:** `src/components/AppointmentModal.jsx` (1.565 linhas)
- **Problema:** acumula muitas responsabilidades.
- **Impacto:** difícil de manter; alto risco de regressão futuro.
- **Ação:** extrair sub-formulários em componentes menores.

### 13. Badge de data ativa exibe ISO
- **Arquivo:** `src/components/FiltersPanel.jsx` (~linha 82)
- **Problema:** data exibida como `yyyy-mm-dd`.
- **Impacto:** leitura ruim.
- **Ação:** formatar para `dd/mm/aaaa`.

### 14. Props mortas no `AppointmentModal`
- **Arquivo:** `src/components/AppointmentModal.jsx`
- **Problema:** props `appointments`, `onReloadPatients`, `authError` não são usadas.
- **Ação:** remover props não utilizadas ou implementar sua função.

### 15. Variável `canConfirmWhatsApp` não usada
- **Arquivo:** `src/components/AppointmentRow.jsx` (~linha 230)
- **Problema:** variável definida mas nunca utilizada.
- **Ação:** usar a variável para controlar exibição ou remover.

### 16. Feedback de WhatsApp via DOM customizado
- **Arquivo:** `src/components/AppointmentRow.jsx` (~linha 215)
- **Problema:** usa `document.createElement` em vez de `toast` do react-toastify.
- **Ação:** substituir por `toast.success`/`toast.error`.

### 17. Limpar `console.log` de produção
- **Arquivo:** vários (`App.jsx`, repos, components)
- **Ação:** remover logs ou mover para modo debug.

### 18. Resolver problemas de lint
- **Atual:** 63 erros, 11 warnings.
- **Ação:** corrigir erros progressivamente; adicionar lint no CI.

### 19. Duplicação de `generateTimeSlots`
- **Arquivo:** `src/utils/timeSlots.js`, `src/utils/slots.js`
- **Ação:** unificar em um único utilitário.

### 20. Interceptors de resposta duplicados
- **Arquivo:** `src/services/api.js`
- **Ação:** remover duplicação de tratamento de erro.

### 21. Componentes vazios
- **Arquivo:** `src/components/WeeklyProfessionalView.jsx`, `src/components/AvailabilityDashboard.jsx`
- **Ação:** implementar ou remover.

### 22. Cobertura de testes muito baixa
- **Atual:** 4 testes, nenhum de componente.
- **Ação:** adicionar testes para os principais fluxos (criar, editar, cancelar, filtros).

---

## 📝 Débitos técnicos registrados

### DT-01 — Centralização do envio de lembretes no backend
- **Contexto:** item 4 (botão "Enviar Lembretes") foi implementado com snapshot dos dados (`patientPhone`, `professionalPhone`, `date`, `time`, `specialty`) diretamente no modelo `Reminder`.
- **Decisão consciente:** snapshot é válido porque o lembrete deve refletir o contexto exato em que foi criado, mesmo que o agendamento ou contatos mudem depois.
- **Risco:** duplicação de dados; se o telefone do paciente mudar **antes** do envio, o reminder enviará para o número antigo.
- **Ação futura:** avaliar criação de endpoint backend dedicado ao envio em lote de lembretes, buscando dados do CRM no momento do envio. **Não refatorar agora.**

---

## Próxima ação recomendada

1. Revisar critérios de homologação interna em `HOMOLOGACAO_INTERNA.md`.
2. Resolver itens 🟡 médios antes de liberar para uso diário, começando pela grade semanal (item 6).
3. Itens 🟢 baixos podem ser atacados em paralelo, sem bloquear a homologação.
