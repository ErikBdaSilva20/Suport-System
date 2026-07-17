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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTicketsAndCustomers } from '@/hooks/use-tickets-and-customers';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import type { Customer } from '@/lib/data/customers.repo';
import { deleteCustomer } from '@/lib/data/customers.repo';
import { Building2, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

export default function CustomersScreen() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { customers, tickets, isLoading, reload } = useTicketsAndCustomers();
  const [search, setSearch] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = session?.role === 'admin';

  const ticketCountByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => map.set(t.customer_id, (map.get(t.customer_id) ?? 0) + 1));
    return map;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone_e164.includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, search]);

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setDeleting(true);
    try {
      await deleteCustomer(customerToDelete.id);
      toast({ title: `${customerToDelete.name} excluído` });
      setCustomerToDelete(null);
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} clientes</p>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="text-right">Tickets</TableHead>
              {isAdmin && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((customer) => {
              const ticketCount = ticketCountByCustomer.get(customer.id) ?? 0;
              return (
                <TableRow key={customer.id} className="hover:bg-accent/50">
                  <TableCell>
                    <Link
                      to={`/customers/${customer.id}`}
                      className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground" /> {customer.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.phone_e164}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {ticketCount}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:hover:text-muted-foreground"
                        disabled={ticketCount > 0}
                        title={
                          ticketCount > 0 ? 'Só é possível excluir clientes sem tickets' : undefined
                        }
                        onClick={() => setCustomerToDelete(customer)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 5 : 4}
                  className="text-center text-sm text-muted-foreground py-8"
                >
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!customerToDelete}
        onOpenChange={(open) => !open && setCustomerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {customerToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente será removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
