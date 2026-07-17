---
baseline_commit: 71f8513803b3fa236aedd11b05273c7ca4bff86c
---

# Story 11.1: Schema e repositório de feedback

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a desenvolvedor,
I want criar a tabela `customer_feedback` em `NeonDB/setup.sql` e o repositório `src/lib/data/feedback.repo.ts`, seguindo o mesmo padrão de `tickets.repo.ts`,
so that as telas de feedback (Stories 11.3–11.5) tenham uma API de dados pronta para ler/escrever.

## Acceptance Criteria

1. `customer_feedback` existe em `NeonDB/setup.sql` com: `id uuid primary key default gen_random_uuid()`, `owner_id text not null references "user"(id) on delete cascade`, `channel text not null check (channel in ('urgent','general'))`, `category text`, `message text not null`, `status text not null default 'open' check (status in ('open','read','resolved'))`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.
2. `src/lib/data/types.gen.ts` ganha os tipos `FeedbackChannel`, `FeedbackStatus` e o `Row` de `customer_feedback` (mesmo padrão usado para `TicketStatus`/`TicketPriority`/`tickets`).
3. `src/lib/data/feedback.repo.ts` expõe `listFeedback`, `createFeedback`, `updateFeedback`, no mesmo formato de `tickets.repo.ts` (usa `db.table<Feedback>('customer_feedback')`, nunca envia `owner_id` no `create`/`update`).

[Source: _bmad-output/planning-artifacts/epics.md#Story 11.1; NeonDB/setup.sql; src/lib/data/tickets.repo.ts]

## Tasks / Subtasks

- [x] Task 1: Adicionar `customer_feedback` em `NeonDB/setup.sql` (AC: 1)
  - [x] Adicionar bloco `-- ============ CUSTOMER FEEDBACK ============` seguindo a formatação existente (comentário explicando owner_id/propósito, igual aos blocos de `customers`/`tickets`/`ticket_notes`)
  - [x] `create table if not exists customer_feedback (...)` com as colunas/constraints do AC 1
  - [x] `create index if not exists idx_customer_feedback_owner on customer_feedback(owner_id)`
  - [x] `create index if not exists idx_customer_feedback_channel on customer_feedback(channel)` (vai ser usado pelo `managerFilter` da Story 11.2)
  - [x] Trigger `updated_at`: `drop trigger if exists t_customer_feedback_updated on customer_feedback;` + `create trigger ... execute function touch_updated_at();` (reusar a função `touch_updated_at()` já existente — não recriar)
- [x] Task 2: Atualizar `src/lib/data/types.gen.ts` (AC: 2)
  - [x] `export type FeedbackChannel = 'urgent' | 'general';`
  - [x] `export type FeedbackStatus = 'open' | 'read' | 'resolved';`
  - [x] Adicionar `customer_feedback.Row` em `Database['public']['Tables']` com os mesmos campos do AC 1 (tipados: `id: string`, `owner_id: string`, `channel: FeedbackChannel`, `category: string | null`, `message: string`, `status: FeedbackStatus`, `created_at: string`, `updated_at: string`)
  - [x] Atualizar o comentário de cabeçalho do arquivo citando a migration que introduziu a tabela (mesmo padrão da linha 1-3 atual)
- [x] Task 3: Criar `src/lib/data/feedback.repo.ts` (AC: 3)
  - [x] `export type Feedback = Database['public']['Tables']['customer_feedback']['Row'];`
  - [x] `listFeedback = () => db.table<Feedback>('customer_feedback').list()`
  - [x] `createFeedback = (input: { channel: FeedbackChannel; category?: string | null; message: string }) => db.table<Feedback>('customer_feedback').create(input)`
  - [x] `updateFeedback = (id: string, patch: Partial<Pick<Feedback, 'status'>>) => db.table<Feedback>('customer_feedback').update(id, patch)`
- [x] Task 4: Validar
  - [x] `npm run build` (tsc strict + vite build) passa sem erros/imports não usados
  - [x] Rodar `NeonDB/setup.sql` contra o Postgres local (`docker compose up`) e confirmar que roda 2x seguidas sem erro (idempotência do `if not exists`/`drop trigger if exists`) — **concluído nesta sessão**: com o Docker Desktop ativo, o script foi aplicado 2x seguidas via `docker exec -i helpdesk-masia-db-1 psql -U helpdesk -d helpdesk < NeonDB/setup.sql` contra o container `helpdesk-masia-db-1` (postgres:16-alpine). 1ª execução criou `customer_feedback` (tabela nova); 2ª execução não gerou nenhum erro, apenas os avisos esperados (`already exists, skipping`) para tabela, índices e trigger. `\d customer_feedback` confirmado batendo 100% com o AC 1 (colunas, tipos, defaults, checks de `channel`/`status`, FK de `owner_id` com `on delete cascade`, trigger `t_customer_feedback_updated`).

## Dev Notes

- **Este é o primeiro bloco (fluxo de dados) de uma sequência de 2**: Story 11.1 (este arquivo, schema+repo) roda antes da Story 11.2 (visibilidade em 3 níveis no gateway — `managerFilter` em `local-gateway/src/tables.js`). **Não mexer em `local-gateway/src/tables.js`/`data.js` nesta story** — isso é escopo exclusivo da 11.2, que só faz sentido depois que a tabela/repo existirem.
- `feedback.repo.ts` vai chamar `db.table('customer_feedback')`, mas a tabela só vai responder de verdade (create/list/update via API) depois que `local-gateway/src/tables.js` registrar `customer_feedback` na Story 11.2. Isso é esperado — o repo é só a camada de API, o registro no gateway é a próxima story.
- **Padrão de repo fino já estabelecido** (não inventar um novo padrão): olhe `src/lib/data/tickets.repo.ts` — `db.table<T>('<tabela>').list()/.create()/.update()/.remove()`. Nenhum repo manda `owner_id` no payload (o gateway seta pela sessão — ver `local-gateway/src/data.js:55-58`). Siga exatamente esse formato.
- `src/lib/data/types.gen.ts` está listado em `masi.template.json#editable.protect` (não editável pelo editor de IA do hub), mas o comentário de cabeçalho do próprio arquivo diz "não editar à mão fora de uma migration nova" — como esta story É uma migration nova (Task 1), editá-lo aqui é o uso correto e esperado.
- `src/lib/data/client.ts` (o `db.table()`) é protegido e não deve ser tocado — já dá suporte genérico a qualquer tabela nova, nenhuma mudança necessária nele.
- Sem tabela de teste automatizado hoje para os repos (`tickets.repo.ts`/`customers.repo.ts`/`ticket_notes.repo.ts` não têm `.test.ts` — são wrappers finos considerados triviais o suficiente pra não precisar de teste unitário dedicado). Siga o mesmo padrão: não é necessário criar teste automatizado para `feedback.repo.ts`; a validação real acontece via `npm run build` (Task 4) e, na Story 11.2, via curl ponta a ponta contra o Docker local.

### Project Structure Notes

- Novo arquivo: `src/lib/data/feedback.repo.ts` (mesmo diretório dos outros `*.repo.ts`, permitido por `masi.template.json#editable.allow`).
- Arquivo modificado: `src/lib/data/types.gen.ts` (protegido do editor de IA, mas editável por dev humano/agente ao criar migration nova).
- Arquivo modificado: `NeonDB/setup.sql` (fonte única de schema do projeto — não existe mais `supabase/migrations/**`, foi substituído neste projeto pelo script único do Neon; ignorar qualquer referência a `supabase/migrations` em `masi.template.json`, está desatualizada e fora do escopo desta story).
- Nenhum diretório novo necessário — sem variância da estrutura unificada.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11 — Story 11.1, 11.2] (contexto completo do épico e a próxima story)
- [Source: NeonDB/setup.sql] (padrão de tabela/índice/trigger a replicar)
- [Source: src/lib/data/tickets.repo.ts] (padrão de repo fino a replicar)
- [Source: src/lib/data/types.gen.ts] (padrão de tipos gerados a replicar)
- [Source: masi.template.json#editable] (arquivos protegidos vs. editáveis)

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `npm run build` (tsc strict `noUnusedLocals` + `vite build`): passou limpo, sem erros/imports órfãos.
- `docker exec -i helpdesk-masia-db-1 psql -U helpdesk -d helpdesk < NeonDB/setup.sql` (2x seguidas): 1ª criou `customer_feedback`, 2ª idempotente sem erros.

### Completion Notes List

- `customer_feedback` adicionada a `NeonDB/setup.sql` seguindo exatamente o padrão idempotente já usado por `customers`/`tickets`/`ticket_notes` (create table/index `if not exists`, trigger `updated_at` via `drop trigger if exists` + `create trigger`, reaproveitando a função `touch_updated_at()` existente — nenhuma função nova criada).
- `types.gen.ts` ganhou `FeedbackChannel`, `FeedbackStatus` e o `Row` de `customer_feedback`.
- `feedback.repo.ts` criado espelhando o formato de `tickets.repo.ts`/`ticket_notes.repo.ts` — `listFeedback`/`createFeedback`/`updateFeedback` via `db.table('customer_feedback')`, sem enviar `owner_id` (setado pelo gateway).
- Nenhuma dependência nova adicionada.
- Idempotência do `NeonDB/setup.sql` validada formalmente nesta sessão (Docker disponível): 2 execuções seguidas contra `helpdesk-masia-db-1`, sem erros na 2ª rodada. Estrutura da tabela conferida via `\d customer_feedback` e bate 100% com o AC 1. O repo/tabela ainda não respondem via API do gateway — isso depende do registro em `local-gateway/src/tables.js`, escopo da Story 11.2 (próxima).

### File List

- `NeonDB/setup.sql` (modificado — tabela, índices e trigger de `customer_feedback`)
- `src/lib/data/types.gen.ts` (modificado — tipos `FeedbackChannel`/`FeedbackStatus` e `Row` de `customer_feedback`)
- `src/lib/data/feedback.repo.ts` (novo — repositório fino de feedback)

## Change Log

- 2026-07-16: Implementação inicial da Story 11.1 — schema `customer_feedback` + `feedback.repo.ts`. Status → review.
- 2026-07-16: Docker disponível nesta sessão — idempotência do `NeonDB/setup.sql` validada formalmente (2 execuções seguidas, sem erros). Última subtask pendente da Task 4 concluída. Story 11.1 100% completa.
