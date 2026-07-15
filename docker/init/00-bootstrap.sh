#!/bin/sh
# Roda uma única vez, na primeira inicialização do volume do container Postgres
# (convenção docker-entrypoint-initdb.d). Cria o mock local da tabela "user" do
# Better-Auth e então aplica, em ordem, todas as migrations reais de
# supabase/migrations/ (montadas em /docker-entrypoint-initdb.d/migrations).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
  -- Mock da tabela "user" do Better-Auth, só para desenvolvimento local via Docker.
  -- Em produção essa tabela é criada e mantida pelo tenant-gateway; aqui o
  -- local-gateway (auth mockado) é quem lê/escreve nela. Login/senha aqui são
  -- só um mock de dev — não reflete o esquema real do Better-Auth.
  create table if not exists "user" (
    id         text primary key default gen_random_uuid()::text,
    name       text not null,
    email      text not null unique,
    password   text not null,
    role       text not null default 'rep',
    created_at timestamptz not null default now()
  );
SQL

for f in /docker-entrypoint-initdb.d/migrations/*.sql; do
  echo "==> aplicando $f"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
done
