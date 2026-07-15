# Auditoria do projeto vs. Fundação ViverdeIA/Masia

> **Data:** 2026-07-15
> **Base:** `Importantdoc.md` (guia oficial de Apps Prontos — tenant-gateway + Neon + Better-Auth).
> **Objetivo do usuário:** transformar esta plataforma em um **Help Desk 100% CRUD**, sem IA e sem envio/recebimento de e-mail. Rep = usuário que abre/registra chamado; Admin/Manager = quem atende (o contato com o cliente acontece **por fora**, via WhatsApp) e depois marca o ticket como concluído na aplicação.

## TL;DR — o quão longe da fundação estamos

O projeto **hoje viola quase todos os pilares** do guia. Foi construído como um SaaS Help Desk completo (estilo Zendesk) rodando em **Supabase direto do browser**, com RLS, Edge Functions, IA (Gemini), e-mail (Resend), integração Zendesk, chat em tempo real e Base de Conhecimento.

Para caber no molde de "Apps Prontos" (SPA React + `db.table()` no tenant-gateway) e no escopo pedido pelo usuário (CRUD puro + WhatsApp externo), precisamos **remover camadas inteiras** e reduzir o app a:

- Um CRUD de **tickets** (aberto → em atendimento → resolvido).
- Um CRUD de **clientes** (com telefone/WhatsApp).
- Login com **Better-Auth** e papéis **admin / manager / rep**.
- Um botão "Abrir no WhatsApp" que gera link `wa.me/<telefone>?text=...` (nenhum backend WhatsApp).

## Índice desta auditoria

1. [`01-violacoes-de-fundacao.md`](./01-violacoes-de-fundacao.md) — O que quebra o contrato da fundação (Supabase, RLS, edge functions, realtime, get-by-id, etc.).
2. [`02-remover-ia.md`](./02-remover-ia.md) — Tudo relacionado a IA que precisa sair.
3. [`03-remover-email.md`](./03-remover-email.md) — Resend, Zendesk, CSAT por e-mail, webhooks.
4. [`04-remover-features-fora-de-escopo.md`](./04-remover-features-fora-de-escopo.md) — Live chat, KB, notificações, SLA, participantes, tags avançadas.
5. [`05-mapa-do-que-fica.md`](./05-mapa-do-que-fica.md) — O core CRUD que sobra + o novo fluxo WhatsApp.
6. [`06-schema-alvo.md`](./06-schema-alvo.md) — Como o schema `0001_business_schema.sql` fica depois da poda, seguindo §B4 do guia.
7. [`07-papeis-rep-manager-admin.md`](./07-papeis-rep-manager-admin.md) — Como mapear os papéis solicitados no modelo do gateway.
8. [`08-plano-de-migracao.md`](./08-plano-de-migracao.md) — Ordem sugerida para executar a limpeza, sem quebrar a UI intermediária.

> **Nada de código foi alterado.** Esta pasta é somente a auditoria. Nenhum arquivo `.ts`/`.tsx`/`.sql` fora de `doc/` foi tocado.