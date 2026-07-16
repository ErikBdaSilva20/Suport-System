import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, LayoutGrid } from 'lucide-react';
import { deleteTicket } from '@/lib/data/tickets.repo';
import type { Ticket } from '@/lib/data/tickets.repo';
import { useTicketsAndCustomers } from '@/hooks/use-tickets-and-customers';
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
  open: 'bg-status-open text-white border-transparent',
  in_progress: 'bg-status-pending text-white border-transparent',
  resolved: 'bg-status-resolved text-white border-transparent',
};
const PRIORITY_LABEL: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };
const PRIORITY_TONE: Record<string, string> = {
  low: 'bg-priority-low text-white border-transparent',
  medium: 'bg-priority-medium text-white border-transparent',
  high: 'bg-priority-high text-white border-transparent',
};

const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function TicketsScreen() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { tickets, customers, isLoading, reload } = useTicketsAndCustomers();
  const [search, setSearch] = useState('');
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = session?.role === 'admin';
  const isRep = session?.role === 'rep';

  const customersById = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets
      .filter(t => !q
        || t.category?.toLowerCase().includes(q)
        || t.subject.toLowerCase().includes(q)
        || customersById.get(t.customer_id)?.name.toLowerCase().includes(q))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [tickets, search, customersById]);

  // Cliente e a coluna de exclusão não fazem sentido pro rep (a lista já é só
  // dele, e ele não exclui chamados) — colSpan do "vazio" acompanha isso.
  const columnCount = 6 + (isRep ? 0 : 1) + (isAdmin ? 1 : 0);

  const handleDelete = async () => {
    if (!ticketToDelete) return;
    setDeleting(true);
    try {
      await deleteTicket(ticketToDelete.id);
      toast({ title: `Ticket #${ticketToDelete.number} excluído` });
      setTicketToDelete(null);
      await reload();
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
          <h1 className="text-2xl font-bold text-foreground">{isRep ? 'Meus Chamados' : 'Tickets'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRep ? `${filtered.length} chamados no seu histórico` : `${filtered.length} tickets`}
          </p>
        </div>
        <div className="flex gap-2">
          {!isRep && (
            <Button variant="outline" asChild className="gap-2">
              <Link to="/tickets/kanban"><LayoutGrid className="h-4 w-4" /> Ver como Kanban</Link>
            </Button>
          )}
          <Button asChild className="gap-2">
            <Link to="/tickets/new"><Plus className="h-4 w-4" /> {isRep ? 'Abrir chamado' : 'Novo Ticket'}</Link>
          </Button>
        </div>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={isRep ? 'Buscar por categoria ou assunto...' : 'Buscar por categoria, assunto ou cliente...'}
          className="pl-9" value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Assunto</TableHead>
              {!isRep && <TableHead>Cliente</TableHead>}
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
                  <Link to={`/tickets/${ticket.id}`} className="block hover:text-primary">
                    <span className="text-sm font-medium text-foreground line-clamp-1">{ticket.subject}</span>
                    {isRep && ticket.description && (
                      <span className="block text-xs text-muted-foreground line-clamp-1 mt-0.5">{ticket.description}</span>
                    )}
                  </Link>
                </TableCell>
                {!isRep && (
                  <TableCell className="text-sm text-muted-foreground">{customersById.get(ticket.customer_id)?.name ?? '—'}</TableCell>
                )}
                <TableCell><Badge variant="outline" className={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={PRIORITY_TONE[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]}</Badge></TableCell>
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
                <TableCell colSpan={columnCount} className="text-center text-sm text-muted-foreground py-8">
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
