// PROTEGIDO — contrato com o tenant-gateway (Importantdoc.md#B5, #B8).
//
// Este arquivo normalmente é herdado do scaffold-base (clone-templates/wiki ou
// clone-templates/forms-nps) e nunca reescrito à mão pelo editor de IA. Como este
// repo ainda não teve o scaffold clonado, a
// implementação abaixo segue o contrato documentado ao pé da letra para que o
// resto do app já fique ligado corretamente — troque por uma cópia literal do
// client.ts do scaffold assim que ele for escolhido/clonado.
//
// Endpoints de auth seguem a convenção padrão do Better-Auth (/api/auth/*).
// Confirme os paths exatos contra o tenant-gateway real.
// antes de considerar pronto para produção — não há como validar sem acesso
// ao gateway.

import { previewFixtures } from './preview-fixtures';

declare global {
  interface Window {
    __MASI_GW__?: string;
    __MASI_TENANT__?: string;
    __MASI_PREVIEW__?: boolean;
  }
}

function resolveGatewayUrl(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('gw') || window.__MASI_GW__ || import.meta.env.VITE_GATEWAY_URL || '';
}

function resolveTenantId(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('t') || window.__MASI_TENANT__ || '';
}

const isPreview = typeof window !== 'undefined' && !!window.__MASI_PREVIEW__;

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const gw = resolveGatewayUrl();
  if (!gw)
    throw new Error('Gateway URL não configurada (VITE_GATEWAY_URL, ?gw= ou window.__MASI_GW__).');

  const res = await fetch(`${gw}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': resolveTenantId(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ---------------- Preview (Sandpack, sem gateway real) ----------------

function previewStore(table: string): Record<string, unknown>[] {
  const key = `__masi_preview_${table}`;
  const w = window as unknown as Record<string, Record<string, unknown>[] | undefined>;
  if (!w[key]) {
    w[key] = ((previewFixtures[table] as Record<string, unknown>[] | undefined) ?? []).map(
      (row) => ({ ...row })
    );
  }
  return w[key]!;
}

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---------------- db.table() — modo genérico do gateway ----------------

export const db = {
  table<R = any>(name: string) {
    return {
      list: async (): Promise<R[]> => {
        if (isPreview) return previewStore(name) as unknown as R[];
        return api<R[]>('GET', `/data/${name}`);
      },
      create: async (input: Partial<R>): Promise<R> => {
        if (isPreview) {
          const now = new Date().toISOString();
          const row = { id: genId(), created_at: now, updated_at: now, ...input } as unknown as R;
          previewStore(name).push(row as unknown as Record<string, unknown>);
          return row;
        }
        return api<R>('POST', `/data/${name}`, input);
      },
      update: async (id: string, patch: Partial<R>): Promise<R> => {
        if (isPreview) {
          const rows = previewStore(name);
          const idx = rows.findIndex((r) => r.id === id);
          if (idx === -1) throw new Error(`${name}/${id} não encontrado (preview)`);
          rows[idx] = { ...rows[idx], ...patch, updated_at: new Date().toISOString() };
          return rows[idx] as unknown as R;
        }
        return api<R>('PATCH', `/data/${name}/${id}`, patch);
      },
      remove: async (id: string): Promise<void> => {
        if (isPreview) {
          const rows = previewStore(name);
          const idx = rows.findIndex((r) => r.id === id);
          if (idx !== -1) rows.splice(idx, 1);
          return;
        }
        await api<void>('DELETE', `/data/${name}/${id}`);
      },
    };
  },
};

// ---------------- auth — Better-Auth via gateway ----------------

export type Role = 'admin' | 'manager' | 'rep';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser;
  role: Role;
}

const PREVIEW_SESSION: AuthSession = {
  user: { id: 'preview-user-1', name: 'Usuário Preview', email: 'preview@masia.cloud' },
  role: 'admin',
};

export const auth = {
  async signIn(email: string, password: string): Promise<void> {
    await api('POST', '/api/auth/sign-in/email', { email, password });
  },
  async signUp(
    email: string,
    password: string,
    name: string,
    opts?: { intent?: 'customer' }
  ): Promise<void> {
    await api('POST', '/api/auth/sign-up/email', { email, password, name, intent: opts?.intent });
  },
  async signOut(): Promise<void> {
    await api('POST', '/api/auth/sign-out');
  },
  async me(): Promise<AuthSession | null> {
    if (isPreview) return PREVIEW_SESSION;
    try {
      return await api<AuthSession>('GET', '/api/auth/me');
    } catch {
      return null;
    }
  },
  // Precisa de suporte equivalente no tenant-gateway real; hoje só funciona
  // contra o local-gateway.
  async adminCreateUser(
    name: string,
    email: string,
    role: 'manager'
  ): Promise<{ user: AuthUser; role: Role; temporaryPassword: string }> {
    return api('POST', '/api/auth/admin/create-user', { name, email, role });
  },
};
