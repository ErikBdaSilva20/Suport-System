import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTicketsAndCustomers } from '@/hooks/use-tickets-and-customers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_LABEL: Record<string, string> = { open: 'Aberto', in_progress: 'Em atendimento', resolved: 'Resolvido' };
const STATUS_TONE: Record<string, string> = {
  open: 'bg-status-open text-white border-transparent',
  in_progress: 'bg-status-pending text-white border-transparent',
  resolved: 'bg-status-resolved text-white border-transparent',
};

export default function CustomerDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { customers, tickets, isLoading } = useTicketsAndCustomers();

  const customer = useMemo(() => customers.find(c => c.id === id) ?? null, [customers, id]);
  const sortedTickets = useMemo(
    () => tickets.filter(t => t.customer_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [tickets, id],
  );

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" asChild><Link to="/customers"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <p className="text-muted-foreground">Cliente não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/customers"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Telefone</p>
          <p className="text-sm text-foreground">{customer.phone_e164}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">E-mail</p>
          <p className="text-sm text-foreground">{customer.email ?? '—'}</p>
        </div>
        {customer.notes && (
          <div className="sm:col-span-3">
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{customer.notes}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 pb-0">
          <h2 className="text-sm font-semibold text-foreground">Tickets ({sortedTickets.length})</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTickets.map(ticket => (
              <TableRow key={ticket.id} className="hover:bg-accent/50">
                <TableCell>
                  <Link to={`/tickets/${ticket.id}`} className="font-mono text-xs text-muted-foreground">{ticket.number}</Link>
                </TableCell>
                <TableCell>
                  <Link to={`/tickets/${ticket.id}`} className="text-sm font-medium text-foreground hover:text-primary">{ticket.subject}</Link>
                </TableCell>
                <TableCell><Badge variant="outline" className={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge></TableCell>
              </TableRow>
            ))}
            {sortedTickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">Nenhum ticket ainda.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
