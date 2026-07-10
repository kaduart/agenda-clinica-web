# Homologação Interna — Agenda Externa

**Data:** 2026-07-10  
**Versão da Agenda:** pós-correção dos 7 itens críticos originais  
**Responsável:** equipe de desenvolvimento

---

## 1. Checklist de funcionalidades obrigatórias

| # | Funcionalidade | Status | Observação |
|---|----------------|--------|------------|
| 1 | Login / autenticação | ⚠️ Não testado | Depende de configuração de ambiente (`VITE_API_URL`, token). |
| 2 | Dashboard abre | ✅ Sim | Tela inicial carrega lista/grade após load de dados. |
| 3 | Agenda carrega | ✅ Sim | Appointments carregados via socket + `getCalendarData`. |
| 4 | Criar agendamento | ✅ Sim | Fluxo via `AppointmentModal` + `saveAppointment` + `upsertAppointment`. |
| 5 | Editar agendamento | ✅ Sim | `updateAppointmentDirect` / `adminEditAppointment`. |
| 6 | Cancelar agendamento | ✅ Sim | `onCancel` → `cancelAppointment` / `cancelPreAppointment`. |
| 7 | Confirmar agendamento | ✅ Sim | `onConfirmPreAppointment` + `approvePreAppointment`. |
| 8 | Criar paciente | ✅ Sim | Via modal de agendamento com `isNewPatient=true`. |
| 9 | Editar paciente | ✅ Sim | `updatePatient` chamado em `saveAppointment` quando há `patientId`. |
| 10 | Criar profissional | ✅ Sim | `ProfessionalsModal` + `addProfessional`. |
| 11 | Criar pacote | ⚠️ Parcial | Pacotes são gerenciados principalmente no CRM; Agenda Externa lê pacotes vinculados. |
| 12 | Editar pacote | ⚠️ Parcial | Mesmo contexto acima. |
| 13 | Lembretes | ✅ Sim | Criação (`ReminderModal`), listagem (`RemindersListModal`) e envio em lote implementados. |
| 14 | WhatsApp conecta | ✅ Sim | `WhatsAppConnectModal` exibe QR via `GET /api/whatsapp-web/status`. |
| 15 | WhatsApp envia lembrete | ✅ Sim | `sendViaExtension` + `generateReminderMessage`. |
| 16 | WhatsApp envia mensagem ao profissional | ✅ Sim | `generateProfessionalReminderMessage` + `sendViaExtension`. |
| 17 | Filtros de status | ✅ Sim | "Pendente" corrigido para incluir `scheduled` + `pending`. |
| 18 | Filtros de profissional/data | ✅ Sim | Implementados em `App.jsx`. |
| 19 | Impressão / exportação | ⚠️ Não auditado | Não identificado fluxo ativo de impressão na Agenda Externa. |

---

## 2. Checklist de testes manuais

> *Esses testes devem ser executados em ambiente de homologação antes de liberar para uso interno.*

### Fluxos principais

| # | Teste | Passo a passo | Esperado |
|---|-------|---------------|----------|
| 1 | Criar agendamento real | Lista → Novo agendamento → preencher → salvar | Agendamento aparece na lista/grade; não duplica ao clicar 2x. |
| 2 | Criar pré-agendamento | Lista → Novo pré-agendamento → preencher → salvar | Pré-agendamento criado; fechar modal NÃO cancela. |
| 3 | Confirmar pré-agendamento | Abrir pré-agendamento → Confirmar | Status muda; agendamento real criado no CRM. |
| 4 | Editar agendamento | Abrir agendamento → alterar horário/profissional → salvar | Alteração refletida; sem conflito se não houver. |
| 5 | Cancelar agendamento | Menu cancelar → informar motivo | Status muda para cancelado; refresh da lista. |
| 6 | Cancelar pré-agendamento | Menu cancelar → confirmar | Pré-agendamento cancelado/descartado. |
| 7 | Criar lembrete | Menu lembrete → preencher → salvar | Lembrete aparece na listagem. |
| 8 | Enviar lembretes em lote | Abrir listagem de lembretes → "Enviar Lembretes" | Mensagens enviadas para paciente e profissional (se houver telefone); lembretes marcados como done. |
| 9 | Conectar WhatsApp | Header → ícone WhatsApp → escanear QR | Conecta e status fica ready. |
| 10 | Enviar mensagem manual | Linha do agendamento → ícone WhatsApp → enviar | Mensagem entregue; fallback para Meta API/VPS se necessário. |
| 11 | Filtro "Pendente" | Selecionar "Pendente" no filtro de status | Mostra agendamentos "Pendente" e "Agendado". |
| 12 | Filtro por profissional | Selecionar profissional | Mostra apenas agendamentos do profissional. |
| 13 | Grade semanal | Acessar view "Semanal" | Deve refletir a especialidade ativa. |

### Navegação e UX

| # | Teste | Esperado |
|---|-------|----------|
| 14 | Abrir/fechar modal de agendamento várias vezes | Sem erro; sem cancelamento automático. |
| 15 | Trocar entre views Lista/Semanal | Renderização correta; estado preservado. |
| 16 | Recarregar página | Filtros de data persistidos (`sessionStorage`). |

---

## 2.1 Checklist de homologação operacional (com a secretária)

> *Executar em ambiente de homologação, observando comportamento real do usuário.*

### 1. Criar agendamento

- [ ] Criar paciente novo.
- [ ] Criar agendamento futuro.
- [ ] Alterar profissional.
- [ ] Alterar horário.
- [ ] Cancelar.
- [ ] Reagendar.

**Validar:** status correto, profissional correto, paciente correto, sem duplicação.

### 2. Grade semanal

- [ ] Navegar segunda → domingo.
- [ ] Trocar de especialidade.
- [ ] Trocar de profissional.
- [ ] Abrir dia cheio.
- [ ] Abrir dia vazio.

**Observar:** loading, travamentos, eventos duplicados, horários desalinhados.

### 3. Lembretes

- [ ] Criar lembrete pelo modal novo.
- [ ] Ver na lista de lembretes.
- [ ] Alterar texto/data.
- [ ] Enviar manualmente.
- [ ] Confirmar mudança de status.

**Objetivo:** confirmar que ninguém percebe mais o fluxo legado do `Appointment`.

### 4. Operação real

Deixar a secretária executar sozinha:

- criação dos pacientes do dia;
- confirmações;
- alterações;
- cancelamentos.

**Observar:**

- "Onde ela procura uma informação?"
- "Qual botão ela espera que faça algo?"
- "Qual informação ela acha que está faltando?"

---

## 3. Bugs ainda conhecidos

> *Conforme `BACKLOG_AGENDA.md` reclassificado.*

### 🟡 Médios (degradam operação) — RESOLVIDOS ✅

| # | Bug | Impacto operacional | Plano |
|---|-----|---------------------|-------|
| 1 | Loading de salvamento não bloqueia todos os caminhos | Risco de duplo-clique e agendamento duplicado. | Revisados estados de loading no `AppointmentModal`; botões de fechar desabilitados durante loading. |
| 2 | Grade semanal não respeita especialidade ativa | Secretária vê profissionais de outras áreas; risco de agendar errado. | `WeeklyView` agora filtra profissionais por `activeSpecialty`. |
| 3 | Dupla via de lembretes confusa | Usuário pode criar lembrete no appointment e na entidade Reminder sem saber qual vale. | Via oficial definida como entidade Reminder; campos legados removidos da UI; leitura residual validada. |
| 4 | Token hardcoded em `api.js` | Risco de segurança; token presente no bundle. | Removido fallback; token obrigatoriamente via `VITE_API_TOKEN`. |

**⚠️ Ação de hardening obrigatória antes de produção:**

Como o token antigo (`agenda_export_token_fono_inova_2025_secure_abc123`) pode estar no histórico do Git ou em builds anteriores, considerá-lo **potencialmente comprometido**. Executar:

```bash
git log -S "agenda_export_token_fono_inova_2025_secure_abc123" --all
```

Se encontrar no histórico:

1. Revogar o token atual no backend.
2. Gerar novo token.
3. Atualizar `VITE_API_TOKEN` nos ambientes.
4. Avaliar remoção do histórico Git se necessário.

### 🟢 Baixos (não impedem operação)

| # | Bug | Plano |
|---|-----|-------|
| 1 | Badge de data ativa exibe ISO | Formatar para `dd/mm/aaaa` em momento oportuno. |
| 2 | Props mortas no `AppointmentModal` | Remover ou implementar. |
| 3 | Variável `canConfirmWhatsApp` não usada | Usar ou remover. |
| 4 | Feedback de WhatsApp via DOM customizado | Substituir por `toast`. |
| 5 | `console.log` excessivos | Limpar. |
| 6 | Problemas de lint (63 erros, 11 warnings) | Corrigir progressivamente. |
| 7 | Duplicação de `generateTimeSlots` | Unificar. |
| 8 | Interceptors duplicados em `api.js` | Refatorar. |
| 9 | Componentes vazios (`WeeklyProfessionalView`, `AvailabilityDashboard`) | Implementar ou remover. |
| 10 | Cobertura de testes baixa (4 testes) | Adicionar testes de componente/fluxo. |

### 📝 Débito técnico

| ID | Descrição | Risco | Decisão |
|----|-----------|-------|---------|
| DT-01 | Envio de lembretes usa snapshot de dados no modelo `Reminder` | Telefone antigo pode ser usado se contato mudar | Aceito por ora; refatorar para endpoint backend em sprint futura. |

---

## 4. Critérios de aceite para homologação interna

| Critério | Status |
|----------|--------|
| Nenhum bug 🔴 crítico aberto | ✅ Sim |
| Build verde | ✅ Sim (`npm run build` passa) |
| Testes verdes | ✅ Sim (`npm test -- --run` passa) |
| Fluxos principais testados manualmente | ⚠️ Parcial — checklist definido, execução depende de ambiente |
| Sem erro em console nos fluxos principais | ⚠️ Ainda há `console.log`; erros não foram observados, mas não auditado |
| Documento de bugs conhecidos atualizado | ✅ Sim |

---

## 5. Parecer final

### ✅ Pronta para homologação interna.

**Status do ciclo:** correção técnica concluída → **validação operacional iniciada**.

**Justificativa:**

- Os 7 bugs 🔴 críticos originais foram resolvidos.
- Os 4 bugs 🟡 médios de impacto operacional foram resolvidos.
- Build e testes estão verdes.
- Os fluxos principais de agendamento, pré-agendamento, lembretes e WhatsApp estão funcionais.

**Próximos passos obrigatórios antes da produção:**

1. **Congelar estado** (tag/commit de homologação).
2. **Executar checklist de testes manuais** em ambiente de homologação.
3. **Colocar a secretária para usar** a Agenda por alguns dias.
4. **Coletar feedback real** e corrigir regressões críticas.
5. **Ação de hardening:** verificar histórico Git pelo token antigo e revogar/rotacionar se necessário.
6. Reavaliar itens 🟢 baixos após o feedback operacional.

**Não recomendada para produção plena** até que a homologação interna seja concluída sem regressões críticas.
