// Fixtures usadas pelo branch PREVIEW de client.ts (window.__MASI_PREVIEW__),
// consumidas pelo editor Sandpack quando não há gateway real disponível.

import type { Database } from './types.gen';

type Customer = Database['public']['Tables']['customers']['Row'];
type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketNote = Database['public']['Tables']['ticket_notes']['Row'];

const OWNER_ID = 'preview-user-1';
const now = new Date().toISOString();

export const previewCustomers: Customer[] = [
  {
    id: 'cust-1', owner_id: OWNER_ID, name: 'Empresa Alpha Ltda',
    phone_e164: '5511999990001', email: 'contato@alpha.com', notes: null,
    created_at: now, updated_at: now,
  },
  {
    id: 'cust-2', owner_id: OWNER_ID, name: 'Beta Soluções',
    phone_e164: '5521988880002', email: 'suporte@beta.com', notes: 'Cliente desde 2024',
    created_at: now, updated_at: now,
  },
];

export const previewTickets: Ticket[] = [
  {
    id: 'tk-1', owner_id: OWNER_ID, number: 1, customer_id: 'cust-1',
    subject: 'Sistema de login não funciona', description: 'Após a atualização de ontem ninguém consegue acessar.',
    status: 'open', priority: 'high', assigned_to: null, resolved_at: null, category: 'Acesso',
    created_at: now, updated_at: now,
  },
  {
    id: 'tk-2', owner_id: OWNER_ID, number: 2, customer_id: 'cust-2',
    subject: 'Dúvida sobre integração', description: 'Como faço para integrar com a API REST?',
    status: 'in_progress', priority: 'medium', assigned_to: OWNER_ID, resolved_at: null, category: 'Integração',
    created_at: now, updated_at: now,
  },
];

export const previewTicketNotes: TicketNote[] = [
  {
    id: 'note-1', owner_id: OWNER_ID, ticket_id: 'tk-2',
    body: 'Cliente confirmou o problema pelo WhatsApp, aguardando log de erro.',
    created_at: now,
  },
];

export const previewSettings = [
  { id: 'settings-1', company_name: 'Minha Empresa', primary_color: '#16a34a', created_at: now, updated_at: now },
];

export const previewFixtures: Record<string, unknown[]> = {
  customers: previewCustomers,
  tickets: previewTickets,
  ticket_notes: previewTicketNotes,
  settings: previewSettings,
};
