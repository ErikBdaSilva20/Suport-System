// Ponto de entrada do modo demo. Só faz algo quando VITE_MOCK_MODE=true no
// build (ex: deploy de demonstração na Vercel) — em qualquer outro build este
// módulo é um no-op. Precisa ser importado ANTES de qualquer import que passe
// por '@/lib/auth' (ver comentário no topo de App.tsx), pra window.__MASI_PREVIEW__
// já estar setado quando client.ts avaliar isPreview.
import type { Role } from '@/lib/data/client';
import { applyMockRole } from './roles';

// VITE_MOCK_MODE não é um contrato do gateway (ver masi.template.json#envContract),
// então a tipagem fica aqui em vez de em src/vite-env.d.ts — tudo relativo ao
// modo demo cabe dentro desta pasta.
declare global {
  interface ImportMetaEnv {
    readonly VITE_MOCK_MODE?: string;
  }
}

export const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true';

const ROLE_STORAGE_KEY = 'masi_mock_role';
const VALID_ROLES: Role[] = ['admin', 'manager', 'rep'];

export function getMockRole(): Role {
  const stored = localStorage.getItem(ROLE_STORAGE_KEY);
  return (VALID_ROLES as string[]).includes(stored ?? '') ? (stored as Role) : 'admin';
}

// Troca o papel visualizado. Recarrega a página de propósito: é a forma mais
// simples e confiável de garantir que toda tela remonte e refaça as buscas já
// com o recorte de dados do novo papel, sem ter que ensinar cada tela a reagir
// a uma troca de sessão em tempo real (algo que não acontece no app real).
export function setMockRole(role: Role): void {
  localStorage.setItem(ROLE_STORAGE_KEY, role);
  window.location.reload();
}

if (isMockMode) {
  window.__MASI_PREVIEW__ = true;
  applyMockRole(getMockRole());
}
