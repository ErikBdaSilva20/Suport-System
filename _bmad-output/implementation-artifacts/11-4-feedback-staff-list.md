---
baseline_commit: 71f8513803b3fa236aedd11b05273c7ca4bff86c
---

# Story 11.4: Manager/admin veem a lista de feedbacks

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager ou admin,
I want uma tela `/feedback` listando os feedbacks recebidos, filtrados pelo canal que meu papel permite ver,
so that eu acompanhe reclamações/sugestões/atendimento.

## Acceptance Criteria

1. Rota `/feedback` (já existe, Story 11.3) ganha um item de nav "Feedbacks" em `src/lib/nav-items.ts`, visível pra manager/admin.
2. A tela carrega e mostra a lista com categoria, canal (badge), status (badge), cliente e data.
3. Manager só vê `channel='general'` (o gateway já filtra — Story 11.2); admin vê tudo. Nenhum filtro adicional necessário no front.
4. Clicar numa linha navega pra `/feedback/:id` (rota da Story 11.5).

[Source: _bmad-output/planning-artifacts/epics.md#Story 11.4; src/screens/TicketsScreen.tsx — mesmo padrão de tabela/lista]

## Tasks / Subtasks

- [x] Task 1: Adicionar item de nav "Feedbacks" em `src/lib/nav-items.ts` (AC: 1)
  - [x] Novo item em `STAFF_NAV_ITEMS`, sem `adminOnly` (visível pra manager + admin, mesmo padrão de "Tickets"/"Dashboard")
  - [x] Ícone `MessageSquare` (lucide-react) ou similar, sem introduzir lib nova
- [x] Task 2: Estender `FeedbackScreen.tsx` com a view de staff (AC: 2, 3, 4)
  - [x] Substituir o `return null` do branch não-rep por uma `StaffFeedbackView`
  - [x] `listFeedback()` + `listCustomers()` (mesmo padrão `Promise.allSettled` de `useTicketsAndCustomers`)
  - [x] Resolver "cliente" via `Map` `owner_id → Customer` (o `owner_id` do feedback é o `user.id` do rep — **não** `customer_id`, diferente de como `tickets` resolve; `customers.owner_id` é o mesmo `user.id`, então o match é por `owner_id`, não por `id`)
  - [x] Tabela: categoria, canal (`Badge`, rótulo de `CHANNEL_LABEL`), status (`Badge`, `STATUS_TONE`), cliente (nome resolvido), data — mesmo componente `Table` de `TicketsScreen.tsx`
  - [x] `onClick` na linha → `navigate('/feedback/:id')`
  - [x] Sem filtro de canal no front — o gateway já entrega só o que cada papel deve ver (Story 11.2); não duplicar a regra de autorização na UI
- [x] Task 3: Validar `npm run build` sem erros

## Dev Notes

- **Continuação direta da Story 11.3**: `FeedbackScreen.tsx` já existe com a view do rep; esta story só adiciona o branch staff no mesmo arquivo (mesmo padrão de `TicketsScreen.tsx`, um componente por tela, branch por `role`).
- **Não duplicar a regra de visibilidade no front**: o AC 3 já é garantido pelo `managerFilter` do gateway (Story 11.2) — a UI só renderiza o que `listFeedback()` devolve, sem `filter(channel === ...)` adicional. Se o front filtrasse de novo, mascararia um bug de autorização no gateway em vez de expor.
- **Resolução de cliente é por `owner_id`, não por `customer_id`**: diferente de `tickets.customer_id → customers.id` (list-then-find direto), aqui é `customer_feedback.owner_id → customers.owner_id` (ambos apontam pro mesmo `user.id` do rep). Ver Dev Notes da Story 11.5 pro mesmo padrão reaproveitado no detalhe.
- Reaproveitar `CHANNEL_LABEL`/`STATUS_LABEL`/`STATUS_TONE` já exportados de `FeedbackScreen.tsx` (Story 11.3) — não redefinir.

### Project Structure Notes

- Arquivos modificados: `src/lib/nav-items.ts`, `src/screens/FeedbackScreen.tsx`. Nenhum arquivo novo.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11 — Story 11.4]
- [Source: src/screens/TicketsScreen.tsx] (padrão de tabela + list-then-find)
- [Source: src/lib/nav-items.ts] (padrão de item de nav)
- [Source: src/screens/FeedbackScreen.tsx] (Story 11.3 — base a estender)

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `npm run build`: passou limpo (tsc strict + vite build).

### Completion Notes List

- Item "Feedbacks" adicionado a `STAFF_NAV_ITEMS` (sem `adminOnly` — visível pra manager+admin).
- `FeedbackScreen.tsx`: branch staff (`StaffFeedbackView`) substitui o `return null` da Story 11.3 — lista feedbacks + clientes em paralelo (`Promise.allSettled`), resolve nome do cliente via `Map` `owner_id → Customer`, sem filtro de canal extra no front (confia no `managerFilter` do gateway).
- Linha da tabela navega para `/feedback/:id` (rota criada na Story 11.5, ainda não existe até lá — clique antes disso resultaria em 404 pela `NotFoundScreen`, comportamento aceitável entre stories da mesma sequência).
- Nenhuma dependência nova.

### File List

- `src/lib/nav-items.ts` (modificado — item "Feedbacks")
- `src/screens/FeedbackScreen.tsx` (modificado — `StaffFeedbackView`)

## Change Log

- 2026-07-16: Implementação inicial da Story 11.4 — lista de feedbacks pra manager/admin. Status → review.
