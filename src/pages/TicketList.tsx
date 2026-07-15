import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, LayoutList, LayoutGrid, X, RefreshCw, Trash2 } from 'lucide-react';
import { DeleteTicketUseCase } from '@/application/ticketing/DeleteTicketUseCase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTickets } from '@/presentation/hooks/ticketing/useTickets';
import { useAuth } from '@/presentation/hooks/identity/useAuth';
import { UpdateTicketStatusUseCase } from '@/application/ticketing/UpdateTicketStatusUseCase';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { SLABadge } from '@/components/SLABadge';
import { TicketKanban } from '@/components/TicketKanban';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { TicketStatus, TicketPriority } from '@/types';

const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Aberto' },
  { value: 'pending', label: 'Pendente' },
  { value: 'resolved', label: 'Resolvido' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

export default function TicketList() {
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus[]>(['open', 'pending']);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<{ id: string; number: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = currentUser?.role === 'admin';

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;
    setDeleting(true);
    try {
      await new DeleteTicketUseCase().execute(ticketToDelete.id);
      toast({ title: 'Ticket excluído', description: `Ticket #${ticketToDelete.number} removido do sistema local.` });
      setTicketToDelete(null);
      await refetch();
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters = {
    ...(activeTab === 'mine' ? { involvedUserId: currentUser?.id } : {}),
    ...(activeTab === 'unassigned' ? { assignedAgentId: null as string | null, status: ['open'] as TicketStatus[] } : {}),
    ...(searchDebounced ? { search: searchDebounced } : {}),
    ...(statusFilter.length > 0 && activeTab !== 'unassigned' ? { status: statusFilter } : {}),
    ...(priorityFilter.length > 0 ? { priority: priorityFilter } : {}),
  };

  const { data, isLoading, refetch } = useTickets(filters);
  const tickets = data?.tickets ?? [];

  const handleStatusChange = useCallback(async (ticketId: string, newStatus: TicketStatus) => {
    try {
      const uc = new UpdateTicketStatusUseCase();
      const result = await uc.execute(ticketId, newStatus, currentUser?.full_name ?? 'Sistema');
      refetch();
      if (result.zendeskSync === 'failed') {
        toast({
          title: 'Zendesk não sincronizou',
          description: result.zendeskError ?? 'Status alterado localmente, mas não foi possível atualizar no Zendesk.',
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({ title: 'Erro ao mover ticket', description: e.message, variant: 'destructive' });
    }
  }, [currentUser, refetch, toast]);

  const toggleStatus = (status: TicketStatus) => {
    setStatusFilter(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  const togglePriority = (priority: TicketPriority) => {
    setPriorityFilter(prev => prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]);
  };

  const activeFilterCount = statusFilter.length + priorityFilter.length + (searchDebounced ? 1 : 0);

  const handleSyncZendesk = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-zendesk-tickets', { body: {} });
      if (error) throw error;
      const d = data as any;
      if (d?.error) throw new Error(d.error);
      toast({
        title: 'Tickets atualizados',
      });
      await refetch();
    } catch (e: any) {
      toast({ title: 'Erro ao sincronizar', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">{tickets.length} tickets no total</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-border">
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode('list')}>
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode('kanban')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleSyncZendesk} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Atualizando...' : 'Atualizar Tickets'}
          </Button>
          <Button asChild className="gap-2">
            <Link to="/tickets/new"><Plus className="h-4 w-4" /> Novo Ticket</Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="mine">Meus Tickets</TabsTrigger>
          <TabsTrigger value="unassigned">Não Atribuídos</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar tickets..."
            className="pl-9 bg-secondary"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Filter className="h-3 w-3" /> Status
              {statusFilter.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">{statusFilter.length}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            {STATUS_OPTIONS.map(o => (
              <label key={o.value} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-md">
                <Checkbox checked={statusFilter.includes(o.value)} onCheckedChange={() => toggleStatus(o.value)} />
                {o.label}
              </label>
            ))}
          </PopoverContent>
        </Popover>

        {/* Priority Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Filter className="h-3 w-3" /> Prioridade
              {priorityFilter.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">{priorityFilter.length}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            {PRIORITY_OPTIONS.map(o => (
              <label key={o.value} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-md">
                <Checkbox checked={priorityFilter.includes(o.value)} onCheckedChange={() => togglePriority(o.value)} />
                {o.label}
              </label>
            ))}
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => { setSearchInput(''); setStatusFilter([]); setPriorityFilter([]); }}>
            <X className="h-3 w-3" /> Limpar filtros
          </Button>
        )}
      </div>

      {viewMode === 'kanban' ? (
        <TicketKanban tickets={tickets} onStatusChange={handleStatusChange} />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Criado</TableHead>
                {isAdmin && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id} className="cursor-pointer hover:bg-accent/50">
                  <TableCell>
                    <Link to={`/tickets/${ticket.id}`} className="font-mono text-xs text-muted-foreground">
                      {ticket.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link to={`/tickets/${ticket.id}`} className="block max-w-[250px]">
                      <span className="text-sm font-medium text-foreground hover:text-primary truncate block">
                        {ticket.internal_title || ticket.subject}
                        {ticket.involvement === 'participant' && (
                          <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 align-middle" title="Você foi citado neste ticket">@</Badge>
                        )}
                      </span>
                      {ticket.internal_title && (
                        <span className="text-[10px] text-muted-foreground/70 truncate italic block">{ticket.subject}</span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ticket.customer?.name}</TableCell>
                  <TableCell><StatusBadge status={ticket.status} /></TableCell>
                  <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                  <TableCell>
                    {ticket.assigned_agent ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                            {ticket.assigned_agent.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{ticket.assigned_agent.full_name.split(' ')[0]}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  <TableCell><SLABadge status={ticket.sla_status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {ticket.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">{formatDate(ticket.created_at)}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTicketToDelete({ id: ticket.id, number: ticket.number }); }}
                        title="Excluir ticket (apenas do sistema local)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!ticketToDelete} onOpenChange={(open) => !open && setTicketToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ticket #{ticketToDelete?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              O ticket será removido apenas do sistema local, junto com suas mensagens, tags e histórico.
              O ticket <strong>não</strong> será excluído do Zendesk — você pode reimportá-lo depois clicando em "Atualizar Tickets".
              Esta ação não pode ser desfeita localmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTicket}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
