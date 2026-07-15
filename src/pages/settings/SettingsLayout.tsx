import { Outlet } from 'react-router-dom';
import { Sliders, Users } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

const sidebarItems = [
  { label: 'Geral', path: '/settings/general', icon: Sliders },
  { label: 'Equipe', path: '/settings/team', icon: Users },
];

export default function SettingsLayout() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as preferências do sistema</p>
      </div>
      <div className="flex gap-6">
        <nav className="w-48 flex-shrink-0 space-y-1 hidden md:block">
          {sidebarItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              activeClassName="bg-primary/10 text-primary font-medium"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
