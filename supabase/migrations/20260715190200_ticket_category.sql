-- ============================================================
-- helpdesk-crud — coluna de categoria em tickets (Story 4.3)
-- Decisão do usuário: categoria simples como coluna, sem tabela de lookup.
-- Ver doc/06-schema-alvo.md#Se o usuário quiser categoria/departamento.
-- ============================================================

alter table tickets add column if not exists category text;
