---
baseline_commit: 71f8513803b3fa236aedd11b05273c7ca4bff86c
---

# Story 11.2: Visibilidade em 3 níveis no gateway

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a desenvolvedor,
I want estender `local-gateway/src/tables.js`/`data.js` com um filtro declarativo adicional por tabela pro papel `manager` (`managerFilter`),
so that `customer_feedback` tenha 3 níveis de visibilidade (rep só o próprio; manager só `channel='general'`; admin tudo) sem hardcodar a tabela no motor genérico.

## Acceptance Criteria

1. `tables.js` ganha `customer_feedback: { columns: ['channel', 'category', 'message', 'status'], hasOwner: true, managerFilter: "channel = 'general'", writeRoles: { update: ['admin', 'manager'] } }`.
2. `GET /data/customer_feedback` como `manager` retorna só linhas com `channel='general'`.
3. `GET /data/customer_feedback` como `admin` retorna todas as linhas (`urgent` + `general`); como `rep` retorna só as próprias (`owner_id`) — comportamento herdado do filtro `owner_id` já existente, sem regressão.
4. `PATCH /data/customer_feedback/:id` (mudar `status`): `admin`/`manager` conseguem (200); `rep` recebe `403` mesmo no próprio registro (só quem atende marca lido/resolvido — ver Story 11.5).
5. Verificado ponta a ponta via curl contra o Docker local: criar 1 registro `urgent` e 1 `general` (como rep), logar como cada papel (rep/manager/admin) e conferir exatamente o que cada um vê em `GET /data/customer_feedback`, e o resultado de `PATCH` para cada papel.

[Source: _bmad-output/planning-artifacts/epics.md#Story 11.2 e #Decisão arquitetural (motor genérico do gateway); local-gateway/src/data.js; local-gateway/src/tables.js]

## Tasks / Subtasks

- [x] Task 1: Registrar `customer_feedback` em `local-gateway/src/tables.js` (AC: 1)
  - [x] Adicionar a entrada exata do AC 1, seguindo o comentário de cabeçalho do arquivo ("writeRoles é por operação... operação ausente = sem trava de role")
- [x] Task 2: Implementar `managerFilter` em `local-gateway/src/data.js` (AC: 2, 3)
  - [x] No handler `GET /:table` (linhas ~27-42): quando `table.hasOwner && !isElevated(role)` → filtro `owner_id` (já existe, não alterar)
  - [x] Novo `else if (req.user.role === 'manager' && table.managerFilter)` → `query += \` where ${table.managerFilter}\`` (fragmento SQL cru da config — a tabela é interna/confiável, não input de usuário)
  - [x] `admin` cai em nenhum dos dois ramos → `select *` sem filtro, como já acontece hoje para as outras tabelas
- [x] Task 3: Validar que `writeRoles.update` bloqueia `rep` mesmo no próprio registro (AC: 4)
  - [x] Conferido: em `PATCH /:table/:id`, a checagem de ownership passa pro rep (é dono), mas `isRoleAllowed(table, 'update', 'rep')` retorna `false` (rep não está em `['admin','manager']`) → 403. Nenhuma mudança de código necessária — o mecanismo já existente (Story 10.4) cobre este AC.
- [x] Task 4: Verificação ponta a ponta via curl (AC: 5)
  - [x] `node --check` em `tables.js`/`data.js` — sintaxe válida
  - [x] Subir Docker local e rodar o roteiro curl completo (criar urgent/general como rep; GET como manager/admin/rep; PATCH como cada papel) — **concluído nesta sessão**: Docker Desktop ativo, `npm run docker:up` (rebuild da imagem do gateway pra pegar `tables.js`/`data.js` atuais) + roteiro curl completo, ver Debug Log/Completion Notes.
  - [x] Documentar os comandos curl e resultados no Dev Agent Record → Completion Notes (mesmo padrão usado nas Stories 10.x)

## Dev Notes

- **Segundo bloco (fluxo de dados) da sequência**: depende da Story 11.1 (tabela `customer_feedback` + `feedback.repo.ts`) já estar mergeada — sem a tabela existir no banco, o `GET`/`PATCH` desta story não tem o que consultar.
- **Não é uma reescrita do motor genérico** — é uma extensão declarativa mínima. Não introduzir um sistema de permissões genérico/configurável além do que o AC pede (`managerFilter` como string SQL simples). Ver o princípio já usado para `writeRoles` (Story 10.4, commit `c3de24d`): campo declarativo por tabela, consumido no motor genérico, zero `if (tableName === 'customer_feedback')` espalhado pelo código.
- `managerFilter` é uma string SQL fixa vinda de `tables.js` (não de input do usuário) — sem risco de SQL injection, mesmo padrão de confiança já usado para `columnList`/`setClause` no restante de `data.js`.
- `isElevated(role)` (linha 5 de `data.js`) continua igual — retorna `true` pra `admin`/`manager` — usada nos handlers `PATCH`/`DELETE` pra decidir se o usuário pode mexer em registro de outro dono. A distinção fina manager-vs-admin só entra no `GET`, via `managerFilter`.
- **Sem teste automatizado para `local-gateway`** (não há framework de teste configurado no pacote — verificado: nenhum `*.test.js` fora de `node_modules`). A verificação é manual via curl contra o Docker local, exatamente como nas Stories 10.x — não introduzir Jest/Vitest só para esta story.
- Depois desta story, `src/lib/data/feedback.repo.ts` (criado na 11.1) passa a funcionar de ponta a ponta (list/create/update reais via API) — mas nenhuma tela ainda o consome (isso é o bloco de front, Stories 11.3–11.5).

### Project Structure Notes

- Arquivos modificados: `local-gateway/src/tables.js`, `local-gateway/src/data.js`. Nenhum arquivo novo.
- Sem variância da estrutura unificada — mesmo padrão dos dois arquivos já usado pelas tabelas existentes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 11 — Story 11.2 e Decisão arquitetural] (especificação completa do `managerFilter`)
- [Source: local-gateway/src/data.js#27-42] (handler `GET /:table` a estender)
- [Source: local-gateway/src/data.js#80-92] (handler `PATCH /:table/:id`, já cobre AC 4 sem mudança)
- [Source: local-gateway/src/tables.js] (padrão de config declarativa por tabela)
- Git intelligence: commit `c3de24d` ("feat: fecha Epic 10...") introduziu `writeRoles` por-operação e documenta o padrão de teste ponta-a-ponta via curl (create 201, update/delete 403 pra manager) — replicar o mesmo estilo de verificação aqui.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `node --check local-gateway/src/tables.js` / `node --check local-gateway/src/data.js`: sintaxe válida.
- Roteiro curl end-to-end (Docker local, `npm run docker:up` rebuild + `localhost:8787`), usuários de `doc/INFOS/LOGINS-TESTE-LOCAL.md`:
  - `POST /api/auth/sign-in/email` (rep/manager/admin) → `204` os 3.
  - `POST /data/customer_feedback` como rep: `{channel:'urgent',message:'...'}` → `201`; `{channel:'general',message:'...'}` → `201`.
  - `GET /data/customer_feedback` como **manager** → array com 1 item, `channel:'general'` (confirma AC 2).
  - `GET /data/customer_feedback` como **admin** → array com 2 itens (`general`+`urgent`) (confirma AC 3, admin vê tudo).
  - `GET /data/customer_feedback` como **rep** → array com os mesmos 2 itens (são os próprios registros dele) (confirma AC 3, sem regressão do filtro `owner_id`).
  - `PATCH /data/customer_feedback/:id` (registro `urgent`) como **manager**: `{status:'read'}` → `200`.
  - `PATCH /data/customer_feedback/:id` (mesmo registro) como **admin**: `{status:'resolved'}` → `200`.
  - `PATCH /data/customer_feedback/:id` (mesmo registro, dono) como **rep**: `{status:'open'}` → `403 "Sem permissão para editar esta tabela."` (confirma AC 4).

### Completion Notes List

- `customer_feedback` registrada em `tables.js` com `managerFilter: "channel = 'general'"` e `writeRoles.update: ['admin','manager']`, seguindo o mesmo padrão declarativo já usado para `writeRoles` (Story 10.4) — nenhum `if (tableName === 'customer_feedback')` hardcoded no motor genérico.
- `data.js`: handler `GET /:table` ganhou o ramo `else if (role === 'manager' && table.managerFilter)`; `owner_id` (rep) e ausência total de filtro (admin) continuam exatamente como antes — sem regressão para `customers`/`tickets`/`ticket_notes` (nenhuma dessas tabelas define `managerFilter`, então o novo ramo nunca dispara para elas).
- AC 4 (bloqueio de `PATCH` pro rep) já era coberto pelo mecanismo `writeRoles`/`isRoleAllowed` introduzido na Story 10.4 — confirmado por leitura de código, sem necessidade de alterar `data.js` além do Task 2.
- AC 5 verificado formalmente nesta sessão (Docker disponível): roteiro curl completo executado contra `helpdesk-masia-gateway-1` (rebuildado via `npm run docker:up` pra pegar o código atual de `tables.js`/`data.js`) e `helpdesk-masia-db-1`. Todos os 5 ACs bateram exatamente com o esperado — ver Debug Log para os comandos e respostas.
- Nenhuma dependência nova adicionada.

### File List

- `local-gateway/src/tables.js` (modificado — entrada `customer_feedback`)
- `local-gateway/src/data.js` (modificado — ramo `managerFilter` no `GET /:table`)

## Change Log

- 2026-07-16: Implementação inicial da Story 11.2 — `managerFilter` declarativo + registro de `customer_feedback`. Status → review. Verificação curl end-to-end pendente (Docker pausado).
- 2026-07-16: Docker disponível nesta sessão — roteiro curl end-to-end completo executado (AC 5), todos os 5 ACs confirmados. Story 11.2 100% completa.
