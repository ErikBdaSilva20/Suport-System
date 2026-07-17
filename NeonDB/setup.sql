-- a tabela "user" (Better-Auth) já precisa existir no banco
-- ANTES de rodar este script — ela não é criada aqui, é provisionada pelo
-- tenant-gateway/Better-Auth. Sem ela, as foreign keys abaixo falham.

create extension if not exists pgcrypto;

-- ============ ENUMS ============
do $$ begin
  create type ticket_status as enum ('open', 'in_progress', 'resolved');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type ticket_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null;
end $$;

-- ============ CUSTOMERS ============
-- Cadastro de clientes (quem recebe o contato por WhatsApp).
-- Escrito por rep/manager/admin → precisa de owner_id.
create table if not exists customers (
  id           uuid primary key default gen_random_uuid(),
  owner_id     text not null references "user"(id) on delete cascade,
  name         text not null,
  phone_e164   text not null,          -- ex: "5511999998888" (sem +, sem espaços)
  email        text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_customers_owner on customers(owner_id);
create index if not exists idx_customers_phone on customers(phone_e164);
-- Sem dois clientes com o mesmo telefone/e-mail. E-mail é opcional — índice
-- parcial ignora nulls, senão um segundo cliente sem e-mail nunca conseguiria salvar.
create unique index if not exists idx_customers_phone_unique on customers(phone_e164);
create unique index if not exists idx_customers_email_unique on customers(email) where email is not null;

-- ============ TICKETS ============
-- Chamado propriamente dito.
-- owner_id = quem abriu (rep). O gateway seta pela sessão.
-- assigned_to = manager/admin que assumiu (nullable).
create table if not exists tickets (
  id            uuid primary key default gen_random_uuid(),
  owner_id      text not null references "user"(id) on delete cascade,
  number        bigserial,
  customer_id   uuid not null references customers(id) on delete restrict,
  subject       text not null,
  description   text not null,
  status        ticket_status not null default 'open',
  priority      ticket_priority not null default 'medium',
  assigned_to   text references "user"(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_tickets_owner on tickets(owner_id);
create index if not exists idx_tickets_status on tickets(status);
create index if not exists idx_tickets_customer on tickets(customer_id);

-- categoria simples como coluna, sem tabela de lookup.
alter table tickets add column if not exists category text;

-- ============ TICKET NOTES ============
-- Notas internas do manager sobre o que aconteceu no WhatsApp.
-- Escrito por manager/admin, mas o rep também pode ler os próprios → owner_id obrigatório.
create table if not exists ticket_notes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null references "user"(id) on delete cascade,
  ticket_id   uuid not null references tickets(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_ticket_notes_ticket on ticket_notes(ticket_id);
create index if not exists idx_ticket_notes_owner on ticket_notes(owner_id);

-- ============ CUSTOMER FEEDBACK ============
-- Feedback do rep (cliente) sobre atendimento/produto, em 2 canais de
-- visibilidade: 'urgent' (só admin) e 'general' (manager + admin).
-- owner_id = rep que enviou. O gateway seta pela sessão.
create table if not exists customer_feedback (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null references "user"(id) on delete cascade,
  channel     text not null check (channel in ('urgent', 'general')),
  category    text,
  message     text not null,
  status      text not null default 'open' check (status in ('open', 'read', 'resolved')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_customer_feedback_owner on customer_feedback(owner_id);
create index if not exists idx_customer_feedback_channel on customer_feedback(channel);

-- Sem uso real (nome da empresa nunca foi aplicado em nenhuma tela) — remove se já existir de uma execução anterior.
drop table if exists settings cascade;

-- ============ TRIGGERS updated_at ============
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- create trigger não aceita "if not exists" — dropa e recria pra ficar idempotente.
drop trigger if exists t_customers_updated on customers;
create trigger t_customers_updated before update on customers
  for each row execute function touch_updated_at();

drop trigger if exists t_tickets_updated on tickets;
create trigger t_tickets_updated before update on tickets
  for each row execute function touch_updated_at();

drop trigger if exists t_customer_feedback_updated on customer_feedback;
create trigger t_customer_feedback_updated before update on customer_feedback
  for each row execute function touch_updated_at();
