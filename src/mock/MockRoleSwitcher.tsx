import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Role } from '@/lib/data/client';
import { getMockRole, setMockRole } from './bootstrap';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  manager: 'Manager',
  rep: 'Rep (cliente)',
};

// Barra fixa no topo, visível em toda tela — inclusive por cima do login, que
// nem chega a aparecer no modo demo (auth.me() já retorna sessão preenchida).
// Deixa óbvio que os dados são fixos e permite trocar de papel sem precisar
// de um login de verdade pra cada um.
export function MockRoleSwitcher() {
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-2 border-b border-amber-600/30 bg-amber-400 px-4 py-1.5 text-xs font-medium text-amber-950">
      <span>🎭 Modo demonstração — dados fixos, sem gateway real. Visualizando como:</span>
      <Select value={getMockRole()} onValueChange={(value) => setMockRole(value as Role)}>
        <SelectTrigger className="h-7 w-40 border-amber-950/30 bg-amber-50 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_LABEL[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
