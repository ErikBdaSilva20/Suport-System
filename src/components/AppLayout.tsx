import { Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Ticket, Users, BookOpen, Settings, Search, LogOut, Sparkles } from 'lucide-react';
import {
  SidebarProvider, SidebarTrigger, Sidebar, SidebarContent,
  SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { NotificationBell } from '@/components/NotificationBell';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/presentation/hooks/identity/useAuth';
import { useState } from 'react';
import { useSetupStatus } from '@/presentation/hooks/setup/useSetupStatus';
import { SetupWizardModal } from '@/components/setup/SetupWizardModal';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Tickets', url: '/tickets', icon: Ticket },
  { title: 'Clientes', url: '/customers', icon: Users },
  { title: 'Base de Conhecimento', url: '/kb', icon: BookOpen },
  { title: 'Assistente IA', url: '/kb/assistant', icon: Sparkles },
  { title: 'Configurações', url: '/settings', icon: Settings },
];

function AppSidebarContent() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

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
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
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
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const initials = currentUser?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'U';
  const avatarUrl = (currentUser as { avatar_url?: string | null } | undefined)?.avatar_url ?? null;

  // Setup wizard: only for admins, blocks until configured (or skipped this session)
  const isAdmin = currentUser?.role === 'admin';
  const { loading: setupLoading, isComplete, pending, refetch } = useSetupStatus(isAdmin);
  const [setupSkipped, setSetupSkipped] = useState(false);
  const showWizard = isAdmin && !setupLoading && !isComplete && !setupSkipped;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebarContent />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar tickets, clientes..." className="pl-9 bg-secondary border-border" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-secondary transition-colors"
                    aria-label="Meu perfil"
                  >
                    <Avatar className="h-8 w-8">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={currentUser?.full_name ?? 'Usuário'} />}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground hidden md:block">{currentUser?.full_name ?? 'Usuário'}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Meu perfil</TooltipContent>
              </Tooltip>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <SetupWizardModal
        open={showWizard}
        pending={pending}
        onSkip={() => setSetupSkipped(true)}
        onRefetch={refetch}
        onComplete={() => { setSetupSkipped(true); }}
      />
    </SidebarProvider>
  );
}
