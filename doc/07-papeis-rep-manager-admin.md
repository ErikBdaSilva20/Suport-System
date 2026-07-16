# 7. Papéis — Rep / Manager / Admin

> **Atualizado (revisão 2):** o mapeamento original abaixo tratava `rep` como
> funcionário. O usuário decidiu inverter: **`rep` = o próprio cliente**, que se
> autocadastra (com telefone, canal de contato do suporte). `manager` continua
> sendo o funcionário que atende; `admin` continua vendo tudo. Isso reverte a
> Story 3.3 (que removeu portal/login do cliente de propósito) e substitui, na
> prática, o fluxo de autocadastro de cliente pelo rep da Story 6.4 (o fluxo
> manual antigo continua disponível pra manager/admin abrirem chamado em nome de
> alguém, ex: atendimento por telefone). Ver `_bmad-output/planning-artifacts/epics.md`.

O usuário pediu (pedido original, histórico):

> "Rep seria o usuário que loga, manager/admin seria quem entra em contato pra conversar com o cliente, depois que se resolveu tudo, volta na aplicação e dá como concluído."

Isso **encaixa perfeitamente** no modelo da fundação (§B8), que já define os três papéis exatos: `admin`, `manager`, `rep`.

## 7.1. Mapeamento (atualizado)

| Papel na fundação | Papel no negócio do usuário | O que faz |
|---|---|---|
| `rep` | **Cliente** — se autocadastra com nome, e-mail, senha e telefone | Login, abre o próprio chamado (já vinculado ao próprio cadastro de contato), vê só os próprios, acompanha status |
| `manager` | Funcionário/atendente que fala com o cliente por WhatsApp | Vê todos os tickets, assume, marca como resolvido, adiciona nota. **Não se autocadastra** — é criado pelo admin em Configurações (nome+e-mail, senha gerada) |
| `admin` | Dono/gestor | Tudo do manager + configurações + cria contas de funcionário |

O **1º cadastro no formulário "Equipe" vira admin automaticamente** (regra do gateway) — e só esse formulário; depois do 1º acesso ele fica fechado (qualquer tentativa seguinte é rejeitada, precisa ser criado pelo admin). O formulário "Sou cliente" (separado, com telefone) **sempre** cria `rep`, nunca `admin`, independente de ordem — é a trava contra um cliente externo virar dono do tenant. Ver `Importantdoc.md` e o comentário em `local-gateway/src/auth.js`.

> ⚠️ **Atenção:** promover papel **não** é `db.table()` — hoje o gateway expõe isso em rota própria de admin. Se essa rota não estiver disponível no gateway atual, promoção manual via console é aceitável no v1.

## 7.2. Visibilidade (aplicada pelo gateway, não pelo app)

- **admin / manager**: veem **todos** os registros de todas as tabelas.
- **rep**: vê apenas registros com `owner_id = <seu id>`.

Isso significa:

- Quando o **rep** faz `listTickets()`, o gateway já devolve só os dele.
- Quando o **manager** faz `listTickets()`, vê tudo.
- **A UI não precisa filtrar por owner.** Só usa `role` para esconder/mostrar botão.

## 7.3. UI condicional

```tsx
const { role } = useAuth();

// Rep não vê "assumir" nem "concluir"
{role !== 'rep' && (
  <>
    <Button onClick={() => updateTicket(t.id, { status: 'in_progress', assigned_to: me.id })}>
      Atender
    </Button>
    <Button onClick={() => updateTicket(t.id, { status: 'resolved', resolved_at: new Date().toISOString() })}>
      Concluir
    </Button>
    <a href={`https://wa.me/${customer.phone_e164}?text=...`}>WhatsApp</a>
  </>
)}
```

Segurança real: mesmo se o rep chamar `PATCH /data/tickets/:id` na mão, o gateway rejeita por `owner_id` não bater com a sessão.

## 7.4. `customers` — quem escreve? (revisão 2)

Como `rep` agora É o cliente, o registro em `customers` é criado **automaticamente no cadastro** (aba "Sou cliente" do login, junto com o `signUp`) — não mais manualmente pelo rep na hora do ticket. `customers.owner_id` = o próprio rep; manager/admin veem todos, como sempre.

O fluxo manual antigo (cadastrar/escolher cliente inline em `/tickets/new`) **continua existindo, mas só pra manager/admin** — útil quando o atendimento acontece por outro canal (ex: telefonema) e é o funcionário quem abre o chamado em nome do cliente.

## 7.5. Pontos onde o projeto atual diverge

| Projeto atual | Fundação / Pedido |
|---|---|
| `USER_ROLE = ['admin', 'agent']` (só 2 papéis) | Precisa dos 3: `admin`, `manager`, `rep` |
| Papel guardado em `profiles.role` no banco tenant | Papel guardado no Better-Auth do gateway (`"user".role`) |
| Função Postgres `has_role()` verifica RLS | Sem RLS; autz feita no gateway |
| Convite por e-mail (`invite-agent` edge fn) | Admin promove manualmente ou usa endpoint do gateway |