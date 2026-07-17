import type { Role } from '@/lib/data/client';
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const STAFF_NAV_ITEMS: (NavItem & { adminOnly?: boolean })[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Tickets', url: '/tickets', icon: Ticket },
  { title: 'Clientes', url: '/customers', icon: Users },
  { title: 'Feedbacks', url: '/feedback', icon: MessageSquare },
  { title: 'Configurações', url: '/settings', icon: Settings, adminOnly: true },
];

// Rep não tem menu (AppLayout não renderiza sidebar pra ele) — só manager/admin usam isto.
export function getNavItems(role: Role | undefined): NavItem[] {
  return STAFF_NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin');
}
