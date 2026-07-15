# 7. Papéis — Rep / Manager / Admin

O usuário pediu:

> "Rep seria o usuário que loga, manager/admin seria quem entra em contato pra conversar com o cliente, depois que se resolveu tudo, volta na aplicação e dá como concluído."

Isso **encaixa perfeitamente** no modelo da fundação (§B8), que já define os três papéis exatos: `admin`, `manager`, `rep`.

## 7.1. Mapeamento

| Papel na fundação | Papel no negócio do usuário | O que faz |
|---|---|---|
| `rep` | Usuário comum que abre chamado | Login, abre ticket, vê os próprios, acompanha status |
| `manager` | Atendente que fala com o cliente por WhatsApp | Vê todos os tickets, assume, marca como resolvido, adiciona nota |
| `admin` | Dono/gestor | Tudo do manager + configurações |

O **1º usuário do tenant vira admin automaticamente** (regra do gateway). Os demais entram como **rep** por padrão. O admin promove alguém para manager pela UI de configurações (é uma UPDATE em `"user".role`, feita via endpoint do gateway — **não** via `db.table('user')`, pois `user` é reservado).

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

## 7.4. `customers` — quem escreve?

Duas opções:

1. **Só manager/admin cadastra clientes.** Rep escolhe de uma lista existente ao abrir chamado.
2. **Rep cadastra o próprio cliente na hora.** `customers.owner_id = rep`; manager/admin veem todos.

Recomendação: **opção 2**, mais fluida. O rep já vem com o pedido e precisa registrar o cliente em conjunto com o ticket.

## 7.5. Pontos onde o projeto atual diverge

| Projeto atual | Fundação / Pedido |
|---|---|
| `USER_ROLE = ['admin', 'agent']` (só 2 papéis) | Precisa dos 3: `admin`, `manager`, `rep` |
| Papel guardado em `profiles.role` no banco tenant | Papel guardado no Better-Auth do gateway (`"user".role`) |
| Função Postgres `has_role()` verifica RLS | Sem RLS; autz feita no gateway |
| Convite por e-mail (`invite-agent` edge fn) | Admin promove manualmente ou usa endpoint do gateway |