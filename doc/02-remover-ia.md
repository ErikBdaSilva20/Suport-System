# 2. Remover — Camada de IA

O usuário disse explicitamente: **"Não quero integração com nenhuma IA na plataforma"**. Além disso, o guia da fundação lista **LLM/IA no gateway** como extensão de fundação (§A3), não como template. Portanto: **remover 100%**.

## 2.1. Edge Functions de IA (remover)

| Função | O que faz | Motivo de remover |
|---|---|---|
| `classify-ticket-priority` | Classifica prioridade via Gemini | IA fora do escopo |
| `auto-first-response` | Gera resposta automática ao cliente | IA + envio de e-mail |
| `on-ticket-created-pipeline` | Orquestra as duas acima | Depende de IA |
| `find-similar-tickets` | Busca semântica | IA |
| `client-similar-tickets` | Similares no portal | IA |
| `client-tickets-chat` | Chat IA sobre histórico | IA |
| `customer-history-chat` | Chat IA por cliente | IA |
| `kb-assistant` | Chat IA sobre KB | IA + KB (fora do escopo) |
| `analyze-customer-reply` | Analisa resposta do cliente | IA |

## 2.2. Código de app dependente de IA (remover)

- `src/application/ticketing/CreateTicketUseCase.ts` — chama `on-ticket-created-pipeline`. Deve criar o ticket e parar aí.
- `src/presentation/hooks/ticketing/useAISuggestions.ts`
- `src/components/AISuggestionCard.tsx`
- `src/components/ticket/SimilarTicketsCard.tsx`
- `src/components/ticket/CustomerHistoryChat.tsx`
- `src/components/ticket/CustomerHistoryDrawer.tsx`
- `src/pages/KBAssistant.tsx` (todo o Assistente de KB)
- `src/presentation/hooks/knowledge-base/useKBAssistant.ts`
- `src/presentation/hooks/knowledge-base/useKBConversations.ts`
- `src/components/kb/ConversationSidebar.tsx`

## 2.3. Tabelas de IA (dropar do schema)

- `ticket_ai_suggestions` — sugestões geradas pela IA.
- `kb_conversations` + `kb_conversation_messages` — histórico do chat com IA.
- `priority_rules` — usada pelo classificador; se manter classificação manual, deletar mesmo assim (regras por palavra-chave são "meia IA" e não fazem sentido sem o classificador).

## 2.4. Configuração / Setup Wizard

- `src/pages/SetupWizard.tsx` — passo de "Automação" e chamadas a `LOVABLE_API_KEY` saem.
- `src/components/setup/steps/AutomationStep.tsx` — deletar.
- `src/pages/settings/AutomationSettings.tsx` — deletar (rota `/settings/automation`).

## 2.5. Secrets

- `LOVABLE_API_KEY` deixa de ser necessária.
- Nenhuma chamada a `https://ai.gateway.lovable.dev` remanescente.

## Por que isso é seguro

A IA nunca foi **função crítica** do fluxo — só acelerava triagem e primeira resposta. No fluxo pedido (admin/manager fala com o cliente por WhatsApp), a triagem é humana: o manager vê o ticket, escolhe a prioridade manualmente (campo select simples) e liga no WhatsApp. Nada quebra.