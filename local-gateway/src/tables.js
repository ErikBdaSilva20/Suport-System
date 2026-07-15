// Contrato de tabelas do modo genérico /data/:table.
// Espelha supabase/migrations/*.sql — mantenha em sincronia ao alterar o schema-alvo.

export const TABLES = {
  customers: {
    columns: ['name', 'phone_e164', 'email', 'notes'],
    hasOwner: true,
  },
  tickets: {
    columns: ['customer_id', 'subject', 'description', 'status', 'priority', 'assigned_to', 'resolved_at', 'category'],
    hasOwner: true,
  },
  ticket_notes: {
    columns: ['ticket_id', 'body'],
    hasOwner: true,
  },
  settings: {
    columns: ['company_name', 'primary_color'],
    hasOwner: false,
    writeRoles: ['admin', 'manager'],
  },
};
