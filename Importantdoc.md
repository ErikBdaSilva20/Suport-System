# Guia do time — Apps Prontos (Hub de Clones da Masia)

> **Para quem:** devs que vão **procurar projetos** e **adaptá-los/construí-los** como
> apps clonáveis do hub ("Apps Prontos").
> **O que é a fundação:** `tenant-gateway` (backend único compartilhado) + **Neon**
> (1 banco Postgres por cliente) + **Better-Auth** (login/papéis) + **editor por IA** +
> **publish Cloudflare** (build compartilhado, tenant em runtime).
> **Fonte-da-verdade do contrato técnico.** Substitui e atualiza o antigo
> `GUIA-TEMPLATES-CLONE.md` (que descrevia o build por-clone via E2B — hoje obsoleto).

Este guia tem dois trabalhos:

- **PARTE A — Achar e qualificar** um projeto pra virar app pronto (§A1–§A4).
- **PARTE B — Adaptar e construir** o template em cima da fundação (§B1–§B10).

Leia a Parte A inteira antes de escolher um projeto: 90% do retrabalho vem de
escolher um OSS que **não cabe na fundação** (backend próprio, realtime, licença errada).

---

# PARTE A — Como achar e qualificar um projeto

## A1. A regra que mata 90% das ideias ruins

**Nenhum projeto OSS roda "como está".** Todo OSS de mercado tem **backend próprio**
(Express/Rails/Django/PHP). Trazer pro hub **NÃO é** subir o repo — é usar o repo como
**blueprint**: copiar o **modelo de dados + UX + telas** e **reconstruir** como
**SPA React 19 + Vite** falando só com o nosso gateway (`/data/:table`, Better-Auth,
`owner_id`). O backend deles a gente joga fora.

Então a pergunta certa ao avaliar um projeto **não** é "ele é bom?", e sim:
**"o domínio dele cabe num CRUD multi-tenant servido pelo gateway, com telas React puras?"**

## A2. Filtro nº 1 — LICENÇA (vai SaaS multi-tenant, então isto é jurídico)

| Licença                                                         | Pode?            | O que fazer                                                                                                                    |
| --------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Permissiva** — MIT / Apache-2.0 / BSD / MPL                   | ✅ Sim           | Pode **copiar código e markup** das telas. Melhor fonte: vira UI real.                                                         |
| **Copyleft** — GPL / AGPL / LGPL                                | ⚠️ Só inspiração | Use **só como referência** de UX/domínio. **Não copie código.**                                                                |
| **Source-available** — BSL / Elastic / SSPL / FSL / "fair-code" | ❌ Pular         | Quase sempre **proíbe operar como serviço gerenciado a terceiros** = exatamente o nosso hub. Nem como referência vale o risco. |

> Sempre **verifique a licença no `LICENSE` do repo** (não confie no README). Anote a
> licença e o link no `THIRD_PARTY.md` do template quando copiar qualquer markup.

## A3. Filtro nº 2 — FIT com a fundação ("cabe hoje" vs "precisa estender")

A fundação atual serve **CRUD genérico + papéis + (opcional) Composio**. Use esta grade:

### ✅ CABE HOJE (construa sem tocar na fundação)

O domínio é **dados + telas**: listas, formulários, cards, kanban, dashboards, detalhe.
Exemplos que já estão no ar ou são fáceis:

- CRM / vertical de vendas, **Faturas/Orçamentos**, **Estoque** (ledger), **RH/ATS**
  (vagas→candidatos→pipeline), **Projetos/Kanban**, **OKR/metas**, **Wiki/KB**,
  **Helpdesk** (ticket clássico, sem realtime), **Forms/NPS**, **Whiteboard** (cena = 1 JSON),
  **Link-in-bio**, **Board de feedback**.
- Componentes client-side pesados (Excalidraw, SurveyJS) **cabem**: rodam no browser e
  guardam o estado como JSON no `/data/:table`.

### 🔧 PRECISA ESTENDER A FUNDAÇÃO (não comece sem alinhar)

Se o coração do produto é um destes, **não dá** só com template — é trabalho no gateway:

- **Realtime / colaboração ao vivo** (cursores, presença, co-edição) → WebSocket no gateway.
- **WhatsApp / chat / inbox / voz** (o moat dos concorrentes) → integração + LLM no gateway.
- **Jobs agendados / cron / filas** (lembretes, motor de slots do Cal.com, billing recorrente).
- **Webhooks de terceiros / pagamentos** (Stripe, gateways) → endpoint server-side.
- **Processamento de arquivo / mídia / PDF / storage pesado** (certificados, render de vídeo).
- **Página pública sem login** (perfil tipo link-in-bio, formulário público) → é uma extensão
  **pequena** mas real: precisa de **rota explícita no gateway** (ver §B6). Não é automática.

> **Regra prática:** se você precisa de "um servidor que faça X quando o usuário não está
> olhando", é extensão de fundação, não template. Marque como Onda 2 e alinhe com o dono do
> gateway antes de prometer.

## A4. Onde está a curadoria já feita

Já existe uma lista grande de OSS verificados (licença/estrelas/manutenção/fit):

- `docs/OSS-PARA-HUB-CLONES.md` — battle-map principal (o que cabe hoje vs o que é moat do concorrente).
- `docs/OSS-HUB-CLONES-CATALOGO-COMPLETO.md` — catálogo completo.
- `docs/OSS-HUB-CLONES-PRINCIPAIS-PLANO.md` — planos de implementação (⚠️ partes desatualizadas; o contrato vale é este guia).
- `docs/CATALOGO-CLONES-IDEIAS.md` — ideias de domínios.

**Maior reaproveitamento real de código (MIT + stack próxima do nosso):** Atomic CRM,
Excalidraw, SurveyJS, Librelinks/LittleLink, BookStack (domínio), Atomic CRM (markup shadcn).

---

# PARTE B — Como construir/adaptar o template

## B1. Modelo mental (decore)

Um template é um **SPA estático (Vite + React)**. Quando um cliente clona, ele ganha:

- **1 projeto Neon dedicado** (Postgres isolado, scale-to-zero) — só os dados dele.
- O app servido pela **Cloudflare** (R2 + edge worker) em `<slug>.masia.cloud` (ou domínio próprio).
- **NÃO existe backend por app.** O backend de TODOS os apps é o **tenant-gateway** (serviço
  Hono compartilhado): login/sessão (Better-Auth) + **API de dados** (CRUD `/data/:table`),
  roteando cada request pro Neon do tenant certo.

```
[App clonado: SPA Vite]  --HTTPS-->  [tenant-gateway (compartilhado)]  --SQL-->  [Neon do tenant]
 <slug>.masia.cloud                   Better-Auth + /data/*                       só os dados dele
 servido da Cloudflare                resolve o tenant por hostname/header        (1 banco por cliente)
```

Consequências:

- O app **só fala com o gateway** (via `db`/`auth`). Nunca tem servidor próprio, nunca acessa
  banco direto, nunca usa Supabase/Firebase.
- Dados **isolados fisicamente** (1 Neon por cliente). A **autorização é no gateway** (app-layer),
  não no banco — **sem RLS**.
- O app é **editável por IA** (telas/visual/repos e até o schema), dentro de uma allow-list.

## B2. Onde tudo mora (mapa dos repositórios)

| Coisa                                                                       | Caminho / repo                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Templates** (os apps clonáveis)                                           | `masi-ai-orquestration/clone-templates/<slug>/`                     |
| Orquestração (provisão, editor IA, publish)                                 | `masi-ai-orquestration/`                                            |
| **Edge worker** (injeta tenant em runtime)                                  | `masia/clone-templates/edge-worker/` (deploy via `wrangler deploy`) |
| **Gateway** (backend compartilhado, Better-Auth, `/data/*`, rotas públicas) | repo separado `Cerebra-AI/tenant-gateway` (deploy Fly)              |
| Migrations de catálogo (control-plane)                                      | `masi-ai-orquestration/supabase/migrations/`                        |
| Docs/guia                                                                   | `masia/docs/`                                                       |

> Atenção: `masia/clone-templates/` **só tem o `edge-worker`**. Os templates de verdade
> ficam em **`masi-ai-orquestration/clone-templates/`**.

## B3. Tecnologias (use exatamente isto)

| Camada    | Tecnologia                                                                                                        | Observação                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Framework | **React 19**                                                                                                      |                                                                  |
| Build     | **Vite 6** (SPA estático)                                                                                         | `tsc && vite build`. **Sem Next.js / SSR.**                      |
| Rotas     | **react-router-dom 7**                                                                                            | SPA, `BrowserRouter`                                             |
| Linguagem | **TypeScript** strict (`noUnusedLocals`)                                                                          | imports não usados **quebram o build**                           |
| Estilo    | **2 opções** (ver §B9): CSS+tokens (scaffold `forms-nps`) **ou** Tailwind v4 + shadcn "Atelier" (scaffold `wiki`) |                                                                  |
| Dados     | **gateway** via `db` (de `src/lib/data/client.ts`)                                                                | NUNCA `@supabase`, fetch cru pro banco, ou driver SQL no browser |
| Auth      | **Better-Auth** via `auth` (de `client.ts`)                                                                       | NUNCA implemente auth próprio                                    |
| Banco     | **Postgres (Neon)** — só o schema (migration)                                                                     | sem RLS, sem `auth.uid()`                                        |

**Proibido:** Next.js, SSR/SSG, servidor/API por app, Supabase, Firebase, ORM no browser, libs de UI gigantes não justificadas.

## B4. Regras de SCHEMA (a parte mais importante — siga à risca)

A migration roda no **Neon do tenant**, DEPOIS que o gateway cria as tabelas do Better-Auth.

```sql
create table if not exists tarefas (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null references "user"(id) on delete cascade,  -- ⚠️ TEXT, "user" entre aspas
  titulo      text not null,
  feito       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_tarefas_owner on tarefas(owner_id);
```

1. **`owner_id text not null references "user"(id) on delete cascade`** em **toda tabela que o
   usuário escreve**. É **TEXT** (id do Better-Auth) e `"user"` precisa de **aspas**.
2. **SEM RLS, SEM `auth.uid()`, SEM `custom_access_token_hook`, SEM tabela `profiles`.** Autz é no gateway.
3. **`snake_case` minúsculo** (tabela e colunas). O regex do modo genérico só aceita `^[a-z_][a-z0-9_]*$`.
4. **Nomes de tabela PROIBIDOS** (reservados ao auth): `user, session, account, verification,
organization, member, invitation`.
5. **`id` uuid PK** + (recomendado) `created_at`/`updated_at timestamptz`. Pra `updated_at`
   automático, use um trigger `touch_updated_at`.
6. **Tabelas lookup** (sem `owner_id`: status, categorias, estágios, temas): leitura liberada a
   qualquer logado; escrita só admin/manager. **São read-only pro `rep`.**

### ⚠️ B4.1 — O gotcha de RBAC que mais quebra port (leia 2x)

O gateway **RECUSA escrita** em qualquer tabela **sem `owner_id`** vinda de quem **não é
owner/admin/manager**. Logo:

- **TODA tabela que o `rep` cria/edita precisa de `owner_id`** — **inclusive tabelas-filhas**
  (`subtasks`, `task_comments`, `itens_pedido`, anexos…). Esqueceu o `owner_id` numa filha →
  `rep` toma 403 ao salvar.
- **Só** lookups genuinamente read-only (status/categorias/temas/templates-semente) **omitem** `owner_id`.

## B5. Como o app lê/escreve (o `db` genérico)

O app NUNCA fala com o banco. Usa o **modo genérico do gateway**:
`GET/POST/PATCH/DELETE /data/:table`. O `client.ts` (PROTEGIDO) já expõe `db` e `auth` —
**você herda copiando o scaffold; não reescreva à mão.** O `client.ts` real:

- Lê config de `?gw=&t=` **ou** `import.meta.env.VITE_*` **ou** dos globais de runtime
  `window.__MASI_GW__` / `window.__MASI_TENANT__` (injetados pelo edge worker em prod) — **e**
  tem um branch de **PREVIEW** (`window.__MASI_PREVIEW__`) com fixtures, usado pelo editor Sandpack.
- Manda `credentials: 'include'` + header `X-Tenant-Id`.

A API de dados (o que você usa nos repos):

```ts
export const db = {
  table<R = any>(name: string) {
    return {
      list: () => api<R[]>('GET', `/data/${name}`),
      create: (input: Partial<R>) => api<R>('POST', `/data/${name}`, input),
      update: (id: string, patch: Partial<R>) => api<R>('PATCH', `/data/${name}/${id}`, patch),
      remove: (id: string) => api('DELETE', `/data/${name}/${id}`),
    };
  },
};
```

E os **repos** (editáveis pela IA):

```ts
// src/lib/data/tarefas.repo.ts
import { db } from './client';
import type { Database } from './types.gen';
export type Tarefa = Database['public']['Tables']['tarefas']['Row'];

export const listTarefas = () => db.table<Tarefa>('tarefas').list();
export const createTarefa = (input: Partial<Tarefa>) => db.table<Tarefa>('tarefas').create(input);
export const toggleTarefa = (id: string, feito: boolean) =>
  db.table<Tarefa>('tarefas').update(id, { feito });
export const deleteTarefa = (id: string) => db.table<Tarefa>('tarefas').remove(id);
```

**Limites do modo genérico (modele pensando neles):**

- **NÃO há get-by-id nem filtro por query.** Só `list/create/update/remove`. As telas fazem
  **list-then-find/filter no front** (já validado em produção). Não desenhe telas que dependam
  de `GET /data/:table/:id`.
- **`owner_id` é setado pelo gateway** (a partir da sessão) — **NÃO mande do front.**
- **Joins ricos não existem** no modo genérico — ele é **plano**. Para relação (ex: nome da
  empresa no card do contato): **modele plano**, faça **2 queries no front**, ou peça um
  **endpoint explícito no gateway** (extensão).

## B6. Página pública sem login (extensão pequena, mas não automática)

O `/data/:table` **exige sessão**. Se o app precisa de página acessível sem login
(perfil link-in-bio, formulário público, página compartilhável), isso é **rota explícita no
gateway** (`tenant-gateway/src/routes/public.ts`) **e o schema tem que conformar exatamente às
queries dessas rotas**. Hoje já existem rotas públicas para **LinkHub** (`/public/profile`,
`/public/links`, `/public/links/:id/click`) e **Forms** (`/public/forms/:id`, `/responses`).
Se o seu app precisa de uma nova superfície pública, **alinhe com o dono do gateway** — não dá
pra resolver só no template.

## B7. Manifest `masi.template.json`

```json
{
  "id": "tarefas",
  "name": "Gestor de Tarefas",
  "description": "…",
  "version": "1.0.0",
  "engine": "vite-react-gateway",
  "schemaVersion": 1,
  "migrations": ["0001_business_schema.sql"],
  "auth": { "provider": "better-auth", "roles": ["admin", "manager", "rep"] },
  "screens": [
    { "id": "home", "route": "/", "title": "Tarefas", "file": "src/screens/TarefasScreen" }
  ],
  "editable": {
    "allow": [
      "src/screens/**",
      "src/components/**",
      "src/lib/data/*.repo.ts",
      "src/lib/format.ts",
      "src/app.css"
    ],
    "protect": [
      "src/lib/data/client.ts",
      "src/lib/data/types.gen.ts",
      "src/components/registry.tsx",
      "src/main.tsx",
      "supabase/migrations/**"
    ]
  },
  "composio": { "toolkits": [] },
  "envContract": ["VITE_GATEWAY_URL"]
}
```

- **engine** sempre `vite-react-gateway`; **envContract** sempre `["VITE_GATEWAY_URL"]`.
- **allow** = o que a IA pode editar; **protect** = o contrato com o gateway (nunca editável).
  Mantenha `client.ts`/`types.gen.ts`/`registry.tsx`/`main.tsx`/migrations sempre protegidos.
  No scaffold **wiki** (shadcn), também ficam protegidos `src/components/ui/**`,
  `src/lib/utils.ts`, `vite.config.ts`, `components.json` e `preview-fixtures.ts`.
- **composio.toolkits**: declare aqui as integrações que o app oferece (ex: `["gmail","slack"]`
  no forms-nps, `["notion"]` no wiki). `[]` se nenhuma.

## B8. Auth & papéis

- Login/cadastro são do **Better-Auth no gateway** (`auth.signIn/signUp/signOut`).
- Papéis: **admin / manager / rep** (+ owner = criador). **O 1º usuário do tenant vira admin**;
  os demais entram como **rep** (automático).
- Visibilidade (o gateway aplica): **admin/manager/owner veem tudo; rep vê só os próprios**
  (`owner_id`). Lookups: leitura a todos, escrita admin/manager.
- `src/lib/auth.tsx` lê sessão + papel (`auth.me()` → `{ user, role }`). Use `role` **só pra UI**
  (esconder botões); a segurança real é no gateway.

## B9. Os dois scaffolds (escolha o ponto de partida)

| Scaffold        | Quando usar                                | Stack visual                                                                                                                        |
| --------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **`forms-nps`** | App simples/leve, sem dependências pesadas | **CSS puro + tokens** (identidade Masia verde, Space Grotesk+Inter, dark mode). Mais leve.                                          |
| **`wiki`**      | App **"Pro"** / sofisticado                | **Tailwind v4 + shadcn/ui** — design system **"Atelier"**. É o scaffold canônico dos Pro; `crm-pro` e `recrutamento` nasceram dele. |

Templates já no ar como referência: `forms-nps`, `draw` (Excalidraw), `wiki`, `crm-pro`, `recrutamento`.

## B10. Build, publish e catálogo (modelo atual — build COMPARTILHADO)

> **Mudou em relação ao guia antigo:** clones **não buildam por clone** em produção. O sandbox
> base é pequeno e dava OOM. Hoje o template builda **1× compartilhado** e cada clone só aponta
> pra esse build (**clone instantâneo, ~2s**). O **tenant entra em runtime**: o edge worker
> injeta `window.__MASI_TENANT__` no `index.html` servido do R2; o app lê isso e manda no
> `X-Tenant-Id`. O E2B só sobrou pra **publish de edições por IA** (que divergem o build) — usa
> o template custom de 4 GB `masi-clone-build`.

### Pré-requisitos do template

- `package-lock.json` commitado, **`vite build` passa**, **zero imports não usados**.
- Schema seguindo §B4. `types.gen.ts` batendo com o schema.

### Receita de publish (PROD)

```bash
cd masi-ai-orquestration/clone-templates/<slug> && npm install
# build compartilhado → R2 templates/<slug>/v<ts> + KV TPL:<slug>
pnpm templates:publish <slug> https://masi-tenant-gateway.fly.dev
# ⚠️ SEMPRE passe o gateway https público. Há um guardrail que RECUSA localhost/http —
#    sem o arg, o default é localhost e TODOS os clones quebram (sign-up 404).
pnpm demo:publish <slug>   # demo em demo-<slug>.masia.cloud (habilita o "Ver demo")
```

### Registrar no catálogo (control-plane) — pra aparecer no Marketplace

Crie uma migration em `masi-ai-orquestration/supabase/migrations/` espelhando
`20260620160001_clone_template_forms_nps.sql`: dois INSERTs **idempotentes** —
`clone_templates` (slug, name, description, **category**, status=`published`, latest_version,
demo_url) e `clone_template_versions` (template_id, version, manifest jsonb, changelog).

### Redeploy do serviço (Fly) — pra ficar CLONÁVEL de verdade

O provisionador e o editor leem os arquivos do template **do disco da imagem** (não só do R2).
Então, ao adicionar/alterar um template, **redeploy a API e o worker** no Fly
(`Dockerfile` faz `COPY clone-templates`). Sem isso: provisiona/edita dá `ENOENT`.

### Gotchas de publish (já custaram debug)

- **Clones existentes ficam pinados** ao build da provisão — re-publish **não** atualiza quem já
  clonou. Pra pegar build novo, **re-clonar** (deletar o quebrado + clonar de novo).
- Libs pesadas (Excalidraw, marked+dompurify) geram chunk grande → **só warning** de chunk-size,
  o build passa e o edge worker serve estático.
- **Preview do editor (Sandpack) usa o bundler legado `react-ts`.** Lib pesada quebra o preview
  sem um mapa `CDN_EXTERNALS` (esm.sh) em `SandpackPreview.jsx`; Tailwind v4 precisa do
  `@tailwindcss/browser` no preview. **Produção (Vite) é normal** — isso é só o preview.

## B11. Edição por IA (o que a IA pode/não pode)

- A IA edita **só os arquivos de `editable.allow`** (telas, componentes, repos, `format.ts`,
  CSS), por **diff cirúrgico** com **aprovação humana**.
- Ela pode gerar **migrations** (rodam no Neon do tenant). Tabelas novas seguindo §B4 são
  **servidas automaticamente** pelo modo genérico. Ops destrutivas (DROP) exigem confirmação.
- Mantenha o código **compilável** (tsc). O build tem self-heal, mas **comece limpo**.
- Os arquivos **protegidos** são o contrato com o gateway — se a IA mexesse no `client.ts`,
  quebraria o link. Por isso são protect.

---

# Receita rápida — portar um OSS em template novo

1. **Qualifique** (Parte A): licença permissiva? cabe no CRUD sem estender a fundação? (§A2–§A3)
2. **Copie o scaffold:** `cp -R clone-templates/forms-nps clone-templates/<slug>` (CSS) **ou**
   `cp -R clone-templates/wiki clone-templates/<slug>` (Pro shadcn) → `rm -rf node_modules dist`.
3. **Limpe** os arquivos específicos do scaffold (telas/repos/migration do app antigo).
4. **Schema:** reescreva `supabase/migrations/0001_business_schema.sql` (regras §B4 — **owner_id
   em toda tabela escrita pelo rep, inclusive filhas**).
5. **Tipos:** atualize `src/lib/data/types.gen.ts` pra bater com o schema.
6. **Repos:** crie `src/lib/data/<x>.repo.ts` usando `db.table('<x>')` (sem get-by-id).
7. **Telas:** escreva `src/screens/*` + `App.tsx`/`app.routes.tsx`. Reaproveite
   `LoginScreen`/`AppShell`/`auth.tsx`/`RequireAuth`/`registry`/`main` (não mexa nesses).
8. **Preview:** ajuste o branch PREVIEW de `client.ts` / `preview-fixtures.ts` pras suas tabelas.
9. **Manifest:** ajuste `masi.template.json` (id, name, screens, migrations, composio).
10. **Build:** `npm install && npm run build` (tsc && vite) — tem que passar limpo.
11. **Publish + catálogo + demo + Fly redeploy** (§B10).
12. **THIRD_PARTY.md:** credite o OSS de origem (licença + link) se copiou markup.
13. **Teste E2E:** clone real via o app → provisiona Neon → login admin semeado → telas funcionam.

---

# Checklist de seleção (Parte A)

- [ ] Licença **permissiva** (MIT/Apache/BSD/MPL) se vamos copiar código; copyleft só referência; source-available **pular**.
- [ ] Domínio é **dados + telas** (cabe no CRUD genérico) — **não** depende de realtime/WhatsApp/jobs/webhooks/pagamento/mídia.
- [ ] Se precisa de página pública sem login → mapeado como **extensão do gateway** (§B6), não como template puro.
- [ ] Joins necessários são resolvíveis **plano / 2 queries** (ou justificam endpoint explícito).

# Checklist do template (Parte B)

- [ ] SPA Vite + React 19, sem Next/SSR, sem backend próprio.
- [ ] `package-lock.json` commitado; `vite build` passa; sem imports não usados.
- [ ] Zero `@supabase`, zero fetch cru pro banco, zero auth próprio. Acesso só via `db`/`auth`.
- [ ] Schema: `owner_id text references "user"(id)` em **toda tabela escrita pelo rep (inclusive filhas)**; sem RLS/`auth.uid()`; `snake_case`; sem nomes reservados.
- [ ] `types.gen.ts` bate com o schema.
- [ ] `masi.template.json`: engine `vite-react-gateway`, envContract `["VITE_GATEWAY_URL"]`, allow/protect corretos.
- [ ] Telas fazem **list-then-filter** (sem get-by-id).
- [ ] Papéis admin/manager/rep; 1º user = admin (automático).
- [ ] Publicado com **gateway https público**; registrado no catálogo; demo no ar; Fly redeployado.
- [x] `THIRD_PARTY.md` credita o OSS de origem.

---

# Erros comuns (não faça)

- ❌ Subir o OSS "como está" / criar servidor/Express/Next por app. → O gateway é o backend; reconstrua o front.
- ❌ Escolher OSS source-available (BSL/SSPL/FSL) pra copiar. → Pular: proíbe SaaS gerenciado.
- ❌ Tabela-filha sem `owner_id`. → `rep` toma 403 ao salvar. `owner_id` em **toda** tabela escrita pelo rep.
- ❌ `owner_id uuid` ou `references auth.users`. → É `text references "user"(id)`.
- ❌ RLS / `auth.uid()` / `profiles`. → Autz é no gateway.
- ❌ Tela que depende de `GET /data/:table/:id` ou de join no banco. → Sem get-by-id; modo genérico é plano.
- ❌ Mandar `owner_id` do front. → O gateway seta pela sessão.
- ❌ `pnpm templates:publish <slug>` **sem** a URL https do gateway. → Embute localhost; todos os clones quebram.
- ❌ Editar/depender de `client.ts`/`types.gen.ts` (ou `ui/**`/`utils.ts` no wiki) na IA. → São protegidos (contrato).
- ❌ Prometer página pública / realtime / WhatsApp como "template". → São extensões de fundação (alinhar antes).
