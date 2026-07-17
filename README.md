# Help Desk (helpdesk-crud)

Central de atendimento CRUD: **rep** abre chamados, **manager/admin** atendem e conversam
com o cliente pelo **WhatsApp** (`wa.me`). Sem IA, sem e-mail, sem backend próprio — o
único backend em produção é o **tenant-gateway** compartilhado da fundação Masia
(`db`/`auth` sobre Better-Auth + Neon). Ver `Importantdoc.md` para o contrato completo da
fundação e `_bmad-output/planning-artifacts/epics.md` para o histórico da migração.

---

## Stack

- **Frontend:** React 19 + Vite 6 + TypeScript strict + Tailwind + shadcn/ui
- **Dados/Auth (produção):** `tenant-gateway` compartilhado — `/data/:table` (CRUD genérico) + Better-Auth. App nunca acessa banco direto.
- **Dados/Auth (dev local):** `local-gateway/` — um mock deste repo que fala o mesmo contrato, mas contra um Postgres em Docker (ver seção abaixo). **Não é o gateway real.**
- **Papéis:** `admin` / `manager` / `rep` (1º usuário do tenant vira admin automaticamente)
- **Contato com cliente:** link `wa.me/<telefone>?text=...`, sem integração de mensageria

---

## 📁 Estrutura do projeto

```
src/
├── screens/            # Telas (rotas top-level) — Dashboard, Tickets, Kanban, Clientes, Settings...
├── components/         # AppLayout, NavLink, componentes shadcn/ui
├── lib/
│   ├── data/            # client.ts (PROTEGIDO), *.repo.ts (CRUD fino via db.table()), types.gen.ts
│   └── auth.tsx         # AuthProvider/useAuth/RequireAuth/RequireAdmin
└── test/                # setup + testes vitest

supabase/migrations/     # SQL versionado do schema-alvo (customers, tickets, ticket_notes, settings)
masi.template.json       # manifest exigido pelo hub de clones (Importantdoc.md#B7)

local-gateway/           # mock local do tenant-gateway (só para rodar em dev sem o gateway real)
docker-compose.yml       # Postgres + local-gateway
docker/init/             # bootstrap do banco local (mock da tabela "user" + aplica as migrations)
```

---

## 💻 Desenvolvimento local

### Opção A — contra o gateway real

Se você tiver acesso a uma instância do `tenant-gateway` (ex: `https://masi-tenant-gateway.fly.dev`)
já com um tenant provisionado:

```bash
npm install
echo "VITE_GATEWAY_URL=https://<seu-gateway>" > .env.local
npm run dev          # http://localhost:8080
```

### Opção B — local com Docker, simulando o Neon (recomendado para dev sem o gateway)

Sobe um Postgres local (fazendo o papel do Neon do tenant) + um **mock do tenant-gateway**
(`local-gateway/`) que fala exatamente o mesmo contrato REST que `src/lib/data/client.ts`
já espera (`/data/:table`, `/api/auth/*`). O app **não precisa de nenhuma mudança de
código** para usar esse modo — é só apontar `VITE_GATEWAY_URL` pra ele.

> ⚠️ **Login é mockado neste modo.** `local-gateway` implementa signup/login/sessão de
> forma simplificada (sem os fluxos de segurança do Better-Auth real) só para permitir
> testar o app ponta a ponta localmente. O resto do CRUD (`customers`, `tickets`,
> `ticket_notes`, `settings`) fala com Postgres de verdade, respeitando as mesmas regras
> de RBAC do gateway real (`owner_id` da sessão, rep só vê/edita os próprios registros,
> manager/admin veem tudo, 403 em tentativa de editar registro de outro owner).

```bash
npm install
npm run docker:up          # sobe Postgres (porta 5433) + local-gateway (porta 8787)
cp .env.example .env.local # já vem com VITE_GATEWAY_URL=http://localhost:8787
npm run dev                # http://localhost:8080
```

Na primeira subida, o Postgres aplica automaticamente todas as migrations de
`supabase/migrations/` (via `docker/init/00-bootstrap.sh`), além de criar um mock local
da tabela `"user"` do Better-Auth. Abra `http://localhost:8080`, crie uma conta — o
primeiro cadastro vira `admin` automaticamente (FR10); os seguintes entram como `rep`.

**Promover um usuário a manager/admin** (a Story 6.3 documenta que o gateway real ainda
não tem rota própria pra isso no v1 — a promoção é manual):

```bash
cd local-gateway
DATABASE_URL=postgres://helpdesk:helpdesk@localhost:5433/helpdesk node scripts/promote.js usuario@exemplo.com manager
```

**Comandos úteis:**

```bash
npm run docker:logs   # acompanha os logs do Postgres + local-gateway
npm run docker:down   # para os containers (mantém os dados)
npm run docker:reset  # para e apaga o volume do Postgres (recomeça do zero)
```

---

## Outros comandos

```bash
npm run build   # tsc --noEmit (strict) + vite build
npm run test    # vitest
npm run lint    # eslint
```

---

## 📄 Créditos

Base gerada originalmente com [Lovable](https://lovable.dev); migrado para a fundação
`tenant-gateway + Neon + Better-Auth` do hub Masia.
