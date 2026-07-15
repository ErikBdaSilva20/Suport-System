# 4. Remover — Features fora do escopo "CRUD + WhatsApp"

O usuário quer o mínimo: **abrir chamado → alguém atende por fora → marca como resolvido**. Toda feature além disso sai. Sobra o essencial para caber na fundação (§A3 "cabe hoje = dados + telas").

## 4.1. Live Chat em tempo real (remover)

**Motivo:** realtime é extensão de fundação (§A3). Além disso, o contato agora é WhatsApp — o chat interno perde razão de existir.

**Remover:**
- `src/pages/ClientChat.tsx` + rota `/c/:token`
- `src/components/LiveChatPanel.tsx`
- `src/components/live-chat/**` (AttachmentBubble, ClientTicketsPanel, EmojiBar, MessageActions, useLiveChatUpload)
- `src/infrastructure/realtime/MessagesRealtimeService.ts`
- `src/infrastructure/realtime/TicketsRealtimeService.ts`
- `src/presentation/context/RealtimeContext.tsx`
- Tabela `live_chat_messages`
- Edge function `verify-chat-access`

## 4.2. Base de Conhecimento (remover)

**Motivo:** o usuário não pediu; toda a KB só existia porque tinha IA em cima dela.

**Remover:**
- `src/pages/KBList.tsx`, `KBEditor.tsx`, `KBAssistant.tsx` + rotas `/kb/*`
- `src/domain/knowledge-base/**`, `src/application/knowledge-base/**`, `src/infrastructure/**/knowledge-base/**`
- `src/presentation/hooks/knowledge-base/**`
- Tabelas `kb_articles`, `kb_categories`, `kb_conversations`, `kb_conversation_messages`
- Função Postgres `search_kb_articles`

## 4.3. Notificações internas (remover)

**Motivo:** só faz sentido com múltiplos agentes disputando tickets e menções — o fluxo aqui é linear (rep abre, manager atende). Além disso, o sino de notificações pedia realtime.

**Remover:**
- `src/components/NotificationBell.tsx`, `MentionList.tsx`
- `src/presentation/hooks/notifications/useNotifications.ts`
- Tabela `notifications`
- Edge function `send-notification`

## 4.4. SLA (remover ou reduzir para status manual)

**Motivo:** SLA automático depende de **cron/jobs agendados** — extensão de fundação (§A3). O usuário não pediu SLA. Se quiser priorização, basta um `enum priority` no ticket.

**Remover:**
- `src/pages/settings/SLASettings.tsx`
- `src/components/SLABadge.tsx`
- `src/application/settings/SaveSLAPolicyUseCase.ts`
- `src/domain/ticketing/services/SLACalculator.ts`
- Tabela `sla_policies`
- Edge functions `calculate-sla`, `check-sla-breach`
- Colunas `sla_status`, `sla_first_response_due`, `sla_resolution_due`, `first_response_at` em `tickets`

## 4.5. Participantes, tags avançadas, auditoria (remover)

**Motivo:** um ticket tem 1 rep (owner) + 1 manager atendendo. Não precisa de "participantes". Auditoria + tags M:N vão além do CRUD mínimo.

**Remover:**
- `ticket_participants` + `TicketParticipantsCard.tsx`
- `ticket_tags` (join M:N) e `tags` — se o usuário quiser categorização simples, virar `category text` no próprio ticket
- `audit_log` + `AuditTimeline.tsx`
- `src/pages/settings/TagsSettings.tsx`

## 4.6. Anexos de ticket (remover)

**Motivo:** storage é extensão de fundação (§A3). Sem e-mail e sem chat, o anexo perde utilidade — se algo precisar ser mostrado, o cliente manda pelo WhatsApp.

**Remover:**
- `ticket_attachments`
- Uploads em `MessageComposer.tsx`

## 4.7. Portal do cliente (remover)

**Motivo:** o cliente **não loga**. Ele fala com o manager pelo WhatsApp. A rota `/c/:token` some, e o pacote `customer-portal` inteiro pode ser aparado.

**Remover:**
- `src/application/customer-portal/**` (mantendo só o CRUD básico de cliente em `lib/data/customers.repo.ts`)
- `src/domain/customer-portal/**`
- Página pública do cliente

> ⚠️ Se um dia o cliente **precisar** ver o próprio chamado sem logar, isso vira **extensão do gateway** (rota pública explícita — §B6). Não é template.

## 4.8. Kanban de arrastar-e-soltar (opcional remover)

**Motivo:** cabe na fundação (é só UI), mas exige `dnd-kit` etc. Se o objetivo é minimalismo CRUD, uma lista com filtro por status é suficiente. Deixar a critério.

- `src/components/TicketKanban.tsx`, `KanbanColumn.tsx`, `KanbanCard.tsx` — podem ficar como tela alternativa, mas não são obrigatórios.

## 4.9. Dashboard com KPIs (opcional)

**Motivo:** cabe na fundação (agrega no front após `list()`). Mantém se o usuário quiser; simplifica bastante — só 3 números: abertos / em atendimento / resolvidos no mês.

---

## Resumo — o que sai

- ❌ Live chat + realtime + chat público do cliente
- ❌ Base de Conhecimento inteira (páginas, hooks, tabelas)
- ❌ Notificações + sino + menções
- ❌ SLA automático + monitoramento
- ❌ Participantes, tags M:N, auditoria, anexos
- ❌ Portal do cliente / rota pública