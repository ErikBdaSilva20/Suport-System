// Contrato de tabelas do modo genérico /data/:table.
// Espelha supabase/migrations/*.sql — mantenha em sincronia ao alterar o schema-alvo.
//
// writeRoles é por operação ({ create, update, delete }), não uma lista única —
// ex: `customers.create` fica aberto pra rep se autocadastrar, mas `update`/
// `delete` são só admin (Story 10.4). Operação ausente = sem trava de role
// (só a checagem de owner_id/isElevated já feita em data.js).

export const TABLES = {
  customers: {
    columns: ['name', 'phone_e164', 'email', 'notes'],
    hasOwner: true,
    writeRoles: { update: ['admin'], delete: ['admin'] },
  },
  tickets: {
    columns: ['customer_id', 'subject', 'description', 'status', 'priority', 'assigned_to', 'resolved_at', 'category'],
    hasOwner: true,
    writeRoles: { delete: ['admin'] },
  },
  ticket_notes: {
    columns: ['ticket_id', 'body'],
    hasOwner: true,
  },
  settings: {
    columns: ['company_name'],
    hasOwner: false,
    writeRoles: { create: ['admin', 'manager'], update: ['admin', 'manager'] },
  },
  // managerFilter: fragmento SQL aplicado no GET só quando role === 'manager',
  // pra dar um 3º nível de visibilidade além do owner_id/isElevated binário —
  // manager só vê canal 'general', admin vê tudo (urgent + general).
  customer_feedback: {
    columns: ['channel', 'category', 'message', 'status'],
    hasOwner: true,
    managerFilter: "channel = 'general'",
    writeRoles: { update: ['admin', 'manager'] },
  },
};
