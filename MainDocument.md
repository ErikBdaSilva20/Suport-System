# Handoff — Papéis e Status (helpdesk-crud)

> Nota rápida pro próximo dev que pegar esse projeto. Cobre como os 3 papéis
> (`admin`/`manager`/`rep`) funcionam hoje e como o status do ticket se move
> entre eles. Não é doc oficial do processo BMAD (`doc/00-08`) — é só um
> resumo prático, gitignorado por enquanto.

## Os 3 papéis

| Papel     | Quem é                                                          | Como a conta é criada                                                                                             |
| --------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `admin`   | Dono/gestor da empresa que clonou o template                    | **1º cadastro** na aba "Equipe" em `/login` — automático, mas só funciona uma vez                                 |
| `manager` | Funcionário que atende os chamados via WhatsApp                 | Criado **pelo admin**, em Configurações → "Criar funcionário" (nome+e-mail, senha gerada) — nunca se autocadastra |
| `rep`     | **O cliente** — quem tem o problema e quer reportar remotamente | Se autocadastra sozinho, aba "Sou cliente" em `/login` (nome, e-mail, senha, **telefone**)                        |

**Importante:** `rep` não é mais "funcionário júnior" como em versões antigas do
plano — é o cliente externo. Quem decide isso é o campo `intent` mandado no
signup, não a ordem de cadastro.

### Bootstrap (quem vira admin)

- Clonar o template no hub da MasIA **não** cria a conta automaticamente — a
  conta MasIA (usada pra clonar) e a conta do helpdesk em si (Better-Auth,
  dentro do app clonado) são coisas diferentes. Depois de clonar, alguém ainda
  precisa abrir `/login` → aba "Equipe" → cadastrar, e essa primeira pessoa
  vira admin.
- Depois desse 1º cadastro, a aba "Equipe" **fecha sozinha** — qualquer nova
  tentativa de cadastro nela recebe 403 ("cadastro de equipe fechado, peça pro
  admin"). Novos funcionários só entram via admin.
- A aba "Sou cliente" (com telefone) **nunca** vira admin, não importa a
  ordem — mesmo que um cliente seja tecnicamente o primeiro usuário a se
  cadastrar no banco inteiro. Essa é a trava de segurança: sem ela, o primeiro
  cliente que aparecesse viraria dono do tenant.

### Onde isso vive no código

### Nota: Isso funciona apenas no local. Não temos acesso a documentação ou permissões

- `local-gateway/src/auth.js` — `POST /sign-up/email` lê `intent` do body
  (`'customer'` → sempre `rep`; ausente → só funciona com 0 usuários, vira
  `admin`, senão 403). `POST /api/auth/admin/create-user` — só admin, cria
  `manager` com senha aleatória.
- `src/lib/data/client.ts` — `auth.signUp(email, password, name, { intent })`
  e `auth.adminCreateUser(name, email, role)`.
- `src/screens/LoginScreen.tsx` — 3 abas: Entrar / Equipe / Sou cliente.
- `src/screens/SettingsScreen.tsx` — form "Criar funcionário" (só admin, rota
  já é `RequireAdmin`).
- `src/screens/TicketNewScreen.tsx` — se `role === 'rep'`, pula o seletor de
  cliente e usa o próprio registro em `customers` (criado junto no signup).

### ⚠️ Limitação real (não é só nota de rodapé)

Essa lógica (`intent` no signup, endpoint `admin/create-user`) **só existe no
`local-gateway`** (mock local, `local-gateway/`, sobe via `docker compose up`).
O `tenant-gateway` real de produção é um repo externo (`Cerebra-AI/tenant-gateway`)
que ninguém neste projeto tem acesso — ele precisa da mesma lógica antes disso
ser seguro em produção. Até lá: **o admin sempre tem que se cadastrar antes de
divulgar publicamente o link/aba de cadastro de cliente.** Caso o fluxo seja diferente. Altere a sua necessidade!

## Quem vê o quê (RBAC)

Regra de sempre, aplicada pelo gateway via `owner_id` — a UI só decide o que
_mostrar_, a segurança real é no gateway:

- `rep` (cliente): só vê/edita os próprios registros (`owner_id = ele mesmo`)
  — os próprios tickets, o próprio registro em `customers`.
- `manager`/`admin`: veem **tudo** de todo mundo.
- `rep` nunca vê os botões "Atender", "Concluir" nem "Abrir WhatsApp" — só
  `manager`/`admin` (ver `TicketDetailScreen.tsx`).
- Mesmo que um `rep` chame `PATCH /data/tickets/:id` na mão pra um ticket que
  não é dele, o gateway rejeita com 403 (`local-gateway/src/data.js`).

## Status do ticket

Enum `ticket_status` (`supabase/migrations/20260715190000_target_schema.sql`):
`open` → `in_progress` → `resolved`. Sem estado "fechado"/"cancelado" — é
intencionalmente simples (CRUD mínimo, ver `Importantdoc.md`).

| Transição                   | Quem pode                                                                                | Onde                     |
| --------------------------- | ---------------------------------------------------------------------------------------- | ------------------------ |
| Criação → `open`            | `rep` (abre o próprio chamado) ou `manager`/`admin` (em nome de alguém, ex: ligação)     | `TicketNewScreen.tsx`    |
| `open` → `in_progress`      | Só `manager`/`admin`, botão "Atender" (`assignTicket`, seta `assigned_to = quem clicou`) | `TicketDetailScreen.tsx` |
| `in_progress` → `resolved`  | Só `manager`/`admin`, botão "Concluir" (`resolveTicket`, seta `resolved_at`)             | `TicketDetailScreen.tsx` |
| Qualquer → `open` (reabrir) | Só via Kanban (`manager`/`admin` arrastando de volta pra coluna "Aberto")                | `TicketKanbanScreen.tsx` |

**Sino de notificação** (header, só `manager`/`admin`): conta tickets
`status = 'open'` que a pessoa ainda não abriu individualmente — não depende
de quem criou o ticket, só do status real. Ver
`src/hooks/use-open-tickets-badge.ts` e o `EXPERIENCE.md` da pasta
`_bmad-output/planning-artifacts/ux-designs/ux-helpdesk-masia-2026-07-15/`
pra entender a "trava anti-confusão" (o contador nunca se baseia só no
`localStorage`, sempre no status real do banco).

## Categoria do problema (não é papel, mas é vizinho)

Campo `category` em `tickets`, preenchido na abertura (obrigatório): select
com 6 opções fixas (Técnico, Atendimento, Financeiro, Cadastro/Acesso, Sem
resposta do cliente) + "Outro" com texto livre até 5 palavras. É texto puro
no banco, sem tabela de lookup — ver `TicketNewScreen.tsx` e
`doc/06-schema-alvo.md`.

## Testar isso localmente

```bash
npm install
npm run docker:up   # Postgres + local-gateway (Docker)
cp .env.example .env.local
npm run dev
```

Fluxo pra reproduzir o cenário completo: cadastre-se na aba "Equipe" (vira
admin) → em Configurações, crie um funcionário (vira `manager`, copie a
senha gerada) → em outra aba anônima, cadastre-se em "Sou cliente" com
telefone → abra um chamado como cliente → logue como o `manager` e veja o
sino de notificação + o chamado na lista.
