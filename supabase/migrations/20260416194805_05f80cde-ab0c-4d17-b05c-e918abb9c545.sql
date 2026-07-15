create table public.ticket_participants (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null,
  added_at timestamptz not null default now(),
  added_by uuid,
  primary key (ticket_id, user_id)
);

alter table public.ticket_participants enable row level security;

create policy "Agents manage participants"
  on public.ticket_participants
  for all
  using (public.is_agent())
  with check (public.is_agent());

create policy "Users see own participation"
  on public.ticket_participants
  for select
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.ticket_participants;

create index idx_ticket_participants_user on public.ticket_participants(user_id);
create index idx_ticket_participants_ticket on public.ticket_participants(ticket_id);