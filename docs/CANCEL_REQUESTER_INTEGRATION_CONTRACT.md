# Contrato — quem solicitou o cancelamento (integrações)

> Cópia do contrato mantido no repo CRM (`back/docs/CANCEL_REQUESTER_INTEGRATION_CONTRACT.md`). Nenhum código da agenda foi alterado.

Atualizado em 2026-10-16. Vale para **Agenda Externa** (repo `agenda`) e **Amanda** (WhatsApp).
Regra de ouro: **nunca inferir o solicitante** pelo token de serviço, pelo texto do motivo ou pelo
status "falta confirmada". Só o canal que *sabe* quem pediu deve informar.

## Campos (corpo do `PATCH /api/v2/appointments/:id/cancel`)

| Campo | Obrigatório? | Valores / formato |
|---|---|---|
| `reason` | sim (motivo livre) | texto |
| `cancelRequester` | **sim para usuários do CRM**; opcional para tokens de serviço (transição) | `patient` · `professional` · `clinic` |
| `cancelRequestedAt` | não | ISO-8601; quando o pedido chegou (não pode estar no futuro) |
| `notifyPatient` | não | `true` enfileira o aviso por WhatsApp **depois** de salvar; qualquer outro valor/ausente = não envia |

Erros: `400 MISSING_CANCEL_REQUESTER`, `400 INVALID_CANCEL_REQUESTER`, `400 INVALID_CANCEL_REQUESTED_AT`.

Resposta inclui `notification`: `{ status: not_requested | queued | already_queued | no_phone | failed, error? }`.
`queued` = **enfileirado**, não entregue. Reenvio sem cancelar de novo:
`POST /api/v2/appointments/:id/cancel/notify-patient` (idempotente por cancelamento).

## Caminhos conhecidos e situação atual

| Caminho | Quem chama | Envia `cancelRequester`? | O que acontece hoje |
|---|---|---|---|
| CRM (calendário, financeiro, liminar, convênio, pacotes) | usuários logados | **sim, obrigatório** | grava solicitante |
| `PATCH /v2/appointments/:id/cancel` — Agenda Externa (`agenda/src/api/v2/agendaV2Client.js::cancelAppointment`) | token `agenda-service` | **não** | cancela; fica "Não informado" com `cancelChannel='agenda_service'` |
| `POST /import-from-agenda/agenda-externa/cancel` (sync legado) | agenda externa | **não** | idem; aceita `cancelRequester`/`cancelRequestedAt` opcionais (validados) |
| Amanda (WhatsApp) | — | — | **não há caminho que cancele agendamento hoje** (o `wantsCancel` é só detecção de intenção; o único `canceled` no orquestrador é de *Followup*, outro domínio) |
| Telas antigas do CRM abertas durante o deploy | usuários | não | aceito até **30/11/2026** (`legacyGraceUntil` em `domain/appointment/cancelRequester.js`) como `cancelChannel='legacy_client'`; depois disso volta a 400 |

Todos os "Não informado" aparecem no relatório (aba *Sem identificação*), com o canal de origem.

## O que cada integração precisa fazer

### Agenda Externa
1. No `CancelReasonModal`, perguntar **"Quem solicitou?"** (3 opções, sem padrão) além do motivo.
2. Enviar `cancelRequester` (e `cancelRequestedAt` se a secretária informar) em `cancelAppointment(...)`.
3. Não enviar `notifyPatient: true` sem checkbox visível ao usuário (hoje envia sempre `false`).
4. Depois que a agenda enviar o campo, o backend poderá passar a exigi-lo também para `agenda-service`
   (remover `required: !req.user?.isService` em `routes/appointment.v2.js`).

### Amanda
- Se um dia cancelar agendamento a pedido do paciente no WhatsApp, enviar `cancelRequester: 'patient'`
  **somente** quando a mensagem do paciente for o pedido explícito; usar `cancelRequestedAt` = hora da mensagem.
- Pedido de cancelamento vindo do profissional/clínica não deve ser deduzido pela conversa — encaminhar à secretária.

## Aviso por WhatsApp
- Texto montado no backend (`cancellationNotification.service.js`); **não inclui `cancelReason`** (campo livre, pode ser
  anotação interna). Telefone: `Patient.phone`; sem telefone válido → `no_phone`.
- Dedup: reivindicação atômica no Appointment + `jobId` determinístico (`cancel-notify-<id>-<canceledAt>`);
  reativar o agendamento limpa o estado do aviso.
