// Espelha, só no cliente, as mesmas regras de visibilidade que o gateway real
// aplica em local-gateway/src/data.js: rep vê só o próprio owner_id; manager
// não vê customer_feedback de canal 'urgent'; admin vê tudo. Sem isso, trocar
// de papel no switcher mudaria só os botões da tela, não os dados — o que
// tornaria a demonstração enganosa (ex: "rep" veria os chamados de todo mundo).
import type { AuthSession, Role } from '@/lib/data/client';
import {
  MOCK_REP_OWNER_ID,
  mockCustomers,
  mockFeedback,
  mockTicketNotes,
  mockTickets,
} from './fixtures';

// Declaração local pro global que client.ts (protegido) passa a ler em
// auth.me() — mantém o "contrato" fora do arquivo protegido, que só ganha a
// linha que efetivamente lê o valor.
declare global {
  interface Window {
    __MASI_PREVIEW_SESSION__?: AuthSession;
  }
}

export const MOCK_SESSIONS: Record<Role, AuthSession> = {
  admin: {
    user: { id: 'mock-admin-1', name: 'Ana Admin (demo)', email: 'admin@demo.helpdesk' },
    role: 'admin',
  },
  manager: {
    user: { id: 'mock-manager-1', name: 'Marcos Manager (demo)', email: 'manager@demo.helpdesk' },
    role: 'manager',
  },
  rep: {
    user: { id: MOCK_REP_OWNER_ID, name: 'Carla Cliente (demo)', email: 'carla@demo.helpdesk' },
    role: 'rep',
  },
};

const previewKey = (table: string) => `__masi_preview_${table}`;

// rep só vê o próprio owner_id (mesma regra de `data.js` pra tabelas `hasOwner`
// quando o papel não é admin/manager); demais papéis veem tudo.
function scopedByOwner<T extends { owner_id: string }>(rows: T[], role: Role): T[] {
  return role === 'rep' ? rows.filter((r) => r.owner_id === MOCK_REP_OWNER_ID) : rows;
}

// Popula o "banco" em memória do modo preview (window.__masi_preview_<tabela>,
// lido por previewStore() em client.ts) com o recorte que o papel escolhido
// deveria enxergar, e troca a sessão retornada por auth.me().
export function applyMockRole(role: Role): void {
  const store = window as unknown as Record<string, unknown[]>;

  store[previewKey('customers')] = scopedByOwner(mockCustomers, role).map((r) => ({ ...r }));
  store[previewKey('tickets')] = scopedByOwner(mockTickets, role).map((r) => ({ ...r }));
  store[previewKey('ticket_notes')] = scopedByOwner(mockTicketNotes, role).map((r) => ({ ...r }));

  // managerFilter real: `channel = 'general'` (Story 11.2, tables.js).
  const feedbackForRole = role === 'manager' ? mockFeedback.filter((f) => f.channel === 'general') : mockFeedback;
  store[previewKey('customer_feedback')] = scopedByOwner(feedbackForRole, role).map((r) => ({ ...r }));

  window.__MASI_PREVIEW_SESSION__ = MOCK_SESSIONS[role];
}
