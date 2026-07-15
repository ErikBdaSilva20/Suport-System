# 3. Remover — Camada de E-mail (Resend, Zendesk, CSAT por e-mail)

O usuário disse: **"nem uma aplicação de disparos de email como emailgun q ta nesse projeto"**. O contato com o cliente sai da plataforma e vai para o **WhatsApp** (link `wa.me`, sem backend). Portanto, tudo que envia, recebe ou depende de e-mail é removido.

O guia da fundação também não prevê e-mail transacional/inbound como parte do template — é extensão de gateway (§A3, "webhooks de terceiros").

## 3.1. Edge Functions (remover)

### Resend (envio + recebimento)
| Função | O que faz |
|---|---|
| `send-reply-email` | Envia resposta do agente por e-mail ao cliente |
| `send-csat-survey` | Envia pesquisa de satisfação |
| `send-notification` | E-mails internos |
| `resend-inbound-webhook` | Recebe e-mails do cliente e transforma em ticket |
| `save-resend-key` | Salva a API key do Resend na plataforma |

### Zendesk (integração espelho)
| Função | O que faz |
|---|---|
| `zendesk-inbound-webhook` | Recebe ticket do Zendesk |
| `push-zendesk-reply` | Envia resposta do agente ao Zendesk |
| `push-zendesk-status` | Sincroniza status |
| `sync-zendesk-tickets` | Sync em lote |
| `save-zendesk-secret` | Salva credenciais |

### Diversos
| Função | O que faz |
|---|---|
| `admin-reset-password` | Reset admin (usa e-mail Resend) — remover |
| `check-signup-allowed` | Bloqueia signup público — deixa de fazer sentido (Better-Auth do gateway controla) |
| `invite-agent` | Convite por e-mail — trocar por criação manual admin ou remover |
| `verify-chat-access` | Verifica link do live chat — some junto com o live chat |

**Total:** todas as 26 edge functions do projeto vão embora (as de IA na seção 2, as de e-mail/Zendesk aqui, e o resto em `04`).

## 3.2. Código de app dependente de e-mail

- `src/components/setup/steps/ResendStep.tsx` (passo do wizard) — remover.
- Step 3 do `SetupWizard.tsx` — remover.
- `src/pages/settings/IntegrationsSettings.tsx` — remover (Zendesk, Resend).
- `src/pages/CSATPage.tsx` + rota `/csat/:token` — remover.
- `src/pages/ResetPassword.tsx` — Better-Auth cuida do reset; a página customizada sai.
- Botão "Responder por e-mail" no `MessageComposer` / `TicketDetail` — trocar por "Abrir WhatsApp".

## 3.3. Tabelas (dropar)

- `csat_responses`
- `email_inbound_events`
- `ticket_email_messages`
- Colunas `email_message_id` em `tickets` — sai.
- `settings.support_email`, `settings.resend_*`, `settings.zendesk_*` — saem.

## 3.4. Secrets

- `RESEND_API_KEY`
- `ZENDESK_SUBDOMAIN` / `ZENDESK_EMAIL` / `ZENDESK_API_TOKEN`
- Qualquer `*_WEBHOOK_SECRET`

## 3.5. O que substitui — WhatsApp por link (sem backend)

No detalhe do ticket, um botão único:

```tsx
// customer.phone salvo em E.164 sem "+"
const msg = encodeURIComponent(`Olá ${customer.name}, sobre o chamado #${ticket.number}: ${ticket.subject}`);
<a href={`https://wa.me/${customer.phone}?text=${msg}`} target="_blank" rel="noopener">
  Abrir conversa no WhatsApp
</a>
```

Isso segue o próprio guia interno da Lovable (Twilio doc) que diz: **"se o objetivo é abrir chat com o negócio, gere `wa.me` direto — sem connector, sem API key, sem backend"**. Zero servidor, zero secret.

## Por que isso é seguro

O contato real com o cliente acontece **fora da plataforma**. A plataforma é somente o **CRUD de registro** do chamado: quem abriu, o que pediu, quem está atendendo, qual o status. O e-mail existia para replicar o Zendesk; sem Zendesk e sem envio automático, a camada inteira é ruído.