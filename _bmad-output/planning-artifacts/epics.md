---
stepsCompleted: ["requirements-extracted", "epics-designed", "stories-created"]
inputDocuments:
  - Importantdoc.md
  - doc/00-visao-geral.md
  - doc/01-violacoes-de-fundacao.md
  - doc/02-remover-ia.md
  - doc/03-remover-email.md
  - doc/04-remover-features-fora-de-escopo.md
  - doc/05-mapa-do-que-fica.md
  - doc/06-schema-alvo.md
  - doc/07-papeis-rep-manager-admin.md
  - doc/08-plano-de-migracao.md
---

# helpdesk-masia - Epic Breakdown

## Overview

Este documento decompõe a auditoria de `doc/00` a `doc/08` (feita contra o guia de fundação `Importantdoc.md`) em épicos e stories acionáveis. Nenhum código foi alterado — este é só o planejamento.

**Objetivo do produto:** transformar o projeto atual (SaaS Help Desk completo estilo Zendesk, com Supabase direto no browser, RLS, 26 Edge Functions, IA, e-mail, realtime, KB, SLA) em um **Help Desk 100% CRUD** rodando na fundação `tenant-gateway + Neon + Better-Auth`, com papéis **rep / manager / admin** e contato com o cliente via link **WhatsApp (`wa.me`)**, sem IA e sem e-mail.

> **Decisão confirmada pelo usuário (não-negociável):** o projeto deve obedecer **integralmente** `Importantdoc.md`. Isso significa: banco **Neon** (não Supabase), app **SPA** (Vite + React, sem Next/SSR, sem backend próprio), e **zero exceção** às regras do guia. A rota "5a" do plano de migração (manter Supabase, só remover RLS/IA/e-mail) está **descartada** — a única rota válida é a "5b": migração completa para `tenant-gateway + Neon + Better-Auth`. Todo Epic abaixo (em especial o Epic 5) deve ser executado com esse padrão como critério de aceite adicional.

> **Decisão posterior do usuário — `rep` vira o cliente (reverte Story 3.3, substitui o fluxo da 6.4):** depois da migração concluída, o usuário decidiu que `rep` deixa de ser "funcionário que abre chamado" e passa a ser **o próprio cliente**, autocadastrado com nome/e-mail/senha/**telefone** (o canal de contato do suporte). `manager` continua sendo o funcionário atendente; `admin` continua vendo tudo e agora também **cria contas de funcionário diretamente** (nome+e-mail, senha gerada — sem autocadastro de equipe depois do 1º admin). Isso reverte a remoção do portal do cliente (Story 3.3) e substitui, na prática, o autocadastro de cliente pelo rep (Story 6.4) — o fluxo manual antigo permanece disponível só pra manager/admin. Detalhe completo em `doc/07-papeis-rep-manager-admin.md`. **Limitação:** a trava "cadastro de cliente nunca vira admin" e o endpoint de criação de funcionário só existem hoje no `local-gateway` (mock local); o tenant-gateway real precisa da mesma lógica antes de publicar em produção.

## Requirements Inventory

### Functional Requirements

FR1: Rep faz login (Better-Auth) e abre um novo chamado (ticket) vinculado a um cliente.
FR2: Rep vê apenas os próprios chamados (`owner_id`); manager/admin veem todos os chamados do tenant.
FR3: Manager/admin assume um chamado (`status: open → in_progress`, opcionalmente `assigned_to = self`).
FR4: Manager/admin abre uma conversa no WhatsApp do cliente via link `wa.me/<telefone>?text=...` pré-preenchido, sem qualquer backend de mensageria.
FR5: Manager/admin marca um chamado como concluído (`status → resolved`, `resolved_at` preenchido).
FR6: Manager/admin adiciona notas internas (`ticket_notes`) descrevendo o que foi tratado no WhatsApp.
FR7: Rep/manager/admin cadastra um cliente (nome, telefone E.164, e-mail opcional, notas) ao abrir o chamado.
FR8: Manager/admin lista e visualiza detalhes de clientes cadastrados.
FR9: Admin configura nome da empresa e cor primária em `/settings`.
FR10: O 1º usuário do tenant vira admin automaticamente; os demais entram como `rep`; admin promove alguém a `manager`.

### NonFunctional Requirements

NFR1: Toda comunicação de dados passa exclusivamente por `db.table()` do tenant-gateway (`GET/POST/PATCH/DELETE /data/:table`) — proibido `@supabase`, fetch cru ou driver SQL no browser. [Source: Importantdoc.md#B3]
NFR2: Nenhuma tabela tem RLS/`create policy`/`auth.uid()`; autorização é feita no gateway via `owner_id` da sessão Better-Auth. [Source: Importantdoc.md#B4; doc/01-violacoes-de-fundacao.md#1.2]
NFR3: Toda tabela escrita pelo rep — **inclusive tabelas-filhas** (`ticket_notes`) — tem `owner_id text references "user"(id) on delete cascade`. [Source: Importantdoc.md#B4.1]
NFR4: Nenhuma Edge Function / backend próprio permanece no projeto; o único backend é o tenant-gateway. [Source: Importantdoc.md#B1; doc/01-violacoes-de-fundacao.md#1.4]
NFR5: Zero integração de IA/LLM em qualquer tela, hook ou função. [Source: doc/02-remover-ia.md]
NFR6: Zero envio/recebimento de e-mail transacional (Resend) e zero integração Zendesk. [Source: doc/03-remover-email.md]
NFR7: Sem realtime (Supabase Realtime/WebSocket); atualizações via refetch/`invalidate` do React Query. [Source: doc/01-violacoes-de-fundacao.md#1.5]
NFR8: Telas não dependem de get-by-id nem de joins no banco — resolução via **list-then-find** no front (2 queries quando precisar relacionar). [Source: Importantdoc.md#B5; doc/01-violacoes-de-fundacao.md#1.6]
NFR9: Stack alvo: React 19 + Vite 6 + react-router-dom 7 + TanStack Query + TypeScript strict (`noUnusedLocals`, zero imports não usados). [Source: Importantdoc.md#B3; doc/01-violacoes-de-fundacao.md#1.10]
NFR10: `masi.template.json` declara `engine: "vite-react-gateway"`, `envContract: ["VITE_GATEWAY_URL"]`, `roles: ["admin","manager","rep"]`, e `editable.allow/protect` corretos. [Source: Importantdoc.md#B7; doc/01-violacoes-de-fundacao.md#1.9]

### Additional Requirements

- Nova migration única de schema substitui `supabase/migrations/0001_business_schema.sql`, contendo apenas `customers`, `tickets`, `ticket_notes`, enums `ticket_status`/`ticket_priority` e triggers `touch_updated_at`. Roda no **Neon** do tenant, não em um projeto Supabase. [Source: doc/06-schema-alvo.md]
- Ponto de partida recomendado: clonar o scaffold `wiki` (Tailwind v4 + shadcn, visual "Pro") **ou** `forms-nps` (CSS puro, mais leve) — decisão pendente do usuário (ver Story 8.2). Ambos são SPA Vite + React, nenhum SSR. [Source: doc/05-mapa-do-que-fica.md#5.5; doc/08-plano-de-migracao.md#Passo 5]
- Publish exige `pnpm templates:publish helpdesk-crud https://masi-tenant-gateway.fly.dev` (gateway https público, nunca localhost) + `pnpm demo:publish helpdesk-crud`, registro em `masi-ai-orquestration/supabase/migrations/` e redeploy do Fly (API + worker). [Source: Importantdoc.md#B10; doc/08-plano-de-migracao.md#Passo 6]
- **Confirmado pelo usuário:** a rota "5a" (manter Supabase, sem migrar para o gateway) está fora de cogitação. O Passo 5 do plano de migração é sempre "5b" — migração completa para `tenant-gateway + Neon`, app **SPA** (Vite + React, sem Next/SSR, sem backend por app), respeitando **todas** as regras de `Importantdoc.md` sem exceção. [Source: doc/08-plano-de-migracao.md#Passo 5; doc/01-violacoes-de-fundacao.md; Importantdoc.md#B1, #B3]

### FR Coverage Map

| Requisito | Épico |
|---|---|
| FR1, FR7 | Epic 5, Epic 6 |
| FR2, FR10 | Epic 6 |
| FR3, FR5, FR6 | Epic 5, Epic 6 |
| FR4 | Epic 7 |
| FR8, FR9 | Epic 5 |
| NFR1, NFR7, NFR8 | Epic 5 |
| NFR2, NFR3 | Epic 4, Epic 6 |
| NFR4 | Epic 2 |
| NFR5 | Epic 2, Epic 3 |
| NFR6 | Epic 2, Epic 3, Epic 7 |
| NFR9, NFR10 | Epic 8 |

## Epic List

1. Congelar UI fora de escopo (higiene de rotas/botões, build ainda com Supabase)
2. Remover Edge Functions e segredos (IA, e-mail, Zendesk, SLA, notificações, chat, anexos)
3. Remover camadas de código fora de escopo (IA, KB, Live Chat, Realtime, SLA, Notificações, Participantes/Tags/Auditoria, Anexos, Portal do cliente)
4. Novo schema-alvo (Neon-ready)
5. Migrar para a fundação tenant-gateway (Supabase → `db`/`auth`, achatar Clean Architecture)
6. Papéis Rep / Manager / Admin via Better-Auth
7. Fluxo WhatsApp (substitui e-mail/chat com cliente)
8. Manifest do template e contrato do hub
9. Publish, catálogo e QA end-to-end

---

## Epic 1: Congelar UI fora de escopo

Remover, na camada de UI, tudo que não faz parte do CRUD "ticket + cliente + WhatsApp", sem tocar ainda em dados/Supabase — o build continua passando com Supabase por trás. Isso evita "app quebrado no meio" nos épicos seguintes. [Source: doc/08-plano-de-migracao.md#Passo 1]

### Story 1.1: Remover rotas fora de escopo do roteador

Como desenvolvedor,
quero remover as rotas `/kb/*`, `/csat/:token`, `/c/:token`, `/settings/automation`, `/settings/integrations`, `/settings/sla`, `/settings/tags` e o passo Resend de `/setup`,
para que o roteador só exponha as telas do escopo CRUD aprovado.

**Acceptance Criteria:**

**Given** o roteador atual da aplicação
**When** a limpeza é aplicada
**Then** nenhuma das rotas listadas acima deve resolver para um componente
**And** o build (`vite build`) continua passando sem imports órfãos

### Story 1.2: Remover botões/ações de IA, e-mail e chat da tela de ticket

Como desenvolvedor,
quero remover os botões "Responder por e-mail", "Sugestões IA", "Chat com cliente" e "Assistente KB" do `TicketDetail`/`MessageComposer`,
para que a tela de detalhe do chamado só ofereça ações compatíveis com o novo escopo.

**Acceptance Criteria:**

**Given** a tela `TicketDetail.tsx` e o componente `MessageComposer`
**When** os botões fora de escopo são removidos
**Then** nenhum botão de IA/e-mail/chat/KB aparece na UI
**And** os imports/hooks associados (`useAISuggestions`, `SimilarTicketsCard`, `CustomerHistoryChat`, `CustomerHistoryDrawer`) são removidos ou desconectados sem quebrar o build

### Story 1.3: Substituir composer de mensagem por bloco de "Nota interna"

Como manager/admin,
quero registrar uma nota interna sobre o atendimento (em vez de compor uma mensagem de e-mail/chat),
para que o histórico do que foi tratado no WhatsApp fique documentado no ticket.

**Acceptance Criteria:**

**Given** o `MessageComposer` atual (upload + envio de e-mail/chat)
**When** ele é substituído por um bloco simples de "Nota interna"
**Then** o formulário permite escrever e salvar texto associado ao ticket (via `ticket_notes`, ver Epic 4/5)
**And** nenhuma opção de anexo/upload/e-mail permanece visível

### Story 1.4: Adicionar botão "Abrir WhatsApp" no detalhe do chamado

Como manager/admin,
quero um botão que abra `wa.me/<telefone>?text=...` em nova aba a partir do detalhe do ticket,
para iniciar a conversa real com o cliente fora da plataforma.

**Acceptance Criteria:**

**Given** um ticket com cliente associado (telefone em E.164)
**When** o manager/admin clica em "Abrir conversa no WhatsApp"
**Then** uma nova aba abre `https://wa.me/<phone_e164>?text=<mensagem-codificada>`
**And** o rep não vê esse botão (ver Epic 6, UI condicional por role)

---

## Epic 2: Remover Edge Functions e segredos

Apagar as 26 Edge Functions do projeto (IA, e-mail/Zendesk, SLA/notificações/chat/anexos) e todo segredo associado, já que não existe backend por app — o único backend é o tenant-gateway. [Source: Importantdoc.md#B1; doc/01-violacoes-de-fundacao.md#1.4]

### Story 2.1: Remover as 7 Edge Functions de IA

Como desenvolvedor,
quero apagar `classify-ticket-priority`, `auto-first-response`, `on-ticket-created-pipeline`, `find-similar-tickets`, `client-similar-tickets`, `client-tickets-chat`, `customer-history-chat`, `kb-assistant`, `analyze-customer-reply`,
para eliminar toda dependência de IA no backend do app.

**Acceptance Criteria:**

**Given** `supabase/functions/**`
**When** as funções de IA listadas são removidas
**Then** nenhuma chamada `supabase.functions.invoke(...)` para essas funções permanece no código de app
**And** `LOVABLE_API_KEY` e chamadas a `https://ai.gateway.lovable.dev` não existem mais no repositório

*(Nota: a lista da auditoria tem 9 nomes de função na seção de IA — story cobre todos.)*
[Source: doc/02-remover-ia.md#2.1, #2.5]

### Story 2.2: Remover as Edge Functions de e-mail/Zendesk

Como desenvolvedor,
quero apagar `send-reply-email`, `send-csat-survey`, `send-notification`, `resend-inbound-webhook`, `save-resend-key`, `zendesk-inbound-webhook`, `push-zendesk-reply`, `push-zendesk-status`, `sync-zendesk-tickets`, `save-zendesk-secret`, `admin-reset-password`, `check-signup-allowed`, `invite-agent`, `verify-chat-access`,
para eliminar toda dependência de e-mail e da integração espelho com Zendesk.

**Acceptance Criteria:**

**Given** `supabase/functions/**`
**When** as funções listadas são removidas
**Then** nenhuma chamada a essas funções permanece no código de app
**And** os segredos `RESEND_API_KEY`, `ZENDESK_SUBDOMAIN`, `ZENDESK_EMAIL`, `ZENDESK_API_TOKEN` e qualquer `*_WEBHOOK_SECRET` são removidos

[Source: doc/03-remover-email.md#3.1, #3.4]

### Story 2.3: Remover as Edge Functions de SLA/notificações/chat/anexos

Como desenvolvedor,
quero apagar `calculate-sla`, `check-sla-breach`, `send-notification` (se ainda não removida na Story 2.2) e demais funções de suporte a live chat/anexos,
para fechar as 26 Edge Functions totais do projeto.

**Acceptance Criteria:**

**Given** `supabase/functions/**`
**When** todas as funções remanescentes fora do CRUD puro são removidas
**Then** o diretório `supabase/functions/` fica vazio (ou é removido inteiramente)
**And** um `grep` por `functions.invoke` no código de app não retorna nenhuma ocorrência

[Source: doc/04-remover-features-fora-de-escopo.md#4.3, #4.4; doc/08-plano-de-migracao.md#Passo 2]

### Story 2.4: Auditar e remover chamadas remanescentes a Edge Functions no app

Como desenvolvedor,
quero confirmar que nenhum ponto do app (use cases, hooks, componentes) ainda referencia uma Edge Function apagada,
para que o app não quebre em runtime por causa de uma função inexistente.

**Acceptance Criteria:**

**Given** o código-fonte após as Stories 2.1–2.3
**When** eu busco por `functions.invoke` e pelos nomes das 26 funções no repositório
**Then** nenhuma ocorrência é encontrada fora de `supabase/functions/**` (que já foi removido)
**And** `CreateTicketUseCase` não chama mais `on-ticket-created-pipeline` — cria o ticket e para aí

[Source: doc/02-remover-ia.md#2.2]

---

## Epic 3: Remover camadas de código fora de escopo

Apagar os diretórios/componentes/hooks de IA, KB, Live Chat, Realtime, Notificações, SLA, Participantes/Tags/Auditoria, Anexos e Portal do cliente. [Source: doc/08-plano-de-migracao.md#Passo 3]

### Story 3.1: Remover camada de código de IA do app

Como desenvolvedor,
quero apagar `src/presentation/hooks/ticketing/useAISuggestions.ts`, `src/components/AISuggestionCard.tsx`, `src/components/ticket/SimilarTicketsCard.tsx`, `src/components/ticket/CustomerHistoryChat.tsx`, `src/components/ticket/CustomerHistoryDrawer.tsx`, `src/pages/KBAssistant.tsx`, `src/presentation/hooks/knowledge-base/useKBAssistant.ts`, `src/presentation/hooks/knowledge-base/useKBConversations.ts`, `src/components/kb/ConversationSidebar.tsx`,
para eliminar todo código de app dependente de IA.

**Acceptance Criteria:**

**Given** os arquivos listados
**When** eles são removidos
**Then** o build (`tsc && vite build`) passa sem erros de import quebrado
**And** nenhum componente remanescente referencia esses arquivos

[Source: doc/02-remover-ia.md#2.2]

### Story 3.2: Remover a Base de Conhecimento inteira

Como desenvolvedor,
quero apagar `src/pages/KBList.tsx`, `KBEditor.tsx`, `KBAssistant.tsx` (+ rotas `/kb/*`), `src/domain/knowledge-base/**`, `src/application/knowledge-base/**`, `src/infrastructure/**/knowledge-base/**`, `src/presentation/hooks/knowledge-base/**` e a função Postgres `search_kb_articles`,
para remover uma feature que só existia por causa da IA.

**Acceptance Criteria:**

**Given** os diretórios/arquivos de KB
**When** removidos
**Then** nenhuma rota `/kb/*` resolve
**And** `search_kb_articles` não existe mais na migration alvo (ver Epic 4)

[Source: doc/04-remover-features-fora-de-escopo.md#4.2]

### Story 3.3: Remover Live Chat, Realtime e Portal do cliente

Como desenvolvedor,
quero apagar `src/pages/ClientChat.tsx` (+ rota `/c/:token`), `src/components/LiveChatPanel.tsx`, `src/components/live-chat/**`, `src/infrastructure/realtime/MessagesRealtimeService.ts`, `src/infrastructure/realtime/TicketsRealtimeService.ts`, `src/presentation/context/RealtimeContext.tsx`, a Edge function `verify-chat-access`, `src/application/customer-portal/**`, `src/domain/customer-portal/**` e a página pública do cliente,
para remover toda dependência de realtime e o acesso do cliente sem login.

**Acceptance Criteria:**

**Given** os arquivos/diretórios listados
**When** removidos
**Then** nenhuma tela depende de assinatura Supabase Realtime
**And** o cliente não tem mais rota própria — todo contato acontece por WhatsApp (Epic 7)
**And** `lib/data/customers.repo.ts` mantém só o CRUD básico de cliente

[Source: doc/01-violacoes-de-fundacao.md#1.5; doc/04-remover-features-fora-de-escopo.md#4.1, #4.7]

### Story 3.4: Remover notificações internas

Como desenvolvedor,
quero apagar `src/components/NotificationBell.tsx`, `MentionList.tsx`, `src/presentation/hooks/notifications/useNotifications.ts` e a tabela `notifications`,
para remover uma feature que só fazia sentido com múltiplos agentes disputando tickets/menções.

**Acceptance Criteria:**

**Given** os arquivos e a tabela `notifications`
**When** removidos
**Then** nenhum sino de notificação aparece na UI
**And** a tabela `notifications` é dropada na migration alvo (Epic 4)

[Source: doc/04-remover-features-fora-de-escopo.md#4.3]

### Story 3.5: Remover SLA automático

Como desenvolvedor,
quero apagar `src/pages/settings/SLASettings.tsx`, `src/components/SLABadge.tsx`, `src/application/settings/SaveSLAPolicyUseCase.ts`, `src/domain/ticketing/services/SLACalculator.ts` (+ testes) e a tabela `sla_policies`,
para remover uma feature que dependia de cron/jobs agendados (fora da fundação).

**Acceptance Criteria:**

**Given** os arquivos e a tabela `sla_policies`
**When** removidos
**Then** nenhuma tela de configuração de SLA existe
**And** as colunas `sla_status`, `sla_first_response_due`, `sla_resolution_due`, `first_response_at` são dropadas de `tickets` na migration alvo (Epic 4)

[Source: doc/04-remover-features-fora-de-escopo.md#4.4]

### Story 3.6: Remover participantes, tags avançadas e auditoria

Como desenvolvedor,
quero apagar `ticket_participants` + `TicketParticipantsCard.tsx`, `ticket_tags`/`tags`, `audit_log` + `AuditTimeline.tsx`, `src/pages/settings/TagsSettings.tsx`,
para simplificar o modelo a "1 rep (owner) + 1 manager atendendo", sem M:N nem trilha de auditoria.

**Acceptance Criteria:**

**Given** os arquivos e tabelas listados
**When** removidos
**Then** nenhuma tela de tags/participantes/auditoria existe
**And**, se o usuário quiser categorização simples, uma coluna `category text` é adicionada diretamente em `tickets` (ver Epic 4, Story 4.3) em vez de uma tabela de lookup

[Source: doc/04-remover-features-fora-de-escopo.md#4.5]

### Story 3.7: Remover anexos de ticket

Como desenvolvedor,
quero apagar a tabela `ticket_attachments`, o upload em `MessageComposer.tsx`, `SupabaseStorageService` e o bucket de storage,
para remover a dependência de storage pesado — sem e-mail/chat, o anexo perde utilidade (o que precisar ser mostrado vai pelo WhatsApp).

**Acceptance Criteria:**

**Given** o serviço de storage e a tabela `ticket_attachments`
**When** removidos
**Then** nenhuma tela oferece upload de arquivo
**And** nenhuma referência a `SupabaseStorageService` permanece no código

[Source: doc/01-violacoes-de-fundacao.md#1.7; doc/04-remover-features-fora-de-escopo.md#4.6]

### Story 3.8 (decisão do usuário): Kanban de arrastar-e-soltar e Dashboard de KPIs

Como product owner,
quero decidir se `TicketKanban.tsx`/`KanbanColumn.tsx`/`KanbanCard.tsx` (drag-and-drop via `dnd-kit`) e um dashboard com 3 números (abertos/em atendimento/resolvidos) ficam no escopo v1,
para equilibrar minimalismo CRUD vs. conveniência de UI.

**Acceptance Criteria:**

**Given** que ambas as features cabem na fundação (são só UI/agregação no front)
**When** o usuário decide mantê-las ou não
**Then** se mantidas, o Kanban usa `dnd-kit` como tela alternativa (não obrigatória) e o dashboard agrega localmente após `listTickets()`
**And** se descartadas, `@dnd-kit/*` sai da lista de dependências (ver Epic 5, Story 5.5)

[Source: doc/04-remover-features-fora-de-escopo.md#4.8, #4.9] — **requer decisão do usuário antes de planejar a implementação**

---

## Epic 4: Novo schema-alvo (Neon-ready)

Substituir `supabase/migrations/0001_business_schema.sql` por um schema mínimo seguindo §B4 do guia: sem RLS, `owner_id text references "user"(id)`, `snake_case`, sem nomes reservados. [Source: doc/06-schema-alvo.md]

### Story 4.1: Migration de poda — dropar tudo fora de escopo

Como desenvolvedor,
quero uma migration que dropa `csat_responses`, `email_inbound_events`, `kb_articles`, `kb_categories`, `kb_conversations`, `kb_conversation_messages`, `live_chat_messages`, `notifications`, `priority_rules`, `sla_policies`, `ticket_ai_suggestions`, `ticket_attachments`, `ticket_email_messages`, `ticket_participants`, `ticket_tags`, `tags`, `audit_log`, `settings`, além de `profiles`, `has_role`, `get_my_role`, `search_kb_articles`, e todas as `policy`/`enable row level security`,
para eliminar de vez as tabelas e funções fora do escopo CRUD.

**Acceptance Criteria:**

**Given** o schema atual do projeto
**When** a migration de poda roda
**Then** nenhuma das tabelas/funções listadas existe mais no banco
**And** nenhuma linha `enable row level security` ou `create policy` permanece em `supabase/migrations/*.sql`
**And** as colunas de SLA/e-mail em `tickets` (`sla_status`, `sla_first_response_due`, `sla_resolution_due`, `first_response_at`, `email_message_id`) são dropadas

[Source: doc/08-plano-de-migracao.md#Passo 4]

### Story 4.2: Criar schema-alvo (customers, tickets, ticket_notes)

Como desenvolvedor,
quero criar as tabelas `customers`, `tickets`, `ticket_notes`, os enums `ticket_status`/`ticket_priority`, e os triggers `touch_updated_at`, exatamente como especificado em `doc/06-schema-alvo.md`,
para que o app tenha um schema mínimo compatível com o modo genérico do gateway.

**Acceptance Criteria:**

**Given** o SQL de referência do documento 06
**When** a migration roda no Neon do tenant
**Then** `customers` tem `owner_id text not null references "user"(id) on delete cascade`, `phone_e164`, `email`, `notes`
**And** `tickets` tem `owner_id`, `customer_id references customers(id) on delete restrict`, `status ticket_status`, `priority ticket_priority`, `assigned_to text references "user"(id) on delete set null`, `resolved_at`
**And** `ticket_notes` tem `owner_id` e `ticket_id references tickets(id) on delete cascade`
**And** nenhuma tabela tem RLS, `auth.uid()`, ou referência a `auth.users` — só `"user"(id)` entre aspas
**And** `number` em `tickets` é `bigserial` preenchido pelo Postgres (nunca mandado do front)

[Source: doc/06-schema-alvo.md; Importantdoc.md#B4]

### Story 4.3 (opcional): Adicionar coluna `category` em tickets

Como product owner,
quero decidir se categoria/departamento vira uma coluna simples (`category text`) em `tickets` em vez de uma tabela de lookup,
para evitar uma tabela `categories` só para dropdown.

**Acceptance Criteria:**

**Given** a decisão do usuário sobre categorização
**When** confirmada
**Then** `alter table tickets add column category text;` é aplicada
**And** nenhuma tabela `categories` é criada

[Source: doc/06-schema-alvo.md#Se o usuário quiser categoria/departamento] — **requer decisão do usuário**

---

## Epic 5: Migrar para a fundação tenant-gateway

O passo de maior esforço: trocar todo acesso direto ao Supabase pelo `db`/`auth` do gateway, e achatar a Clean Architecture em `screens/` + `components/` + `lib/data/*.repo.ts`. [Source: doc/08-plano-de-migracao.md#Passo 5; doc/01-violacoes-de-fundacao.md#1.1, #1.8]

### Story 5.1: Substituir cliente Supabase pelo `db`/`auth` do gateway

Como desenvolvedor,
quero remover `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, todas as 17 classes em `src/infrastructure/supabase/**` (`SupabaseTicketRepository`, `SupabaseTicketMessageRepository`, `SupabaseCustomerRepository`, `SupabaseProfileRepository`, `SupabaseSettingsRepository`, `SupabaseAuthService`, `SupabaseStorageService`, etc.) e as variáveis `.env` `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`,
para que o app fale exclusivamente com o tenant-gateway.

**Acceptance Criteria:**

**Given** o cliente `src/lib/data/client.ts` herdado do scaffold (protegido, não reescrever à mão)
**When** todo código do app é migrado para usá-lo
**Then** nenhum arquivo do app importa `@supabase/supabase-js`
**And** `db.table('<x>').list/create/update/remove` é o único ponto de acesso a dados

[Source: doc/01-violacoes-de-fundacao.md#1.1; Importantdoc.md#B5]

### Story 5.2: Criar repositórios finos (`*.repo.ts`)

Como desenvolvedor,
quero criar `src/lib/data/tickets.repo.ts`, `src/lib/data/customers.repo.ts`, `src/lib/data/ticket_notes.repo.ts` usando `db.table()`,
para substituir as classes de repositório Supabase por funções finas e editáveis pela IA.

**Acceptance Criteria:**

**Given** o schema-alvo (Epic 4)
**When** os repos são criados
**Then** `listTickets`, `createTicket`, `updateTicket`, `deleteTicket` (e equivalentes para customers/ticket_notes) existem e chamam `db.table('<tabela>')`
**And** nenhum repo tenta mandar `owner_id` no `create`/`update` — o gateway seta pela sessão

[Source: doc/01-violacoes-de-fundacao.md#1.1; Importantdoc.md#B5]

### Story 5.3: Implementar list-then-find no front (sem get-by-id, sem joins)

Como desenvolvedor,
quero que `TicketDetail` (por `:id`) e qualquer relação (`customer_id`, `assigned_agent_id`) sejam resolvidos com `list()` + `.find()` no front, em vez de `findById` ou join no banco,
para respeitar o limite do modo genérico do gateway (só `list/create/update/remove`, sem filtro por query).

**Acceptance Criteria:**

**Given** uma tela que hoje usa `SupabaseTicketRepository.findById` ou `GetTicketDetailUseCase`
**When** migrada
**Then** ela faz `const tickets = await listTickets(); const ticket = tickets.find(t => t.id === id)`
**And** relações com `customers` são resolvidas com uma segunda chamada `listCustomers()` + `Map<id, customer>` no front

[Source: doc/01-violacoes-de-fundacao.md#1.6; Importantdoc.md#B5]

### Story 5.4: Achatar Clean Architecture em `screens/`/`components/`/`lib/data/`

Como desenvolvedor,
quero eliminar `src/domain/**`, `src/application/**`, `src/infrastructure/**`, `src/presentation/**` (~80 arquivos) e reescrever como `src/screens/TicketsScreen.tsx`, `TicketDetailScreen.tsx`, `CustomersScreen.tsx`, `LoginScreen.tsx` + repos em `src/lib/data/`,
para bater com o padrão esperado pelo editor de IA (`masi.template.json` com `allow: ['src/screens/**', 'src/components/**', 'src/lib/data/*.repo.ts', ...]`).

**Acceptance Criteria:**

**Given** a estrutura de 4 camadas atual
**When** achatada
**Then** as telas do escopo aprovado (Epic 1/tickets/customers/settings) existem em `src/screens/`
**And** nenhum diretório `domain/`, `application/`, `infrastructure/`, `presentation/` permanece
**And** o build (`tsc && vite build`) passa limpo

[Source: doc/01-violacoes-de-fundacao.md#1.8]

### Story 5.5: Atualizar stack e remover dependências órfãs

Como desenvolvedor,
quero subir para React 19 + Vite 6 + react-router-dom 7, e remover `@supabase/supabase-js`, `resend`, `emoji-picker-react`, `react-markdown`, quaisquer libs de webhook/HMAC do Zendesk, e (se decidido na Story 3.8) `@dnd-kit/*`,
para compatibilizar com o scaffold, o `Sandpack` do editor de IA e o pipeline de publish.

**Acceptance Criteria:**

**Given** o `package.json` atual (React 18 + Vite 5)
**When** atualizado
**Then** `package.json` declara React 19, Vite 6, react-router-dom 7
**And** nenhuma das dependências órfãs listadas aparece em `package.json`/`package-lock.json`
**And** `npm run build` passa sem warnings de import não usado

[Source: doc/01-violacoes-de-fundacao.md#1.10; doc/05-mapa-do-que-fica.md#5.5, #5.6]

---

## Epic 6: Papéis Rep / Manager / Admin via Better-Auth

Mapear o pedido do usuário ("rep abre chamado; manager/admin atende e conclui") para o modelo de papéis já previsto na fundação (`admin`/`manager`/`rep`). [Source: doc/07-papeis-rep-manager-admin.md]

### Story 6.1: Remover `profiles`/`has_role()`/`get_my_role()`; consumir `auth.me()`

Como desenvolvedor,
quero remover a tabela `profiles`, `src/domain/identity/entities/Profile.ts` e as funções Postgres `has_role()`/`get_my_role()`, e ler `{ user, role }` via `auth.me()` de `src/lib/auth.tsx`,
para que o papel do usuário venha do Better-Auth do gateway, não de uma tabela própria.

**Acceptance Criteria:**

**Given** o hook `useAuth()` herdado do scaffold
**When** a migração é feita
**Then** `role` é lido de `auth.me()`, nunca de uma query a `profiles`
**And** a tabela `profiles` não existe mais no schema (coberto também pela Story 4.1)

[Source: doc/01-violacoes-de-fundacao.md#1.3; doc/07-papeis-rep-manager-admin.md#7.5]

### Story 6.2: UI condicional por role (esconder Atender/Concluir/WhatsApp para rep)

Como rep,
quero **não** ver os botões "Atender", "Concluir" e "Abrir WhatsApp" nos meus próprios chamados,
para que a interface reflita corretamente que só manager/admin conduzem o atendimento.

**Acceptance Criteria:**

**Given** `const { role } = useAuth()`
**When** `role === 'rep'`
**Then** os botões "Atender", "Concluir" e "Abrir WhatsApp" não são renderizados
**And** para `role !== 'rep'`, os três botões aparecem e chamam `updateTicket(t.id, { status: 'in_progress', assigned_to: me.id })` / `updateTicket(t.id, { status: 'resolved', resolved_at: new Date().toISOString() })` / o link `wa.me`
**And** mesmo que um rep chame `PATCH /data/tickets/:id` manualmente, o gateway rejeita por `owner_id` não bater com a sessão (segurança real fica no gateway, não na UI)

[Source: doc/07-papeis-rep-manager-admin.md#7.2, #7.3]

### Story 6.3: Definir fluxo de promoção a manager/admin

Como admin,
quero promover um usuário rep a manager pela UI de configurações,
para distribuir o atendimento sem depender de convite por e-mail.

**Acceptance Criteria:**

**Given** que o 1º usuário do tenant já é admin automaticamente (regra do gateway)
**When** o admin promove outro usuário
**Then** a promoção é uma `UPDATE` em `"user".role`, feita via rota própria de admin do gateway (**não** `db.table('user')`, que é reservado)
**And** se essa rota não estiver disponível no gateway atual, a promoção manual via console é aceitável para o v1 (documentar essa limitação)

[Source: doc/07-papeis-rep-manager-admin.md#7.1] — **ponto de atenção: depende de endpoint do gateway existir**

### Story 6.4: Definir quem cadastra clientes

Como product owner,
quero decidir entre "só manager/admin cadastra clientes" (rep escolhe de uma lista) ou "rep cadastra o próprio cliente na hora do chamado",
para fechar o fluxo de abertura de ticket.

**Acceptance Criteria:**

**Given** as duas opções descritas na auditoria
**When** confirmada a opção recomendada (rep cadastra, `customers.owner_id = rep`, manager/admin veem todos)
**Then** a tela `/tickets/new` permite criar cliente inline durante a abertura do chamado
**And** o gateway aplica a mesma regra de visibilidade de `customers` que aplica a `tickets` (rep vê só os próprios; manager/admin veem tudo)

[Source: doc/07-papeis-rep-manager-admin.md#7.4] — **requer confirmação do usuário (recomendação: opção 2)**

---

## Epic 7: Fluxo WhatsApp

Substituir toda a camada de e-mail/chat pelo botão único que abre `wa.me` — zero backend, zero secret. [Source: doc/03-remover-email.md#3.5]

### Story 7.1: Implementar botão "Abrir conversa no WhatsApp"

Como manager/admin,
quero clicar em um botão no detalhe do ticket que abra uma nova aba do WhatsApp com uma mensagem pré-preenchida,
para iniciar o contato real com o cliente fora da plataforma.

**Acceptance Criteria:**

**Given** um ticket com `customer.phone` salvo em E.164 sem "+"
**When** o botão é clicado
**Then** abre-se `https://wa.me/${customer.phone}?text=${encodeURIComponent('Olá ' + customer.name + ', sobre o chamado #' + ticket.number + ': ' + ticket.subject)}` em `target="_blank" rel="noopener"`
**And** nenhum connector, API key ou backend é usado (é só um link)

[Source: doc/03-remover-email.md#3.5]

### Story 7.2: Garantir telefone salvo em E.164 sem "+"

Como desenvolvedor,
quero validar/normalizar o campo `phone_e164` do cliente no formulário de cadastro,
para garantir que o link `wa.me` sempre funcione (ex: `"5511999998888"`, sem `+` nem espaços).

**Acceptance Criteria:**

**Given** o formulário de cadastro/edição de cliente
**When** o usuário digita um telefone
**Then** o valor salvo em `customers.phone_e164` não contém `+`, espaços ou caracteres não numéricos
**And** o link do WhatsApp (Story 7.1) sempre recebe um número válido

[Source: doc/06-schema-alvo.md#CUSTOMERS; doc/03-remover-email.md#3.5]

---

## Epic 8: Manifest do template e contrato do hub

Criar o manifest exigido pelo hub para que o app seja clonável como "App Pronto". [Source: doc/01-violacoes-de-fundacao.md#1.9; Importantdoc.md#B7]

### Story 8.1: Criar `masi.template.json`

Como desenvolvedor,
quero criar o manifest do template com `id`, `name`, `engine: "vite-react-gateway"`, `schemaVersion`, `migrations`, `auth.roles: ["admin","manager","rep"]`, `screens`, `editable.allow/protect` e `envContract: ["VITE_GATEWAY_URL"]`,
para que o app seja clonável pelo hub.

**Acceptance Criteria:**

**Given** o formato de referência em `Importantdoc.md#B7`
**When** o manifest é criado
**Then** `editable.allow` cobre `src/screens/**`, `src/components/**`, `src/lib/data/*.repo.ts`, `src/lib/format.ts`, `src/app.css`
**And** `editable.protect` cobre `src/lib/data/client.ts`, `src/lib/data/types.gen.ts`, `src/components/registry.tsx`, `src/main.tsx`, `supabase/migrations/**` (e, se o scaffold `wiki` for escolhido, também `src/components/ui/**`, `src/lib/utils.ts`, `vite.config.ts`, `components.json`, `preview-fixtures.ts`)
**And** `composio.toolkits` é `[]` (nenhuma integração externa)

[Source: doc/01-violacoes-de-fundacao.md#1.9; Importantdoc.md#B7]

### Story 8.2: Clonar scaffold-base e portar telas

Como desenvolvedor,
quero copiar `clone-templates/wiki` (Pro, shadcn) **ou** `clone-templates/forms-nps` (leve, CSS puro) para `clone-templates/helpdesk-crud`, remover `node_modules`/`dist`, e trazer só as telas deste projeto (`TicketList`, `TicketDetail`, `TicketNew`, `CustomerList`, `CustomerDetail`) adaptadas para `src/lib/data/*.repo.ts`,
para ter o novo template funcionando sobre a fundação.

**Acceptance Criteria:**

**Given** a decisão de scaffold do usuário (Story 3.8 relacionada)
**When** o scaffold é clonado e as telas portadas
**Then** `LoginScreen`, `AppShell`, `auth.tsx`, `RequireAuth`, `registry`, `main` do scaffold são reaproveitados sem alteração
**And** as telas específicas do helpdesk vivem em `src/screens/*` e usam os repos da Story 5.2

[Source: doc/08-plano-de-migracao.md#Passo 5b, itens 1-4]

### Story 8.3: Atualizar `types.gen.ts` batendo com o schema-alvo

Como desenvolvedor,
quero preencher `src/lib/data/types.gen.ts` com os tipos de `customers`, `tickets`, `ticket_notes` do schema-alvo (Epic 4),
para que os repos (Story 5.2) tenham tipagem correta.

**Acceptance Criteria:**

**Given** o schema criado na Story 4.2
**When** `types.gen.ts` é atualizado
**Then** cada tabela do schema-alvo tem um tipo `Row` correspondente
**And** o build TypeScript strict passa sem `any` implícito nos repos

[Source: doc/08-plano-de-migracao.md#Passo 5b, item 6]

### Story 8.4: Ajustar branch PREVIEW do `client.ts` com fixtures

Como desenvolvedor,
quero adaptar `preview-fixtures.ts` (ou o branch `window.__MASI_PREVIEW__` de `client.ts`) com fixtures de ticket/cliente,
para que o editor Sandpack tenha dados de exemplo ao editar o template.

**Acceptance Criteria:**

**Given** o branch de PREVIEW documentado em `Importantdoc.md#B5`
**When** as fixtures são adicionadas
**Then** o preview no editor de IA renderiza tickets e clientes de exemplo sem chamar o gateway real

[Source: doc/08-plano-de-migracao.md#Passo 5b, item 8; Importantdoc.md#B5]

---

## Epic 9: Publish, catálogo e QA end-to-end

Publicar o template e validar o fluxo completo antes de considerar a migração concluída. [Source: doc/08-plano-de-migracao.md#Passo 6, #Passo 7]

### Story 9.1: Build limpo antes do publish

Como desenvolvedor,
quero rodar `npm install && npm run build` no template final,
para garantir zero imports não usados e `vite build` passando antes de publicar.

**Acceptance Criteria:**

**Given** o template finalizado (Epics 1-8)
**When** o build roda
**Then** `tsc` não reporta erros (`noUnusedLocals` ativo)
**And** `vite build` conclui sem falhas

[Source: doc/08-plano-de-migracao.md#Passo 5b, item 9; Importantdoc.md#B10]

### Story 9.2: Publicar o template com gateway https público

Como desenvolvedor,
quero rodar `pnpm templates:publish helpdesk-crud https://masi-tenant-gateway.fly.dev` e `pnpm demo:publish helpdesk-crud`,
para que o template seja buildado e a demo fique disponível.

**Acceptance Criteria:**

**Given** o comando de publish
**When** executado **sempre com a URL https pública do gateway**
**Then** o build compartilhado é gerado em R2 (`templates/helpdesk-crud/v<ts>`) e a KV `TPL:helpdesk-crud` é atualizada
**And** a demo fica acessível em `demo-helpdesk-crud.masia.cloud`
**And** o comando **nunca** roda sem o argumento da URL (evita default `localhost`, que quebraria todos os clones)

[Source: Importantdoc.md#B10; doc/08-plano-de-migracao.md#Passo 6]

### Story 9.3: Registrar no catálogo e redeploy do Fly

Como desenvolvedor,
quero criar uma migration em `masi-ai-orquestration/supabase/migrations/` espelhando `20260620160001_clone_template_forms_nps.sql` (INSERTs idempotentes em `clone_templates` e `clone_template_versions`) e redeployar a API + worker no Fly,
para que o template apareça no Marketplace e seja de fato clonável (o provisionador lê os arquivos do disco da imagem, não só do R2).

**Acceptance Criteria:**

**Given** a migration de catálogo criada
**When** aplicada
**Then** `clone_templates` tem uma linha `slug=helpdesk-crud`, `status=published`
**And** o Fly é redeployado (`Dockerfile` faz `COPY clone-templates`) antes de qualquer clone real ser testado

[Source: Importantdoc.md#B10; doc/08-plano-de-migracao.md#Passo 6]

### Story 9.4: QA end-to-end do fluxo completo

Como QA,
quero clonar o template de verdade via o hub e validar o fluxo ponta a ponta,
para confirmar que a migração está completa e segura.

**Acceptance Criteria:**

**Given** um clone novo do template `helpdesk-crud`
**When** o 1º usuário se cadastra
**Then** ele vira `admin` automaticamente
**And** um rep convidado abre um ticket, o admin/manager vê o chamado, clica em "Abrir WhatsApp", volta e marca como resolvido
**And** se o rep tentar `PATCH /data/tickets/:id` de um ticket que não é dele, o gateway responde `403`

[Source: doc/08-plano-de-migracao.md#Passo 7]

---

## Decisões pendentes do usuário (resumo)

Estas stories não devem ser planejadas para execução até confirmação — estão sinalizadas inline acima:

- **Story 3.8** — manter ou não Kanban drag-and-drop e Dashboard de KPIs.
- **Story 4.3** — adicionar `category text` em tickets ou não.
- **Story 6.4** — quem cadastra clientes (recomendação: rep cadastra na hora).
- **Story 8.2 / Additional Requirements** — scaffold-base `wiki` (Pro/shadcn) vs. `forms-nps` (leve/CSS).

**Resolvido:** o usuário confirmou que o projeto deve obedecer integralmente `Importantdoc.md` — banco **Neon** (não Supabase), app **SPA**, migração completa para o `tenant-gateway` ("5b"). A rota "5a" (manter Supabase) foi descartada e não deve ser considerada em nenhum planejamento futuro.
