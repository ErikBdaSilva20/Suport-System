-- ============================================================
-- Tabela de configurações do tenant (nome da empresa, cor primária).
-- FR9 exige essa configuração, mas doc/06-schema-alvo.md não a lista —
-- adicionada aqui como extensão mínima, seguindo as mesmas regras
-- (Importantdoc.md#B4): sem RLS, snake_case, sem owner_id (tabela
-- "lookup" de tenant único — leitura liberada, escrita só admin/manager
-- via regra do gateway em tabelas sem owner_id).
-- Revisar/confirmar antes de aplicar.
-- ============================================================

create table if not exists settings (
  id             uuid primary key default gen_random_uuid(),
  company_name   text not null default 'Minha Empresa',
  primary_color  text not null default '#16a34a',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger t_settings_updated before update on settings
  for each row execute function touch_updated_at();
