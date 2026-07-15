import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleDot, Clock, CheckCircle2 } from 'lucide-react';
import { listTickets } from '@/lib/data/tickets.repo';
import { listCustomers } from '@/lib/data/customers.repo';
import type { Ticket } from '@/lib/data/tickets.repo';
import type { Customer } from '@/lib/data/customers.repo';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const STATUS_LABEL: Record<string, string> = { open: 'Aberto', in_progress: 'Em atendimento', resolved: 'Resolvido' };
const STATUS_TONE: Record<string, string> = {
  open: 'bg-status-open text-white border-transparent',
  in_progress: 'bg-status-pending text-white border-transparent',
  resolved: 'bg-status-resolved text-white border-transparent',
};

export default function DashboardScreen() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([listTickets(), listCustomers()])
      .then(([t, c]) => { setTickets(t); setCustomers(c); })
      .catch((e: any) => toast({ title: 'Erro ao carregar dashboard', description: e.message, variant: 'destructive' }))
      .finally(() => setIsLoading(false));
  }, []);

  const customersById = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

  const counts = useMemo(() => ({
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }), [tickets]);

  const recent = useMemo(
    () => [...tickets].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [tickets],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-status-open/30 bg-status-open/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Abertos</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-open/15">
              <CircleDot className="h-5 w-5 text-status-open" />
            </div>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground">{counts.open}</div></CardContent>
        </Card>
        <Card className="border-status-pending/30 bg-status-pending/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em atendimento</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-pending/15">
              <Clock className="h-5 w-5 text-status-pending" />
            </div>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground">{counts.in_progress}</div></CardContent>
        </Card>
        <Card className="border-status-resolved/30 bg-status-resolved/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolvidos</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-resolved/15">
              <CheckCircle2 className="h-5 w-5 text-status-resolved" />
            </div>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground">{counts.resolved}</div></CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Chamados recentes</h2>
        {recent.length === 0 && <p className="text-sm text-muted-foreground">Nenhum ticket ainda.</p>}
        {recent.map(ticket => (
          <Link
            key={ticket.id}
            to={`/tickets/${ticket.id}`}
            className="flex items-center justify-between gap-3 rounded-md p-2 -mx-2 hover:bg-accent/50"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">#{ticket.number} {ticket.subject}</p>
              <p className="text-xs text-muted-foreground truncate">{customersById.get(ticket.customer_id)?.name ?? '—'}</p>
            </div>
            <Badge variant="outline" className={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
