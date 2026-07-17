---
baseline_commit: 71f8513803b3fa236aedd11b05273c7ca4bff86c
---

# Story 11.3: Rep envia feedback

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a cliente (rep),
I want preencher um formulário com categoria, canal ("Preciso de contato" / "Feedback geral") e mensagem,
so that eu possa relatar minha experiência de atendimento/produto.

## Acceptance Criteria

1. Existe uma tela nova (`src/screens/FeedbackScreen.tsx`, rota `/feedback`) acessível pelo rep.
2. O rep escolhe categoria (Atendimento/Produto/Reclamação/Sugestão), canal e escreve a mensagem; o submit cria um `customer_feedback` via `createFeedback`.
3. Abaixo do form, o rep vê o histórico dos próprios feedbacks enviados (lista simples, com status), ordenado do mais recente pro mais antigo.

[Source: _bmad-output/planning-artifacts/epics.md#Story 11.3; src/screens/TicketNewScreen.tsx — mesmo padrão de formulário]

## Tasks / Subtasks

- [x] Task 1: Adicionar rota `/feedback` em `src/App.tsx` (AC: 1)
  - [x] Dentro do `<Route element={<RequireAuth><AppLayout /></RequireAuth>}>` (mesmo grupo de `/tickets`) — sem `RequireStaff`, porque o rep também acessa
- [x] Task 2: Criar `src/screens/FeedbackScreen.tsx` (AC: 1, 2, 3)
  - [x] `FEEDBACK_CATEGORIES = ['Atendimento', 'Produto', 'Reclamação', 'Sugestão']`
  - [x] `CHANNEL_LABEL = { urgent: 'Preciso de contato', general: 'Feedback geral' }`, `STATUS_LABEL = { open: 'Aberto', read: 'Lido', resolved: 'Resolvido' }` (reaproveitar tokens de cor já existentes: `bg-status-open`/`bg-status-pending`/`bg-status-resolved`, mesmo mapeamento usado em `TicketsScreen.tsx`)
  - [x] Branch `isRep`: form com `Select` de categoria, `Select` de canal (rótulos exatos do `CHANNEL_LABEL` — não usar "Urgente"/"Geral"), `Textarea` de mensagem, botão "Enviar feedback" chamando `createFeedback({ channel, category, message })`
  - [x] Abaixo do form: `listFeedback()` (o gateway já filtra por `owner_id` pro rep — Story 11.2), renderizado como lista simples (categoria, canal, status, data), ordenado por `created_at` desc
  - [x] Branch não-rep (`session?.role !== 'rep'`): `return null` por enquanto — **implementado na Story 11.4**, que segue imediatamente esta no mesmo bloco de trabalho (não é código morto permanente, é o próximo commit da mesma sequência)
- [x] Task 3: Validar `npm run build` (tsc strict + vite build) sem erros

## Dev Notes

- **Não criar 3 componentes de tela separados** (decisão já confirmada pelo usuário no Epic 10): `FeedbackScreen.tsx` é UM componente, com branch condicional por `role`, exatamente como `TicketsScreen.tsx` já faz com `isRep`/`isAdmin`.
- A rota `/feedback` fica dentro do grupo autenticado geral (mesmo grupo de `/tickets`, sem `RequireStaff`), porque tanto rep quanto manager/admin acessam — a diferença é só no conteúdo renderizado.
- **Rótulos de canal são texto fixo, não trocar**: "Preciso de contato" (`urgent`) / "Feedback geral" (`general`) — decisão já confirmada com o usuário (ver epics.md#Epic 11, "Rótulos confirmados"), evita colidir com o conceito de prioridade de ticket que já existe.
- Sem link de menu pro rep ainda (`RepLayout` não tem sidebar) — o rep chega em `/feedback` só por URL direta nesta story. O link de navegação vem na Story 11.6 (2 links no header do `RepLayout`, já confirmado pelo usuário).
- Segue o padrão de formulário de `TicketNewScreen.tsx`: `useToast` pra feedback de erro/sucesso, `useState` local pros campos, sem biblioteca de formulário nova.
- `createFeedback` (de `src/lib/data/feedback.repo.ts`, Story 11.1) e o registro em `local-gateway/src/tables.js` (Story 11.2) já existem — esta story só consome.

### Project Structure Notes

- Novo arquivo: `src/screens/FeedbackScreen.tsx` (permitido por `masi.template.json#editable.allow`, `src/screens/**`).
- Arquivo modificado: `src/App.tsx` (nova rota).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11 — Story 11.3]
- [Source: src/screens/TicketNewScreen.tsx] (padrão de formulário)
- [Source: src/screens/TicketsScreen.tsx#59-70] (padrão de branch por role no mesmo componente)
- [Source: src/lib/data/feedback.repo.ts] (Story 11.1 — API já pronta)

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `npm run build`: passou limpo (tsc strict + vite build).

### Completion Notes List

- Rota `/feedback` adicionada ao grupo autenticado geral em `App.tsx` (sem `RequireStaff`).
- `FeedbackScreen.tsx` criado com a view do rep completa (form + histórico); branch staff retorna `null` por enquanto, a ser preenchido na Story 11.4 (próxima desta mesma sequência).
- Nenhuma dependência nova.

### File List

- `src/App.tsx` (modificado — rota `/feedback`)
- `src/screens/FeedbackScreen.tsx` (novo)

## Change Log

- 2026-07-16: Implementação inicial da Story 11.3 — form de feedback do rep + histórico próprio. Status → review.
