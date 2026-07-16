import { describe, it, expect } from 'vitest';
import { Ticket } from 'lucide-react';
import { getNavItems } from '@/lib/nav-items';

describe('getNavItems', () => {
  it('gives admin every item, including Configurações', () => {
    const titles = getNavItems('admin').map(i => i.title);
    expect(titles).toEqual(['Dashboard', 'Tickets', 'Clientes', 'Configurações']);
  });

  it('gives manager everything except Configurações', () => {
    const titles = getNavItems('manager').map(i => i.title);
    expect(titles).toEqual(['Dashboard', 'Tickets', 'Clientes']);
  });

  it('gives rep only "Meus Chamados", pointing at /tickets', () => {
    const items = getNavItems('rep');
    expect(items).toEqual([{ title: 'Meus Chamados', url: '/tickets', icon: Ticket }]);
  });

  it('falls back to the non-admin staff nav when role is undefined', () => {
    const titles = getNavItems(undefined).map(i => i.title);
    expect(titles).toEqual(['Dashboard', 'Tickets', 'Clientes']);
  });
});
