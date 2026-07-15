# 8. Plano de migração (ordem sugerida)

> **Este documento é só um roteiro.** Nenhuma execução aqui. Serve para orientar a próxima sessão de trabalho, quando o usuário autorizar a limpeza.

A ordem abaixo minimiza "app quebrado no meio". Cada passo deixa o build passando.

## Passo 1 — Congelar features fora do escopo (UI-only)

- Remover rotas: `/kb/*`, `/csat/:token`, `/c/:token`, `/settings/automation`, `/settings/integrations`, `/settings/sla`, `/settings/tags`, `/setup` (passo Resend).
- Remover botões de "Responder e-mail", "Sugestões IA", "Chat com cliente", "Assistente KB".
- Trocar `MessageComposer` por um bloco simples "Nota interna" (usa `ticket_notes`).
- Adicionar botão "Abrir WhatsApp" no `TicketDetail`.

Build ainda usa Supabase. Só a UI mudou.

## Passo 2 — Remover Edge Functions

- Apagar `supabase/functions/**` inteira.
- Remover chamadas a `supabase.functions.invoke(...)` do código (todas as 26).
- Deletar secrets: `LOVABLE_API_KEY`, `RESEND_API_KEY`, `ZENDESK_*`.

## Passo 3 — Remover camadas de IA/KB/Chat/SLA no código

- Apagar diretórios:
  - `src/application/knowledge-base/`
  - `src/domain/knowledge-base/`
  - `src/infrastructure/**/knowledge-base/`
  - `src/presentation/hooks/knowledge-base/`
  - `src/infrastructure/realtime/`
  - `src/presentation/context/RealtimeContext.tsx`
  - `src/components/live-chat/`, `LiveChatPanel.tsx`
  - `src/components/kb/`
  - `src/components/AISuggestionCard.tsx`, `SimilarTicketsCard.tsx`, `CustomerHistoryChat.tsx`, `CustomerHistoryDrawer.tsx`
  - `src/components/NotificationBell.tsx`, `MentionList.tsx`
  - `src/components/SLABadge.tsx`, `AuditTimeline.tsx`
  - `src/domain/ticketing/services/SLACalculator.ts` (+ testes)

## Passo 4 — Simplificar schema (nova migration)

- Criar migration única que dropa: `csat_responses`, `email_inbound_events`, `kb_*`, `live_chat_messages`, `notifications`, `priority_rules`, `sla_policies`, `ticket_ai_suggestions`, `ticket_attachments`, `ticket_email_messages`, `ticket_participants`, `ticket_tags`, `tags`, `audit_log`, `settings`.
- Dropar colunas de SLA/e-mail em `tickets`.
- Dropar `profiles`, `has_role`, `get_my_role`, `search_kb_articles`.
- Remover **todas** as policies e `alter table ... enable row level security`.
- Adicionar `customers.phone_e164`, `customers.owner_id`, `ticket_notes`, enums.

## Passo 5 — Trocar Supabase pelo gateway

**Este é o passo maior.** Duas sub-opções:

### 5a. Manter Supabase (só remove RLS e IA/email) — não recomendado

Fica **fora da fundação**, mas funcional. Só serve se o usuário decidir **não** publicar no hub.

### 5b. Migrar para o scaffold `wiki` (ou `forms-nps`) — recomendado

1. `cp -R clone-templates/wiki clone-templates/helpdesk-crud`
2. Trazer só as **telas** deste projeto (`TicketList`, `TicketDetail`, `TicketNew`, `CustomerList`, `CustomerDetail`) e adaptar imports para `src/lib/data/*.repo.ts`.
3. Criar `src/lib/data/tickets.repo.ts`, `customers.repo.ts`, `ticket_notes.repo.ts` chamando `db.table()`.
4. Achatar Clean Architecture — sem `application/`, `domain/`, `infrastructure/`.
5. Copiar migration do passo 4 para `supabase/migrations/0001_business_schema.sql` do novo template.
6. Preencher `src/lib/data/types.gen.ts` batendo com o schema.
7. Preencher `masi.template.json` (id `helpdesk-crud`, engine `vite-react-gateway`, screens, roles).
8. Adaptar branch PREVIEW de `client.ts` com fixtures de ticket/cliente.
9. `npm run build` limpo (sem imports não usados).

## Passo 6 — Publish

```bash
pnpm templates:publish helpdesk-crud https://masi-tenant-gateway.fly.dev
pnpm demo:publish helpdesk-crud
```

Registrar no catálogo (migration em `masi-ai-orquestration/supabase/migrations/`), redeploy Fly.

## Passo 7 — QA

- Clone real via hub.
- 1º usuário → admin.
- Convida rep → rep abre ticket → admin vê → clica WhatsApp → volta e marca resolvido.
- Rep tenta abrir ticket alheio → 403 do gateway.

---

## Estimativa grosseira de esforço

| Passo | Complexidade | Notas |
|---|---|---|
| 1. Congelar UI fora de escopo | Baixa | 1 sessão |
| 2. Deletar edge functions | Baixa | 1 sessão |
| 3. Deletar camadas de código | Média | 1-2 sessões (cuidado com imports órfãos) |
| 4. Nova migration | Média | 1 sessão |
| 5b. Migrar para scaffold | **Alta** | 3-5 sessões (é praticamente reescrever o app) |
| 6. Publish | Baixa | Depende de acesso ao repo `masi-ai-orquestration` |
| 7. QA | Baixa | 1 sessão |

> **Decisão pendente do usuário:** se o objetivo é **rodar internamente** (Lovable + Supabase, sem hub), o passo 5b vira 5a e o esforço cai pela metade. Se o objetivo é **publicar no hub como app pronto**, 5b é obrigatório.