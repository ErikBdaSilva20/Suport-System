# Help Desk SaaS

Central de atendimento single-tenant com tickets multicanal (email + portal), base de conhecimento com IA, políticas de SLA, automação de prioridade, portal do cliente e pesquisa CSAT. Construído com **Lovable Cloud** — sem necessidade de configurar Supabase manualmente.

---

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Lovable Cloud (Supabase gerenciado) — PostgreSQL, Auth, Storage, Edge Functions, Realtime
- **IA:** Lovable AI Gateway (Gemini / GPT) — KB Assistant, classificação de prioridade, primeira resposta automática
- **Email:** Mailgun (entrada via webhook + envio de respostas e convites)
- **Arquitetura:** Clean Architecture (domain / application / infrastructure / presentation)

---

## 🚀 Pós-remix: passo a passo

Quando você remixa este projeto, o **código completo** (frontend + edge functions + migrations SQL) é copiado e o banco recebe automaticamente os **seeds iniciais** (1 linha de configurações + 4 políticas de SLA padrão). Todas as **chaves externas** (Mailgun) são pedidas dentro do app no Setup Wizard — você **não precisa** mexer em secrets/vault no chat.

### 1. Criar o primeiro administrador

1. Abra a aplicação remixada — você cairá em `/login`.
2. Como ainda não existe nenhum usuário, o formulário **detecta automaticamente** que é a primeira instalação e mostra a aba **"Criar conta de admin"** com um banner explicativo.
3. Preencha **nome, email e senha (mín. 6 caracteres)** e clique em **"Criar conta de admin"**.
4. Faça login com as credenciais que acabou de cadastrar.

> 🔒 **Segurança:** o trigger `on_auth_user_created` garante que o primeiro usuário registrado vira `admin` automaticamente. **Todos os signups públicos são bloqueados a partir do segundo usuário** — eles só entram via convite. Mesmo que alguém burle a UI, o banco rejeita.

### 2. Rodar o Setup Wizard

Após o login, o **Assistente de Configuração** abre automaticamente no primeiro acesso. Ele tem 4 passos:

| Passo | O que configurar |
|-------|------------------|
| **Empresa** | Nome da empresa, email de suporte, fuso horário, horário comercial e dias úteis |
| **Mailgun** | API Key + domínio + Webhook Signing Key (ver seção 3 abaixo) |
| **SLA** | Tempo de primeira resposta e resolução por prioridade (Urgente / Alta / Média / Baixa) |
| **Automação** | Regras de classificação automática de prioridade por palavras-chave + IA |

Você pode pular o wizard a qualquer momento clicando em **"Configurar depois"** — ele reabrirá no próximo login enquanto houver passos pendentes.

### 3. Configurar Mailgun (obrigatório para email)

Sem Mailgun configurado, o sistema **funciona** mas:
- ❌ Tickets não chegam por email
- ❌ Respostas não são enviadas ao cliente
- ❌ Convites de agente não chegam por email (você verá o link no log da edge function)
- ✅ Portal do cliente continua funcionando normalmente

**Passos:**

1. **Crie uma conta gratuita** em [mailgun.com](https://www.mailgun.com/) (10.000 emails/mês grátis).
2. **Adicione seu domínio** (ex: `suporte.suaempresa.com`) em *Sending → Domains → Add New Domain*.
3. **Configure DNS** no seu provedor (Cloudflare, Route53, etc.):
   - Registros **MX** (recebimento)
   - Registros **TXT** para **SPF** e **DKIM** (autenticação)
   - Registro **CNAME** para tracking (opcional)
4. **Verifique o domínio** no painel do Mailgun (pode levar até 48h, geralmente é instantâneo).
5. **Pegue sua API Key** em *Settings → API Keys → Private API Key*.
6. **Cole no Setup Wizard** (passo Mailgun) ou em *Configurações → Integrações*:
   - API Key: `key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Domínio: `mg.suaempresa.com` (ou o que você cadastrou)
7. **Configure o webhook de entrada de email** no Mailgun:
   - Vá em *Receiving → Routes → Create Route*
   - **Expression Type:** Match Recipient
   - **Recipient:** `.*@mg.suaempresa.com` (ajuste para seu domínio)
   - **Actions:** `forward("https://<SEU_PROJECT_REF>.supabase.co/functions/v1/process-inbound-email")`
   - O `<SEU_PROJECT_REF>` está no seu painel do Lovable Cloud.

> 💡 **Sandbox Mailgun não funciona** para envio real — só permite enviar para emails autorizados manualmente. Use sempre um domínio próprio em produção.

### 4. Convidar agentes e admins

1. Vá em **Configurações → Equipe**.
2. Clique em **"Convidar agente"**.
3. Preencha:
   - **Email** do convidado
   - **Função:** `Agente` (acesso normal) ou `Admin` (acesso total + configurações)
4. O convidado recebe um email com link mágico para definir a senha. Após confirmar, ele já entra com a função escolhida.

> ⚠️ Se o email não chegar, verifique:
> - Mailgun está configurado e o domínio verificado
> - Logs da edge function `invite-agent` no Lovable Cloud → Functions
> - Caixa de spam do destinatário

### 5. Testar o fluxo end-to-end

Para validar que tudo funciona:

1. **Crie um ticket via portal:**
   - Acesse `/portal/login` em uma janela anônima
   - Cadastre-se como cliente, abra um ticket
2. **Responda como agente:**
   - Volte ao painel admin → Tickets → abra o ticket recém-criado
   - Envie uma resposta pública pelo composer
3. **Veja a IA classificar a prioridade automaticamente** (se ativada nas configurações).
4. **Resolva o ticket** → o cliente recebe email de CSAT (pesquisa de satisfação) automaticamente.
5. **Cliente avalia** em `/portal/csat/<token>`.

---

## ✨ Recursos opcionais (já vêm ligados)

- **KB Assistant com IA** (`/kb/assistant`): chat conversacional sobre seus artigos da base de conhecimento, com citação de fontes. Usa Lovable AI Gateway (sem API key adicional).
- **Classificação automática de prioridade**: edge function `classify-ticket-priority` analisa o conteúdo do ticket e atribui prioridade com base em regras + IA.
- **Primeira resposta automática**: edge function `auto-first-response` envia confirmação imediata ao cliente quando um ticket é criado.
- **Monitoramento de SLA**: edge function `check-sla-breach` roda periodicamente e atualiza status SLA dos tickets.
- **CSAT automático**: ao resolver um ticket, `send-csat-survey` dispara o email de pesquisa.

> 🤖 **Lovable AI:** o secret `LOVABLE_API_KEY` é injetado **automaticamente** em todo projeto Lovable Cloud — você não precisa configurar nada. Funciona out-of-the-box no remix.

---

## 🛠️ Troubleshooting

### "Não consigo fazer signup, o formulário só mostra Login"
Esperado. Apenas o **primeiro usuário** pode se cadastrar publicamente — ele vira admin. Após isso, novos usuários só entram via convite (Configurações → Equipe).

### "Estou recebendo erro 403 ao enviar email"
Você está usando o **domínio sandbox do Mailgun**, que só permite enviar para emails autorizados manualmente no painel deles. Configure um domínio próprio (seção 3 acima).

### "Convite de agente não chegou"
1. Verifique logs da edge function `invite-agent` no Lovable Cloud → Functions → Logs.
2. O log inclui o **link de convite completo** — você pode copiar e enviar manualmente enquanto debuga o Mailgun.
3. Confirme que o Mailgun está verificado e a API key está correta.

### "Perdi acesso ao único admin"
Como há proteção contra signup público, você precisa promover um agente existente a admin via SQL no backend:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'agente@empresa.com';
```

Execute pelo console SQL do Lovable Cloud → Database.

### "Tickets criados por email não aparecem"
1. Verifique a Route do Mailgun apontando para `process-inbound-email`.
2. Veja logs da função no Lovable Cloud para identificar erro de parsing ou customer não encontrado.
3. Confira `email_inbound_events` no banco — toda mensagem recebida vira uma linha lá com status `processed` ou `error`.

---

## 📁 Estrutura do projeto

```
src/
├── domain/              # Entidades, value objects, contratos de repositório (regra de negócio pura)
│   ├── ticketing/
│   ├── identity/
│   ├── knowledge-base/
│   └── settings/
├── application/         # Use cases (orquestração, sem detalhes de infra)
├── infrastructure/      # Implementações concretas (Supabase, mocks, realtime)
│   ├── supabase/
│   └── mock/
├── presentation/        # Hooks React, contextos, componentes de rota
├── pages/               # Páginas (rotas top-level)
└── components/          # Componentes UI reutilizáveis (incluindo shadcn/ui)

supabase/
├── functions/           # Edge Functions (Deno)
│   ├── process-inbound-email/
│   ├── send-reply-email/
│   ├── invite-agent/
│   ├── kb-assistant/
│   ├── classify-ticket-priority/
│   ├── check-sla-breach/
│   └── ...
└── migrations/          # SQL versionado (executado no remix)
```

---

## 💻 Desenvolvimento local

```bash
npm install
npm run dev          # inicia Vite em localhost:8080
npm run test         # roda vitest (unit tests de domain/application)
npm run build        # build de produção
```

Variáveis de ambiente (`.env`) são gerenciadas automaticamente pelo Lovable Cloud — não edite manualmente.

---

## 📄 Licença & créditos

Gerado com [Lovable](https://lovable.dev). Use à vontade — adapte para sua operação de suporte.
