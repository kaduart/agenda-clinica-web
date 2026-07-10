# Checkpoint — Fase de Homologação Interna

**Data:** 2026-07-10  
**Status:** correção técnica concluída; validação operacional iniciada.

---

## Resumo executivo

A Agenda Externa saiu da fase de correções técnicas prioritárias e está pronta para homologação interna.

- 🔴 **7 críticos** resolvidos.
- 🟡 **4 médios** resolvidos.
- 🟢 **12 baixos** congelados — serão reavaliados após feedback de uso real.
- Build e testes verdes.

---

## Fechamentos desta fase

### Críticos

| # | Item |
|---|------|
| 1 | View Calendário = WeeklyView (mitigado) |
| 2 | Fechar modal cancela pré-agendamento |
| 3 | Filtro "Pendente" não retorna resultados |
| 4 | Botão "Enviar Lembretes" não faz nada |
| 5 | Connect/Disconnect Baileys trocados |
| 6 | ReferenceError em `autoSendPreAgendamento` |
| 7 | WhatsAppQRGlobal não exibe QR code (removido) |

### Médios

| # | Item |
|---|------|
| 1 | Loading do modal |
| 2 | Grade semanal sem filtro de especialidade |
| 3 | Dupla via de lembretes |
| 4 | Token hardcoded em `api.js` |

---

## Arquitetura consolidada

### Lembretes

```
Appointment
     |
     | appointmentId
     v
Reminder (SSOT)
     |
     +--> criação
     +--> listagem
     +--> envio
     +--> status
     +--> histórico
```

Campos legados `appointment.reminderText`, `reminderDate`, `reminderTime`, `reminderDone` removidos da UI. Leitura residual validada: 0 ocorrências em código ativo.

### Comunicação WhatsApp

- `WhatsAppConnectModal` é a interface única de conexão.
- `WhatsAppQRGlobal` removido.
- Envio de lembretes via `sendViaExtension` com fallback Baileys → WhatsApp Web → VPS → Meta API.

---

## Ações paralelas obrigatórias antes de produção

### 🔒 Rotação do token

O token antigo `agenda_export_token_fono_inova_2025_secure_abc123` pode estar no histórico do Git ou em builds anteriores. Considerá-lo potencialmente comprometido.

```bash
git log -S "agenda_export_token_fono_inova_2025_secure_abc123" --all
```

Se encontrar:

1. Revogar token atual no backend.
2. Gerar novo token.
3. Atualizar `VITE_API_TOKEN` nos ambientes.
4. Validar chamadas autenticadas.
5. Avaliar remoção do histórico Git se necessário.

---

## Débitos técnicos registrados

| ID | Descrição | Risco | Decisão |
|----|-----------|-------|---------|
| DT-01 | Envio de lembretes usa snapshot de dados no modelo `Reminder` | Telefone antigo pode ser usado se contato mudar | Aceito por ora; refatorar para endpoint backend em sprint futura. |
| DT-02 | Campos legados `reminderText`, `reminderDate`, `reminderTime`, `reminderDone` ainda existem no schema/model `Appointment` | Código morto; confusão futura | **Não remover antes da produção.** Remoção física do schema e cleanup de banco só após produção estável e confirmação de que nenhuma query depende dos campos. |

---

## Próxima etapa: homologação operacional

1. Criar marco de homologação (`AGENDA-HOMOLOGACAO-v1` ou equivalente).
2. Executar checklist de testes manuais em ambiente de homologação.
3. Colocar a secretária para usar a Agenda por alguns dias.
4. Coletar feedback real (fluxo, percepção, dúvidas).
5. Reavaliar itens baixos com base em evidência de uso.
6. Corrigir apenas bugs encontrados na homologação.

---

## Critério para abrir nova fase de código

Só voltar a modificar código se houver:

- bug encontrado na homologação;
- melhoria operacional comprovada por feedback da secretária;
- regressão identificada.

Evitar refatorações ou melhorias técnicas não solicitadas até que a homologação seja concluída.
