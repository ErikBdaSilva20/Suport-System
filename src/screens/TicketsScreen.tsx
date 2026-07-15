import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, LayoutGrid } from 'lucide-react';
import { listTickets, deleteTicket } from '@/lib/data/tickets.repo';
import { listCustomers } from '@/lib/data/customers.repo';
import type { Ticket } from '@/lib/data/tickets.repo';
import type { Customer } from '@/lib/data/customers.repo';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_LABEL: Record<string, string> = { open: 'Aberto', in_progress: 'Em atendimento', resolved: 'Resolvido' };
const STATUS_TONE: Record<string, string> = {
  open: 'bg-status-open/15 text-status-open border-status-open/30',
  in_progress: 'bg-status-pending/15 text-status-pending border-status-pending/30',
  resolved: 'bg-status-resolved/15 text-status-resolved border-status-resolved/30',
};
const PRIORITY_LABEL: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };

const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function TicketsScreen() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = session?.role === 'admin';

  const load = async () => {
    setIsLoading(true);
    try {
      const [t, c] = await Promise.all([listTickets(), listCustomers()]);
      setTickets(t);
      setCustomers(c);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar tickets', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const customersById = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets
      .filter(t => !q || t.subject.toLowerCase().includes(q) || customersById.get(t.customer_id)?.name.toLowerCase().includes(q))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [tickets, search, customersById]);

  const handleDelete = async () => {
    if (!ticketToDelete) return;
    setDeleting(true);
    try {
      await deleteTicket(ticketToDelete.id);
      toast({ title: `Ticket #${ticketToDelete.number} excluído` });
      setTicketToDelete(null);
      await load();
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
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
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} tickets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link to="/tickets/kanban"><LayoutGrid className="h-4 w-4" /> Ver como Kanban</Link>
          </Button>
          <Button asChild className="gap-2">
            <Link to="/tickets/new"><Plus className="h-4 w-4" /> Novo Ticket</Link>
          </Button>
        </div>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar tickets..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Criado</TableHead>
              {isAdmin && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(ticket => (
              <TableRow key={ticket.id} className="hover:bg-accent/50">
                <TableCell>
                  <Link to={`/tickets/${ticket.id}`} className="font-mono text-xs text-muted-foreground">{ticket.number}</Link>
                </TableCell>
                <TableCell>
                  <Link to={`/tickets/${ticket.id}`} className="text-sm font-medium text-foreground hover:text-primary line-clamp-1">
                    {ticket.subject}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{customersById.get(ticket.customer_id)?.name ?? '—'}</TableCell>
                <TableCell><Badge variant="outline" className={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{PRIORITY_LABEL[ticket.priority]}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{ticket.category ?? '—'}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">{formatDate(ticket.created_at)}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setTicketToDelete(ticket)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum ticket encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!ticketToDelete} onOpenChange={(open) => !open && setTicketToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ticket #{ticketToDelete?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              O ticket será removido junto com suas notas internas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
