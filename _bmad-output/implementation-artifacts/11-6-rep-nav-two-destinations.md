---
baseline_commit: 71f8513803b3fa236aedd11b05273c7ca4bff86c
---

# Story 11.6: Navegação do rep com 2 destinos

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a cliente (rep),
I want conseguir alternar entre "Meus Chamados" e "Feedback" sem uma sidebar completa,
so that eu mantenha a experiência enxuta que já foi construída (Story 10.1).

## Acceptance Criteria

1. O header do `RepLayout` (`src/components/AppLayout.tsx`) ganha dois links de navegação simples — **não** a `Sidebar`/`SidebarProvider` completa que foi removida na Story 10.1.
2. Os dois links levam a `/tickets` ("Meus Chamados") e `/feedback` ("Feedback"), com destaque visual pro destino ativo.
3. Abordagem confirmada com o usuário antes da implementação (feita nesta sessão, ver Change Log).

[Source: _bmad-output/planning-artifacts/epics.md#Story 11.6; src/components/AppLayout.tsx]

## Tasks / Subtasks

- [x] Task 1: Adicionar 2 links de navegação no header do `RepLayout` (AC: 1, 2)
  - [x] Reaproveitar `NavLink` (`@/components/NavLink`, já usado em `AppSidebarContent`) pra herdar o mesmo mecanismo de "ativo" sem reimplementar
  - [x] Links: "Meus Chamados" (`/tickets`) e "Feedback" (`/feedback`)
  - [x] Posicionar entre o logo "HelpDesk" e o bloco de avatar/logout, mantendo o header em uma linha (sem quebrar em telas pequenas — mesmo tratamento responsivo já usado em `StaffLayout`)
- [x] Task 2: Validar `npm run build` sem erros

## Dev Notes

- **Decisão já tomada, não é mais um ponto em aberto**: o usuário confirmou nesta sessão a abordagem de 2 links simples no header (não a sidebar completa). Não reabrir essa discussão.
- `NavLink` (componente do projeto, não o `NavLink` do react-router — checar import) já encapsula a lógica de classe ativa usada em `AppSidebarContent` (`activeClassName="bg-sidebar-primary text-white font-semibold"`) — usar o mesmo componente aqui evita reimplementar `useLocation`/comparação de path.
- `RepLayout` continua sem `Sidebar`/`SidebarProvider` — só o `<header>` ganha os 2 links. Nenhuma mudança em `StaffLayout` (manager/admin continuam com a sidebar completa, sem alteração).

### Project Structure Notes

- Arquivo modificado: `src/components/AppLayout.tsx` (função `RepLayout`). Nenhum arquivo novo.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11 — Story 11.6]
- [Source: src/components/AppLayout.tsx#127-162] (`RepLayout` atual, sem navegação)
- [Source: src/components/AppLayout.tsx#78-90] (uso de `NavLink` em `AppSidebarContent`, padrão a reaproveitar)

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `npm run build`: passou limpo (tsc strict + vite build).

### Completion Notes List

- `RepLayout` ganhou uma `<nav>` no header com 2 `NavLink` ("Meus Chamados" → `/tickets`, "Feedback" → `/feedback`), reaproveitando o componente `NavLink` já usado em `AppSidebarContent`. Nenhuma sidebar reintroduzida.
- Nenhuma dependência nova.

### File List

- `src/components/AppLayout.tsx` (modificado — `RepLayout`)

## Change Log

- 2026-07-16: Implementação inicial da Story 11.6 — 2 links de navegação no header do rep. Abordagem confirmada com o usuário antes de codar. Status → review.
