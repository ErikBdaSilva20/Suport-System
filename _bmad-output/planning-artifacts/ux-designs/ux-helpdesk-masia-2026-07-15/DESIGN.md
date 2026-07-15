---
name: Help Desk
description: Central de atendimento CRUD (rep abre chamado, manager/admin atende via WhatsApp). shadcn/ui + Tailwind sobre tokens HSL já existentes em src/index.css. Rodada 1 (badge de notificação, categoria com "Outro"). Rodada 2 — mais peso visual dentro da mesma linguagem sóbria: badges de status/prioridade com fundo sólido, cards de KPI tingidos, toast de sucesso, sino com pulso.
status: final
updated: 2026-07-15
colors:
  # Nenhuma cor nova nas duas rodadas. Tudo abaixo já existe em src/index.css /
  # tailwind.config.ts — parte já estava em uso, parte (success, priority-*)
  # estava declarada mas nunca referenciada em nenhum componente até a rodada 2.
  primary: 'hsl(var(--primary))'
  accent: 'hsl(var(--accent-primary))'
  destructive: 'hsl(var(--destructive))'
  warning: 'hsl(var(--warning))'
  success: 'hsl(var(--success))'
  muted-foreground: 'hsl(var(--muted-foreground))'
  border: 'hsl(var(--border))'
  status-open: 'hsl(var(--status-open))'
  status-in-progress: 'hsl(var(--status-pending))'
  status-resolved: 'hsl(var(--status-resolved))'
  priority-low: 'hsl(var(--priority-low))'
  priority-medium: 'hsl(var(--priority-medium))'
  priority-high: 'hsl(var(--priority-high))'
  sidebar-primary: 'hsl(var(--sidebar-primary))'
typography:
  # Inter em toda a UI (font-sans), sem variante display separada.
  body:
    fontFamily: 'Inter'
rounded:
  # Escala shadcn padrão já em uso (var(--radius) = 10px).
  sm: 'calc(var(--radius) - 4px)'
  md: 'calc(var(--radius) - 2px)'
  lg: 'var(--radius)'
  full: '9999px'
components:
  notification-badge:
    background: '{colors.destructive}'
    foreground: 'hsl(var(--destructive-foreground))'
    radius: '{rounded.full}'
    position: 'sobreposto ao ícone de sino, canto superior direito'
    size: '20px (subiu de 16px na rodada 2)'
    motion: 'animate-pulse (Tailwind core) enquanto count > 0; para quando count é 0'
  category-select-other:
    trigger: 'herda shadcn Select (mesmo componente usado em Prioridade no TicketNewScreen)'
    other-input: 'herda shadcn Input, revelado abaixo do Select quando "Outro" é escolhido'
    counter-normal: '{colors.muted-foreground}'
    counter-at-limit: '{colors.warning}'
  status-badge:
    background: 'fundo sólido na cor do status (era 15% opacidade na rodada 1)'
    foreground: 'branco'
    border: 'transparent (sem contorno — o fundo sólido já carrega o peso visual)'
  priority-badge:
    background: 'fundo sólido na cor da prioridade — componente novo, prioridade não tinha cor nenhuma antes da rodada 2'
    foreground: 'branco'
    border: 'transparent'
  kpi-card:
    background: 'tingido 5% na cor do status correspondente (bg-status-x/5)'
    border: 'tingido 30% na cor do status correspondente (border-status-x/30)'
    icon-wrapper: 'círculo 36px, fundo tingido 15% na cor do status (bg-status-x/15)'
  toast-success:
    background: 'herda shadcn Toast variant=default'
    accent-icon: 'CheckCircle2 (lucide), {colors.success}'
---

## Brand & Style

Help Desk é uma ferramenta de operação B2B, não um produto de consumo: sidebar escura (cor de fundo própria da sidebar, herdada do shadcn) com acento índigo (`{colors.accent}`), área de conteúdo clara, Inter como única família tipográfica. A postura é "ferramenta de trabalho" — direta, sem ilustração, sem enfeite — herdada integralmente do shadcn/ui já instalado neste projeto (`components.json`, `baseColor: slate`).

Este documento **não recria a base** (ela já existe e está em produção). Ele registra, por nome, os tokens que os componentes novos usam. Ver `Do's and Don'ts` para a régua de quando um token novo se justificaria (quase nunca).

**Rodada 2 (calibragem confirmada com o usuário):** mais peso visual — cores mais fortes, elementos maiores, mais contraste — permanecendo dentro da mesma sobriedade. Sem gradiente, sem ilustração, sem animação chamativa. É a mesma ferramenta direta, só com mais volume nos sinais que já existem — não uma virada de marca pra algo expressivo/colorido tipo app de consumo (essa opção foi oferecida e recusada).

## Colors

- **`{colors.destructive}`** — já usado em ações destrutivas (excluir ticket) e em `SLABadge`/histórico. Reaproveitado aqui para o **badge de notificação** porque "vermelho = precisa de atenção" é a leitura universal de contador não-lido; usar `{colors.status-open}` (azul, já usado no badge de status "Aberto" da lista) criaria confusão visual entre "isto é um chamado aberto" e "isto é uma contagem de novos".
- **`{colors.warning}`** (âmbar) — já existe, sem uso consistente hoje. Reaproveitado no contador de palavras do campo "Outro" (gatilho exato em `EXPERIENCE.md` → State Patterns) — sinaliza "chegou no teto" sem a agressividade do vermelho (não é um erro, é uma trava suave).
- **`{colors.accent}`** — inalterado; continua reservado para foco/seleção (ring, item ativo da sidebar). Não é usado nos componentes novos, para não competir com o vermelho do badge.
- **`{colors.success}`** (verde) — token já declarado em `tailwind.config.ts`/`index.css`, nunca referenciado em nenhum componente até agora. Reaproveitado no ícone do toast de confirmação — distinto de `{colors.status-resolved}` (também verde, mas com outro propósito: "status do chamado" vs. "sua ação deu certo"). São a mesma família de verde por coincidência de paleta, não a mesma variável — não funde os dois conceitos num único token.
- **`{colors.status-open}` / `{colors.status-in-progress}` / `{colors.status-resolved}`** — já existiam e já eram usados como texto/contorno na rodada 1. Rodada 2 os promove a fundo sólido nos badges de status (ver Components). Nota: `status-in-progress` no código aponta pro CSS var `--status-pending` (nome herdado do schema antigo, pré-migração) — mantido assim de propósito, é o comportamento já em produção, não uma inconsistência a corrigir nesta rodada.
- **`{colors.priority-low/medium/high}`** — declarados desde sempre, **nunca usados** em nenhuma tela até a rodada 2 (prioridade hoje não tem cor nenhuma). Reaproveitados para os novos badges de prioridade.

## Components

→ Referência visual: `mockups/header-badge.html`, `mockups/ticket-new-category.html`. Comportamento completo (estados, gatilhos) vive em `EXPERIENCE.md`; este documento cobre só a superfície visual.

### Notification badge (sino no header)

- Ícone `Bell` (lucide-react, já é a lib de ícones do projeto) no header do `AppLayout`, ao lado do avatar — mesma linha, mesma altura dos demais ícones de ação.
- Badge numérico sobreposto (`{components.notification-badge}`): círculo vermelho, texto branco, canto superior direito do sino, **20px** (rodada 2 — antes 16px). Contagem zero → **sino aparece sem badge**, nunca com um `0` visível (ruído visual).
- Contagem máxima exibida: `9+` acima de 9 — não é um contador de precisão, é um sinal de "tem gente esperando".
- **Rodada 2:** enquanto `count > 0`, o badge pulsa (`animate-pulse`, utilitário já embutido no Tailwind — sem keyframe novo). Pulso para assim que o contador zera; nunca pulsa vazio.
- Visibilidade é condicional por papel — ver EXPERIENCE.md → Component Patterns para a regra exata.

### Category select + "Outro" (abertura de chamado)

- Reaproveita o `Select` do shadcn já usado no campo Prioridade do `TicketNewScreen` — mesmo trigger, mesmo tamanho, mesma tipografia. Não é um componente visualmente novo, é o mesmo padrão com itens diferentes.
- Último item da lista é sempre **"Outro"**, visualmente igual aos demais (não tem um estilo "especial" de chamar atenção — é só mais uma opção).
- Ao selecionar "Outro": um `Input` de texto shadcn aparece **imediatamente abaixo** do Select — mesmo padrão de revelação progressiva já usado no botão "Novo" cliente dentro do `TicketNewScreen` (comportamento completo em EXPERIENCE.md → Component Patterns).
- Abaixo do Input, contador `{n}/5 palavras` em `{colors.muted-foreground}`, virando `{colors.warning}` no limite (gatilho exato em EXPERIENCE.md → State Patterns).

### Status badge — fundo sólido (rodada 2)

- `Badge` do shadcn, mas trocando de contorno (`variant="outline"` + fundo 15% opacidade, tratamento da rodada 1) para **fundo sólido** (`{components.status-badge}`) — texto branco, sem borda. Usado em `TicketsScreen` (coluna Status), `TicketDetailScreen` (cabeçalho) e `TicketKanbanScreen` (cada card).
- Mesmo mapeamento de cor por status de sempre (`{colors.status-open}`/`{colors.status-in-progress}`/`{colors.status-resolved}`) — só o tratamento visual muda, o significado da cor não.

### Priority badge — componente novo (rodada 2)

- Mesmo tratamento do status badge (fundo sólido, texto branco), mas pra prioridade — que **não tinha nenhuma cor** antes. Onde hoje é texto puro (`TicketsScreen`) ou `Badge variant="secondary"` cinza sem significado (`TicketDetailScreen`, `TicketKanbanScreen`), passa a ser `{components.priority-badge}` nas 3 telas.

### KPI card — tingido por status (rodada 2)

- `Card` do shadcn no `DashboardScreen`, cada um dos 3 (Abertos/Em atendimento/Resolvidos) ganha `{components.kpi-card}`: fundo tingido 5% e borda tingida 30% na cor do status correspondente — sutil, não é um bloco de cor sólida como os badges.
- Ícone (`CircleDot`/`Clock`/`CheckCircle2`, já usados) sobe de tamanho e ganha um círculo de fundo tingido 15% atrás dele — mais peso sem virar ilustração.

### Toast de sucesso (rodada 2)

- Novo `variant="success"` no componente `Toast` do shadcn (hoje só existe `default`/`destructive`) — ícone `CheckCircle2` em `{colors.success}` antes do título. Aplicado em toda confirmação de ação bem-sucedida do app (não só as 3 que o usuário citou — ver EXPERIENCE.md → Component Patterns pra lista exata e o porquê de estender pra todas).
- Duração/posição do toast **não muda** — o mecanismo shadcn já usado neste projeto fica visível até o usuário fechar (não há timer de auto-dismiss configurado). O ganho de destaque vem do ícone + da cor, não de ficar mais tempo na tela.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Reaproveitar `{colors.destructive}` para qualquer badge de "precisa de atenção" futuro (notificação, contador de pendências) | Inventar uma cor "notificação" nova — vermelho já significa isso no sistema |
| Badge de notificação some quando a contagem é zero | Mostrar um badge com `0` dentro — isso é ruído, não sinal |
| Tratar "Outro" como só-mais-um-item do Select | Estilizar "Outro" como botão separado ou destacado — quebra o padrão de Select já estabelecido |
| Revelar o campo de texto customizado inline, sem modal | Abrir um `Dialog` para o texto de "Outro" — é um campo, não um fluxo |
| Fundo sólido nos badges de status/prioridade — é sinal, precisa bater o olho | Fundo sólido em qualquer outro badge/tag do app (ex: um badge decorativo) — o tratamento forte é reservado pra sinal de estado, não vira padrão genérico de badge |
| Tingido sutil (5-15%) nos cards de KPI | Fundo sólido nos cards de KPI — card não é alerta, é um número; sólido ali seria alto demais |
| `animate-pulse` (Tailwind core) no badge de notificação, só enquanto `count > 0` | Qualquer outra animação contínua na UI (loading já usa `Skeleton`, não precisa de mais um padrão de movimento) |
| Reaproveitar `{colors.success}` só pra "sua ação deu certo" | Usar `{colors.success}` pra status "Resolvido" — esse já é `{colors.status-resolved}`, são conceitos diferentes mesmo com cor parecida |
