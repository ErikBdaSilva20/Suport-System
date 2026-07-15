# 5. Mapa — O que fica (o core que sobra)

Depois de podar IA, e-mail, realtime, KB, SLA, notificações, participantes, anexos e portal do cliente, sobra um app **pequeno e alinhado à fundação**.

## 5.1. Telas (screens)

| Rota | Tela | Papéis |
|---|---|---|
| `/login` | Login/Signup Better-Auth | público |
| `/` (= `/tickets`) | Lista de chamados | rep vê os próprios; manager/admin veem tudo |
| `/tickets/new` | Abrir chamado | rep, manager, admin |
| `/tickets/:id` | Detalhe do chamado + botão WhatsApp + mudar status | rep vê os próprios (read); manager/admin editam |
| `/customers` | Lista de clientes | manager/admin |
| `/customers/:id` | Detalhe do cliente | manager/admin |
| `/settings` | Nome da empresa, cor primária (só admin) | admin |

Sem `dashboard`, `kb`, `csat`, `chat`, `automation`, `sla`, `integrations`, `team invite`.

## 5.2. Tabelas (Neon do tenant)

| Tabela | Descrição | Escrita por |
|---|---|---|
| `tickets` | Chamados | rep (só os próprios) + manager/admin |
| `customers` | Clientes com telefone WhatsApp | manager/admin (rep pode criar ao abrir chamado) |
| `ticket_notes` | Notas internas do manager sobre o atendimento (opcional) | manager/admin |

**Tabelas de lookup (read-only pro rep):**
- Nenhuma, se `status` e `priority` viram enums no schema.

## 5.3. Fluxo completo (o que o usuário descreveu)

```
1. REP faz login (Better-Auth)
2. REP → /tickets/new → preenche cliente + assunto + descrição → cria ticket
     • ticket.status = 'open'
     • ticket.owner_id = rep (setado pelo gateway)
3. MANAGER/ADMIN abre /tickets → vê o chamado novo → clica
4. MANAGER clica em "Atender" → status vira 'in_progress' (opcional: assigned_to = manager.id)
5. MANAGER clica em "Abrir WhatsApp" → wa.me/<telefone>?text=... abre em nova aba
6. Conversa acontece 100% fora da plataforma
7. Manager volta ao ticket → clica "Concluir" → status = 'resolved'
8. (Opcional) Manager adiciona uma nota interna em ticket_notes descrevendo o que foi feito
```

## 5.4. Componentes reutilizáveis que ficam

- `StatusBadge` (open / in_progress / resolved) — 3 cores
- `PriorityBadge` (low / medium / high) — 3 cores, campo manual
- `AppShell` (herdado do scaffold do hub)
- `LoginScreen` (herdado)
- `RequireAuth` (herdado)

## 5.5. Dependências que ficam

- React 19, Vite 6, react-router-dom 7
- TanStack Query (cache de `list()`)
- Tailwind v4 + shadcn/ui **ou** CSS puro com tokens (decidir scaffold: **`wiki`** para visual "Pro" ou **`forms-nps`** para leve)
- `date-fns` (formatação)

## 5.6. Dependências que saem

- `@supabase/supabase-js`
- `@dnd-kit/*` (se decidir sair do kanban)
- `resend`, `emoji-picker-react`, `react-markdown` (KB)
- Qualquer coisa relacionada a webhook/HMAC (Zendesk)