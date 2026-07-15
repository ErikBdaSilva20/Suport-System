
# Resumo para o Gestor — Central de Atendimento

Documento amigável, sem termos técnicos, listando tudo que foi implementado desde **29 de junho** até hoje. Pode ser copiado direto para apresentar ao gestor.

---

## Visão geral

Construímos uma **central de atendimento própria**, integrada ao Zendesk (que continua sendo o ponto de entrada dos clientes) e enriquecida com **Inteligência Artificial** e **chat em tempo real**. O objetivo é que a equipe de suporte trabalhe com mais rapidez, padronização e visibilidade — e que o cliente tenha uma experiência mais humana.

---

## 1. Integração com o Zendesk (entrada e saída de tickets)

- **Recebimento automático**: quando um cliente abre um chamado no Zendesk, o ticket cai automaticamente na nossa central via webhook seguro (autenticação HMAC).
- **Cliente criado automaticamente**: se for a primeira vez que aquele e-mail aparece, o cadastro do cliente é gerado sozinho.
- **Sincronização de status e respostas**: mudanças e respostas feitas na nossa central voltam para o Zendesk, mantendo os dois lados alinhados.
- **Sincronização em lote**: possibilidade de puxar tickets antigos do Zendesk para dentro da central.

## 2. Live Chat — atendimento em tempo real

- **Link exclusivo por ticket**: o agente gera um link e envia ao cliente; ele entra em uma sala de chat sem precisar criar conta.
- **Verificação por e-mail**: para acessar o chat, o cliente confirma o e-mail do atendimento — só entra quem é o dono do ticket.
- **Conversa em tempo real**: mensagens aparecem instantaneamente para os dois lados.
- **Envio de imagens/prints e emojis** no chat.
- **Campo de mensagem que cresce sozinho** conforme o texto aumenta, com suporte a quebra de linha.
- **Histórico salvo no ticket**: quando o atendimento termina, toda a conversa fica registrada no histórico do chamado.
- **Painel lateral do agente** mostra os outros tickets do mesmo cliente durante o chat, dando contexto imediato.

## 3. Inteligência Artificial aplicada ao suporte

Usamos o **Google Gemini** via gateway próprio para 5 funcionalidades:

1. **Classificação automática de prioridade**: a IA lê o ticket recém-criado e define se é Baixa, Média, Alta ou Urgente, combinando regras de palavras-chave + análise de contexto.
2. **Primeira resposta automática**: o cliente recebe uma confirmação inicial personalizada logo após abrir o chamado, sem esperar o agente.
3. **Sugestão de tickets similares**: ao abrir um ticket, o agente vê chamados parecidos já resolvidos — acelera a resposta e evita retrabalho.
4. **Chat com histórico do cliente**: o agente pode "conversar" com a IA perguntando coisas como "esse cliente já teve problema parecido?" — a IA responde com base apenas nos tickets daquele cliente.
5. **Assistente da Base de Conhecimento**: chat interno onde o agente pergunta em linguagem natural e a IA responde citando os artigos publicados na base.

## 4. Base de Conhecimento

- Editor de artigos em Markdown com categorias, tags, status (rascunho/publicado) e visibilidade (público ou interno).
- **Assistente com IA** sobre esses artigos (item 3.5 acima).
- Sugestão automática de artigos relevantes ao abrir um ticket.

## 5. SLA e monitoramento

- **Políticas de SLA por prioridade**: tempo de primeira resposta e tempo de resolução configuráveis por nível (Urgente/Alta/Média/Baixa).
- **Monitoramento contínuo**: o sistema recalcula o status do SLA de cada ticket periodicamente e destaca visualmente os que estão perto do prazo ou já estouraram.

## 6. Pesquisa de Satisfação (CSAT)

- Quando um ticket é resolvido, o cliente recebe automaticamente um e-mail com pesquisa de satisfação.
- As respostas ficam registradas e podem ser analisadas.

## 7. Portal do Cliente

- Área pública onde o cliente pode ver o histórico dos próprios chamados.
- Login separado do painel dos agentes.

## 8. Painel do Agente / Dashboard

- **Dashboard com KPIs**: volume de tickets, status de SLA, distribuição por prioridade, produtividade.
- **Kanban de tickets**: visualização por status com arrastar e soltar.
- **Detalhes do ticket** com histórico completo, participantes, anexos, timeline de auditoria e sugestões de IA.
- **Menções entre agentes** (@nome) e sistema de notificações internas com sino.
- **Cadastro de clientes** com edição, histórico e visão consolidada.

## 9. Automação e configuração

- **Assistente de configuração inicial** guiado em 4 passos (empresa, e-mail, SLA, automação) na primeira entrada.
- **Regras de prioridade por palavras-chave** configuráveis pelo admin.
- **Gestão de equipe**: convite de agentes e administradores por e-mail com definição de papel.
- **Configurações gerais**: nome da empresa, logo, cor primária, fuso horário, horário comercial, dias úteis.

## 10. Segurança e controles

- **Papéis (Admin / Agente / Cliente)** com regras de acesso separadas no banco de dados.
- **RLS (Row-Level Security)**: cada usuário só enxerga o que lhe cabe.
- **Reset de senha** com fluxo seguro para agentes e administradores.
- **Auditoria de ações** nos tickets (quem mudou o quê e quando).

---

## Como isso ajuda no dia a dia

- Reduz tempo médio de resposta (IA classifica e responde primeiro).
- Padroniza atendimento com base de conhecimento centralizada.
- Dá visibilidade em tempo real de SLA e volume por agente.
- Humaniza o atendimento com chat ao vivo quando o e-mail não é suficiente.
- Mede satisfação do cliente automaticamente ao fim de cada chamado.

---

## Próximos passos sugeridos

1. Cadastrar os artigos da base de conhecimento de Departamento Pessoal.
2. Configurar as políticas de SLA definitivas com o gestor.
3. Convidar os agentes reais e fazer um piloto com um grupo pequeno de clientes.
4. Acompanhar os KPIs do dashboard nas primeiras semanas para ajustar automações.

---

> Este é um resumo de comunicação — não envolve alterações de código. Ao aprovar, eu apenas confirmo o texto; nenhuma implementação nova será feita nesta etapa.
