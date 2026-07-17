---
baseline_commit: 71f8513803b3fa236aedd11b05273c7ca4bff86c
---

# Story 11.7: Sino de notificação inclui feedback urgente

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want que o sino do header também conte feedbacks "Preciso de contato" ainda não vistos, somados aos tickets abertos,
so that eu não perca um caso que precisa de retorno.

## Acceptance Criteria

1. Quando existe feedback `channel='urgent'` com `status='open'` ainda não visto, a contagem do sino soma tickets abertos + feedback urgente não visto.
2. Essa soma extra de feedback só aparece pra `role === 'admin'` (manager continua vendo só a contagem de tickets, sem acesso ao canal urgente).
3. Abrir o detalhe de um feedback (Story 11.5) marca ele como "visto", mesmo padrão de `markTicketSeen` em `TicketDetailScreen.tsx`.

[Source: _bmad-output/planning-artifacts/epics.md#Story 11.7; src/hooks/use-open-tickets-badge.ts; src/components/AppLayout.tsx]

## Tasks / Subtasks

- [x] Task 1: Estender `src/hooks/use-open-tickets-badge.ts` com contagem de feedback urgente (AC: 1, 2)
  - [x] `useOpenTicketsBadge(enabled: boolean, role: Role | undefined)` — novo parâmetro `role` (assinatura muda; único call-site é `AppLayout.tsx`, atualizado junto)
  - [x] `markFeedbackSeen`: mesmo padrão de `markTicketSeen` (helper interno `getSeenIds`/`markSeen` compartilhado por chave), chave `localStorage` própria (`hd_seen_feedback`) — contador independente do de tickets
  - [x] No `refresh()`: se `role === 'admin'`, buscar `listFeedback()` e somar `feedback.filter(f => f.channel === 'urgent' && f.status === 'open' && !seenFeedback.has(f.id)).length` à contagem de tickets abertos não vistos
  - [x] Se `role !== 'admin'` (manager), comportamento inalterado — só tickets, sem sequer chamar `listFeedback()`
- [x] Task 2: Atualizar o call-site em `src/components/AppLayout.tsx` (AC: 2)
  - [x] `useOpenTicketsBadge(enabled, session?.role)` no lugar de `useOpenTicketsBadge(enabled)`
- [x] Task 3: Marcar feedback como visto ao abrir o detalhe (AC: 3)
  - [x] `FeedbackDetailScreen.tsx` (Story 11.5): chamar `markFeedbackSeen(feedback.id)` assim que o feedback é encontrado, mesmo ponto onde `TicketDetailScreen.tsx` chama `markTicketSeen`
- [x] Task 4: Validar `npm run build` sem erros

## Dev Notes

- **Reaproveitar o padrão exato de `use-open-tickets-badge.ts`** (poll a cada 30s + refetch no foco da aba, `localStorage` pra "visto", `null` enquanto a 1ª resposta não chega) — não criar um hook novo do zero, estender o existente. O nome do arquivo/hook continua `use-open-tickets-badge`/`useOpenTicketsBadge` mesmo cobrindo feedback agora — é o mesmo conceito de "sino do header", renomear o arquivo geraria um diff maior sem ganho real.
- **Só admin vê a contagem extra de feedback** (AC 2) — isso é reforçado tanto no hook (só busca `listFeedback()` quando `role === 'admin'`) quanto implicitamente pelo `managerFilter` do gateway (manager nem teria acesso aos registros `urgent` mesmo se o hook tentasse). Dupla garantia, sem duplicar a regra de autorização em si.
- Contadores de "visto" pra tickets e feedback são independentes (`hd_seen_tickets` vs `hd_seen_feedback`) — um novo feedback urgente não deve ficar mascarado só porque o usuário já viu todos os tickets, e vice-versa.
- `NotificationBell` em `AppLayout.tsx` já lê `session.role !== 'rep'` pra decidir se mostra o sino — isso não muda; só o valor de `count` passa a incluir feedback quando admin.

### Project Structure Notes

- Arquivos modificados: `src/hooks/use-open-tickets-badge.ts`, `src/components/AppLayout.tsx`, `src/screens/FeedbackDetailScreen.tsx`. Nenhum arquivo novo.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11 — Story 11.7]
- [Source: src/hooks/use-open-tickets-badge.ts] (padrão completo a estender)
- [Source: src/screens/TicketDetailScreen.tsx#68] (`markTicketSeen` — mesmo ponto de chamada a replicar pro feedback)
- [Source: src/components/AppLayout.tsx#23-51] (`NotificationBell`, call-site do hook)

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `npm run build`: passou limpo (tsc strict + vite build).

### Completion Notes List

- `use-open-tickets-badge.ts`: `getSeenTicketIds`/`markSeen` internos generalizados por `storageKey`; `useOpenTicketsBadge` ganhou o parâmetro `role` e, só para `admin`, soma feedback `urgent`/`open` não visto (chave `hd_seen_feedback`, independente de `hd_seen_tickets`). `markFeedbackSeen` exportado no mesmo padrão de `markTicketSeen`.
- `AppLayout.tsx`: call-site atualizado pra `useOpenTicketsBadge(enabled, session?.role)`.
- `FeedbackDetailScreen.tsx`: chama `markFeedbackSeen(found.id)` ao carregar, mesmo ponto de `markTicketSeen` em `TicketDetailScreen.tsx`.
- Nenhuma dependência nova.

### File List

- `src/hooks/use-open-tickets-badge.ts` (modificado — suporte a feedback urgente)
- `src/components/AppLayout.tsx` (modificado — call-site do hook)
- `src/screens/FeedbackDetailScreen.tsx` (modificado — `markFeedbackSeen`)

## Change Log

- 2026-07-16: Implementação inicial da Story 11.7 — sino soma feedback urgente não visto só pra admin. Status → review. Epic 11 completo (Stories 11.1–11.7).
