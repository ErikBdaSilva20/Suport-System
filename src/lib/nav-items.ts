import type { Role } from '@/lib/data/client';
import { LayoutDashboard, Settings, Ticket, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const STAFF_NAV_ITEMS: (NavItem & { adminOnly?: boolean })[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Tickets', url: '/tickets', icon: Ticket },
  { title: 'Clientes', url: '/customers', icon: Users },
  { title: 'Configurações', url: '/settings', icon: Settings, adminOnly: true },
];

const REP_NAV_ITEMS: NavItem[] = [{ title: 'Meus Chamados', url: '/tickets', icon: Ticket }];

// Navegação do rep

export function getNavItems(role: Role | undefined): NavItem[] {
  if (role === 'rep') return REP_NAV_ITEMS;
  return STAFF_NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin');
}
