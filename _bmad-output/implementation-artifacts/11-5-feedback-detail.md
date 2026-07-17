---
baseline_commit: 71f8513803b3fa236aedd11b05273c7ca4bff86c
---

# Story 11.5: Detalhe do feedback com WhatsApp e status

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin (canal urgente) ou manager (canal geral),
I want abrir o detalhe de um feedback, ver a mensagem completa, marcar como lido/resolvido, e abrir o WhatsApp do cliente se precisar,
so that eu dê andamento ao caso.

## Acceptance Criteria

1. Rota `/feedback/:id`, restrita a staff (`RequireStaff` — rep não tem detalhe individual, só a lista do próprio histórico na 11.3).
2. A tela carrega e mostra a mensagem completa, categoria, canal, status.
3. Botão "Abrir conversa no WhatsApp" reaproveita a lógica de `buildWhatsAppLink` (`src/utils/whatsapp.ts`), resolvendo o telefone do cliente pelo `owner_id` do feedback (list-then-find em `customers`, mesmo padrão de `TicketDetailScreen.tsx`).
4. Há ação pra marcar status (lido/resolvido) via `updateFeedback`.

[Source: _bmad-output/planning-artifacts/epics.md#Story 11.5; src/screens/TicketDetailScreen.tsx; src/utils/whatsapp.ts]

## Tasks / Subtasks

- [x] Task 1: Adicionar rota `/feedback/:id` em `src/App.tsx`, atrás de `RequireStaff` (AC: 1)
- [x] Task 2: Estender `src/utils/whatsapp.ts` com uma variante pra feedback, sem duplicar a lógica de URL (AC: 3)
  - [x] Extrair um helper interno `buildWhatsAppUrl(phone, text)` (limpeza de dígitos + montagem da URL `wa.me`), reaproveitado tanto por `buildWhatsAppLink` (tickets, comportamento inalterado) quanto pela nova função
  - [x] `export function buildFeedbackWhatsAppLink(customer, feedback: Pick<Feedback, 'category' | 'message'>): string | null` — mesma regra de `null` quando não há telefone
- [x] Task 3: Criar `src/screens/FeedbackDetailScreen.tsx` (AC: 2, 3, 4)
  - [x] `useParams<{ id: string }>()` + list-then-find: `listFeedback()` + `listCustomers()`, encontra o feedback por `id`, resolve o cliente por `customers.find(c => c.owner_id === feedback.owner_id)` (mesmo padrão da Story 11.4, não por `customer_id`)
  - [x] Mostra categoria, canal (badge `CHANNEL_LABEL`), status (badge `STATUS_TONE`), mensagem completa
  - [x] Botão WhatsApp com `buildFeedbackWhatsAppLink`, só aparece se o link não for `null` (mesmo padrão condicional de `TicketDetailScreen.tsx`)
  - [x] Ações de status: "Marcar como lido" (visível quando `status === 'open'`) e "Marcar como resolvido" (visível quando `status !== 'resolved'`) via `updateFeedback(id, { status })`, recarrega após sucesso
- [x] Task 4: Registrar a rota em `src/App.tsx` e validar `npm run build`

## Dev Notes

- **Reaproveitar, não reinventar** (AC 3 é explícito nisso): `buildWhatsAppLink` já existe e funciona pra tickets — a Task 2 extrai só a parte comum (limpar dígitos + montar `https://wa.me/...`) num helper interno, sem mudar a assinatura nem o comportamento de `buildWhatsAppLink` (regressão zero pro `TicketDetailScreen.tsx`).
- Resolução de cliente por `owner_id` (não `customer_id`) — mesmo padrão já estabelecido na Story 11.4. Reaproveitar o mesmo raciocínio: `customer_feedback.owner_id` é o `user.id` do rep, igual a `customers.owner_id`.
- `RequireStaff` já existe em `src/lib/auth.tsx:75-83` — usar exatamente esse guard, sem criar um novo.
- Botões de "marcar como lido/resolvido": mesmo padrão visual/interação de "Atender"/"Concluir" em `TicketDetailScreen.tsx` (`Button variant="outline" size="sm"`, `disabled` durante o request, `toast` de sucesso/erro, recarrega os dados).
- Ambos os papéis que acessam esta tela (manager/admin) usam os mesmos botões — a diferença de o que cada um *vê na lista* já foi resolvida no gateway (Story 11.2); aqui não há lógica adicional de role.

### Project Structure Notes

- Novo arquivo: `src/screens/FeedbackDetailScreen.tsx`.
- Arquivos modificados: `src/App.tsx` (rota), `src/utils/whatsapp.ts` (novo export, refactor interno).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11 — Story 11.5]
- [Source: src/screens/TicketDetailScreen.tsx] (padrão de detalhe + ações de status + botão WhatsApp condicional)
- [Source: src/utils/whatsapp.ts] (lógica a reaproveitar)
- [Source: src/lib/auth.tsx#75-83] (`RequireStaff`)

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `npm run build`: passou limpo (tsc strict + vite build).

### Completion Notes List

- `whatsapp.ts` refatorado: extraído `buildWhatsAppUrl` interno (limpeza de dígitos + montagem `wa.me`), reaproveitado por `buildWhatsAppLink` (comportamento inalterado, sem regressão pra `TicketDetailScreen.tsx`) e pela nova `buildFeedbackWhatsAppLink`.
- `FeedbackDetailScreen.tsx` criado: list-then-find em `listFeedback()`/`listCustomers()`, resolução do cliente por `owner_id` (mesmo padrão da 11.4), botão WhatsApp condicional, ações "Marcar como lido"/"Marcar como resolvido" via `updateFeedback`.
- Rota `/feedback/:id` adicionada em `App.tsx`, atrás de `RequireStaff`.
- Nenhuma dependência nova.

### File List

- `src/App.tsx` (modificado — rota `/feedback/:id`)
- `src/utils/whatsapp.ts` (modificado — `buildWhatsAppUrl` extraído, `buildFeedbackWhatsAppLink` novo)
- `src/screens/FeedbackDetailScreen.tsx` (novo)

## Change Log

- 2026-07-16: Implementação inicial da Story 11.5 — detalhe do feedback com WhatsApp e ações de status. Status → review.
