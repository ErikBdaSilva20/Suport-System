import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2 } from 'lucide-react';
import { listCustomers } from '@/lib/data/customers.repo';
import { listTickets } from '@/lib/data/tickets.repo';
import type { Customer } from '@/lib/data/customers.repo';
import type { Ticket } from '@/lib/data/tickets.repo';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomersScreen() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([listCustomers(), listTickets()])
      .then(([c, t]) => { setCustomers(c); setTickets(t); })
      .catch(e => toast({ title: 'Erro ao carregar clientes', description: e.message, variant: 'destructive' }))
      .finally(() => setIsLoading(false));
  }, []);

  const ticketCountByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach(t => map.set(t.customer_id, (map.get(t.customer_id) ?? 0) + 1));
    return map;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.phone_e164.includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, search]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} clientes</p>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou telefone..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="text-right">Tickets</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(customer => (
              <TableRow key={customer.id} className="hover:bg-accent/50">
                <TableCell>
                  <Link to={`/customers/${customer.id}`} className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary">
                    <Building2 className="h-4 w-4 text-muted-foreground" /> {customer.name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{customer.phone_e164}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{customer.email ?? '—'}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{ticketCountByCustomer.get(customer.id) ?? 0}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Nenhum cliente encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
