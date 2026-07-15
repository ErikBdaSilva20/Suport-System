import { Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Ticket, Users, Settings, LogOut, Bell } from 'lucide-react';
import {
  SidebarProvider, SidebarTrigger, Sidebar, SidebarContent,
  SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useOpenTicketsBadge } from '@/hooks/use-open-tickets-badge';

function NotificationBell() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const enabled = !!session && session.role !== 'rep';
  const count = useOpenTicketsBadge(enabled);

  if (!enabled) return null;

  const label = !count ? 'Notificações, nenhum chamado novo' : `Notificações, ${count} chamados novos`;

  return (
    <Button
      variant="ghost" size="icon" className="relative h-8 w-8 text-foreground/75 hover:text-foreground"
      aria-label={label} onClick={() => navigate('/tickets')}
    >
      <Bell className="h-[18px] w-[18px]" />
      {!!count && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold leading-none text-destructive-foreground">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Button>
  );
}

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Tickets', url: '/tickets', icon: Ticket },
  { title: 'Clientes', url: '/customers', icon: Users },
  { title: 'Configurações', url: '/settings', icon: Settings, adminOnly: true },
];

function AppSidebarContent() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const visibleItems = navItems.filter(item => !item.adminOnly || session?.role === 'admin');

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        {!collapsed && <span className="text-lg font-bold text-white tracking-tight">HelpDesk</span>}
        {collapsed && <span className="text-lg font-bold text-white">HD</span>}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="text-sidebar-foreground hover:bg-white/10 hover:text-white transition-colors"
                      activeClassName="bg-sidebar-primary text-white font-semibold"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-sidebar-foreground hover:text-white hover:bg-white/10 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout() {
  const { session } = useAuth();
  const initials = session?.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebarContent />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-md sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden md:block">{session?.user.name}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
