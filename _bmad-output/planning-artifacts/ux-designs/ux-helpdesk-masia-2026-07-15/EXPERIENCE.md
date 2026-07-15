---
name: Help Desk
status: final
sources:
  - Importantdoc.md
  - _bmad-output/planning-artifacts/epics.md
updated: 2026-07-15
---

# Help Desk — Experience Spine (delta: notificação, tipo de problema, peso visual)

> Este spine documenta um **delta** sobre um app já em produção (React 19 + Vite 6 +
> shadcn/ui, backend `tenant-gateway`). Não redescreve telas existentes — só as
> mudanças de comportamento acumuladas em duas rodadas. `DESIGN.md` é a
> referência visual; este arquivo é a referência de comportamento. Os dois
> vencem sobre qualquer mock/wireframe em caso de conflito.
>
> **Rodada 1:** sino de notificação + categoria de problema (select + "Outro").
> **Rodada 2:** mais peso visual em cima do que já existe — badges de status/prioridade
> com fundo sólido, KPIs tingidos, toast de sucesso, sino com pulso. Sem tela/rota/tabela nova em nenhuma das duas.

## Foundation

Single-surface responsive web, SPA (sem SSR), React 19 + Vite 6 + shadcn/ui sobre Tailwind. Backend exclusivo é o `tenant-gateway` (`db.table()` genérico, `list/create/update/remove`, sem get-by-id, sem joins — Importantdoc.md §B5). Papéis `rep` / `manager` / `admin` via Better-Auth; `rep` só vê/edita os próprios registros (`owner_id`), `manager`/`admin` veem tudo. **Sem realtime** (NFR7) — qualquer atualização é via refetch/poll do TanStack Query, nunca WebSocket/push.

## Information Architecture

Nenhuma rota ou tabela nova (categoria reaproveita a coluna `category` da Story 4.3; notificação é só client-side). Dois pontos de entrada novos, nenhum roteável diretamente:

| Elemento | Onde vive | Alcançado por |
|---|---|---|
| Badge de notificação | Header do `AppLayout`, ao lado do avatar | Sempre visível (`admin`/`manager`) |
| Clique no badge | — | Navega para `/tickets` (rota já existente) |
| Select de categoria | `TicketNewScreen`, no formulário de abertura | Parte do fluxo já existente de criar chamado |

## Voice and Tone

Microcopy desta rodada. Tom geral do produto (direto, sem exclamação, sem emoji) já estabelecido no app — ver toasts existentes (`"Ticket criado"`, `"Erro ao carregar tickets"`).

| Do | Don't |
|---|---|
| "3 chamados novos" (badge, se tiver texto de apoio em tooltip) | "Você tem 3 notificações! 🔔" |
| "Outro (descreva em até 5 palavras)" — placeholder do select | "Não achou? Conta pra gente!" |
| "5/5 palavras — limite atingido" | "Ops! Você excedeu o limite 😬" |
| Rótulos de categoria como substantivo simples: "Técnico", "Financeiro" | Frases longas como rótulo: "Problema de natureza técnica" |

**Lista de categorias (Padrão-6, decidida com o usuário):** Técnico · Atendimento · Financeiro · Cadastro/Acesso · Sem resposta do cliente · Outro.

**Rodada 2 — títulos dos toasts de sucesso não mudam** ("Ticket criado", "Ticket assumido", "Ticket concluído", "Cliente criado e selecionado", "Configurações salvas"); só ganham ícone e variante nova. Uma exceção nova: salvar nota interna **hoje não tem toast nenhum de sucesso** — vira `"Nota salva"`.

## Component Patterns

Behavioral. Specs visuais em `DESIGN.md.Components`.

→ Composição de referência: `mockups/header-badge.html` (3 estados do sino), `mockups/ticket-new-category.html` (4 estados do select + Outro). Spine vence em caso de conflito.

| Component | Use | Behavioral rules |
|---|---|---|
| Notification badge (sino) | Header, todas as telas autenticadas | Renderiza só para `role !== 'rep'`. Contagem = tickets com `status === 'open'` menos os que já estão no set local de "espiados" (ver State Patterns). `0` → sino sem badge. Clique navega para `/tickets`; não marca nada como visto por si só (ver Interaction Primitives). Mock: `mockups/header-badge.html`. |
| Category select | `TicketNewScreen`, form de abertura | shadcn `Select` com 6 itens fixos + "Outro" sempre por último. Campo agora **obrigatório** — não dá pra submeter sem categoria escolhida. Mock: `mockups/ticket-new-category.html`. |
| Category "Outro" input | Aparece só quando "Outro" é selecionado | shadcn `Input` revelado logo abaixo do Select (sem modal). Contador de palavras abaixo. Ao trocar de volta pra uma categoria da lista, o texto digitado é descartado (não fica "flutuando" escondido). Mock: `mockups/ticket-new-category.html`. |
| Status badge (rodada 2) | `TicketsScreen`, `TicketDetailScreen`, `TicketKanbanScreen` | Fundo sólido (era contorno 15%) — mesmo mapeamento de cor, tratamento visual mais forte. Sem mudança de significado, só de peso. |
| Priority badge (rodada 2) | `TicketsScreen`, `TicketDetailScreen`, `TicketKanbanScreen` | Novo — prioridade não tinha cor antes. Mesmo tratamento do status badge, cor por prioridade (baixa/média/alta). |
| Toast de sucesso (rodada 2) | Qualquer ação de criação/atualização bem-sucedida no app | `variant="success"` novo no `Toast` do shadcn — ícone `CheckCircle2`. Aplica em: criar ticket, assumir, concluir, salvar nota (**novo — hoje não existe toast nenhum aqui**), criar cliente, salvar configurações. Erros continuam `variant="destructive"`, sem mudança. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Badge: 0 chamados open não-vistos | Header | Sino sem badge numérico. |
| Badge: 1–9 | Header | Número exato. |
| Badge: >9 | Header | `"9+"`. |
| Badge: primeiro load da sessão (query ainda não resolveu) | Header | Sino sem badge até a primeira resposta chegar — nunca pisca `0` e depois corrige pra um número (evita "flash" enganoso). |
| Ticket sai da contagem | — | Automático quando `status` deixa de ser `open` (alguém clicou "Atender"), **independente** do set local de vistos — é a trava anti-confusão. Ver a linha "localStorage limpo" logo abaixo para o caso extremo. |
| localStorage limpo | Qualquer | Set de "espiados" volta vazio. Só tickets **ainda `open`** podem voltar a aparecer destacados — nunca um ticket já `in_progress`/`resolved`, porque a contagem nunca olha pra esses. |
| Select de categoria: nada escolhido, tenta submeter | `TicketNewScreen` | Mesmo padrão de validação já usado pra "Selecione um cliente" (toast destrutivo), texto: "Escolha o tipo de problema". |
| "Outro" selecionado, texto vazio, tenta submeter | `TicketNewScreen` | Mesmo toast — categoria vazia com "Outro" selecionado conta como não preenchida. |
| "Outro": usuário atinge 5 palavras | `TicketNewScreen` | Input para de aceitar uma 6ª palavra (tecla é ignorada, não só um aviso depois do fato) — edição dentro das 5 palavras já digitadas continua livre. Contador vira `{colors.warning}` e o texto muda pra "5/5 palavras — limite atingido". |
| Badge: `count > 0` (rodada 2) | Header | Pulsa (`animate-pulse`). Para de pulsar assim que `count` volta a `0` — nunca pulsa "vazio" nem pulsa pra sempre independente do estado. |
| KPI card (rodada 2) | `DashboardScreen` | Sempre tingido na cor do status correspondente, mesmo em `0` — o card não "acende" e "apaga", é uma cor fixa de identificação (diferente do sino, que só pulsa quando há algo pra ver). |

## Interaction Primitives

- **Marcar como visto** acontece em um único lugar: ao **montar** o `TicketDetailScreen` (não importa se a navegação veio da lista, do Kanban, do Dashboard ou do clique no badge) — o id do ticket entra no set local. Não existe ação de "marcar tudo como visto" nem "visto" por só passar o mouse/olhar a lista.
- **Clique no sino** é só navegação (`/tickets`), não é uma ação de "marcar visto" — dois eventos diferentes, de propósito: ver a lista não é o mesmo que ter *tratado* aquele chamado especificamente.
- **Trocar de categoria para "Outro" e voltar**: não precisa de confirmação — é só um campo de formulário, sem estado destrutivo.

## Accessibility Floor

Behavioral. Contraste de cor vive em `DESIGN.md` (herda shadcn, AA).

- Sino tem `aria-label` dinâmico: `"Notificações, N chamados novos"` (ou `"Notificações, nenhum chamado novo"` quando zero) — a informação não depende só do badge visual.
- Contador de palavras do "Outro" é `aria-live="polite"`: leitor de tela anuncia quando o limite é atingido, sem esperar o usuário tentar submeter.
- Select de categoria é o `Select` nativo do shadcn (Radix) — já opera por teclado e já anuncia opções; nenhuma customização de acessibilidade extra necessária.
- O limite de 5 palavras nunca é sinalizado só por cor (`{colors.warning}`) — sempre acompanhado do texto "5/5 palavras — limite atingido".
- **Rodada 2:** `animate-pulse` do sino respeita `prefers-reduced-motion` (o utilitário do Tailwind já faz isso nativamente via `@media` — não é uma customização extra a fazer). Quem tem essa preferência ativada vê o badge maior e vermelho, só sem o pulso.
- **Rodada 2:** badges de status/prioridade com fundo sólido usam texto branco — confirmado visualmente que todas as cores em uso (`status-open` azul, `status-in-progress` âmbar-ciano, `status-resolved` verde, `priority-low` cinza, `priority-medium` azul, `priority-high` laranja) têm contraste suficiente com branco nesse tom/saturação específico. Se uma cor nova for adicionada depois, revalidar o contraste antes de assumir branco por padrão.

## Key Flows

### Flow 1 — Manager triando o dia (Renata, manager, início da manhã)

1. Renata abre o app; o sino no header já mostra `"3"` — três chamados `open` que ela ainda não abriu individualmente.
2. Ela clica no sino. Vai pra `/tickets`, lista ordenada pelos mais recentes no topo — os três chamados novos já aparecem primeiro.
3. Abre o primeiro (`TicketDetailScreen`). Ao montar a tela, aquele id entra no set local de "espiados" — o sino, ao voltar pra lista, já mostra `"2"`.
4. Ela lê o problema, vê que a categoria é "Sem resposta do cliente" (preenchida pelo rep na abertura) — já sabe o tom da conversa antes de abrir o WhatsApp.
5. Clica "Atender". Status vira `in_progress`. **Climax:** mesmo que Renata nunca tivesse aberto aquele ticket individualmente, ele já sairia da contagem a partir daqui — o contador nunca depende só da memória do navegador dela, depende do estado real do chamado.

Falha: Renata limpa os dados do navegador sem querer. Os dois chamados que ela já tinha visto mas ainda não atendeu voltam a aparecer destacados no sino — chato, mas não mentiroso: eles *continuam* esperando atendimento.

### Flow 2 — Rep abrindo um chamado fora do padrão (Diego, rep, meio da tarde)

1. Diego clica "Novo Ticket". Preenche cliente, assunto, descrição.
2. Chega no campo de tipo de problema. Nenhuma das 6 opções descreve bem o caso ("cliente pediu reembolso duplicado") — escolhe "Outro".
3. Um campo de texto aparece embaixo do select. Ele digita "reembolso duplicado cobranca errada" — quatro palavras, contador mostra `4/5`.
4. Tenta acrescentar mais uma palavra longa; ao bater 5 palavras o contador vira âmbar: "5/5 palavras — limite atingido". Ele tenta digitar mais uma letra numa nova palavra — nada acontece, o campo não aceita.
5. **Climax:** ele edita o meio do texto (corrige "cobranca" pra "cobrança", ainda dentro das 5 palavras) — a edição funciona normalmente, só a *adição de uma 6ª palavra* é bloqueada. Ele clica "Criar Ticket". O chamado é criado com `category = "reembolso duplicado cobranca errada"`, pronto pra Renata triar pelo sino.

Falha: Diego esquece de preencher a categoria e clica "Criar Ticket" direto. Toast: "Escolha o tipo de problema" — mesmo padrão já usado pra "Selecione um cliente". Nada é criado até ele resolver.
