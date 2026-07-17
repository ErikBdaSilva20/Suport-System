# Help Desk (helpdesk-crud)

Central de atendimento CRUD: **rep** abre chamados, **manager/admin** atendem e conversam
com o cliente pelo **WhatsApp** (`wa.me`). Sem IA, sem e-mail, sem backend próprio — o
único backend em produção é o **tenant-gateway** compartilhado da fundação Masia
(`db`/`auth` sobre Better-Auth + Neon). Ver `Importantdoc.md` para o contrato completo da
fundação e `_bmad-output/planning-artifacts/epics.md` para o histórico da migração.

---

## Stack

- **Frontend:** React 19 + Vite 6 + TypeScript strict + Tailwind + shadcn/ui
- **Dados/Auth:** `tenant-gateway` compartilhado — `/data/:table` (CRUD genérico) + Better-Auth. App nunca acessa banco direto.
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
NeonDB/setup.sql         # script único e idempotente pra provisionar o schema no Neon
masi.template.json       # manifest exigido pelo hub de clones (Importantdoc.md#B7)
```

---

## 💻 Rodando o app

Precisa de acesso a uma instância do `tenant-gateway` (ex: `https://masi-tenant-gateway.fly.dev`)
já com um tenant provisionado:

```bash
npm install
echo "VITE_GATEWAY_URL=https://<seu-gateway>" > .env.local
npm run dev          # http://localhost:8080
```

O 1º cadastro no tenant vira `admin` automaticamente (FR10); os seguintes entram como `rep`.
Promoção a `manager` depende do mecanismo próprio do `tenant-gateway` — fora do escopo deste repo.

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
