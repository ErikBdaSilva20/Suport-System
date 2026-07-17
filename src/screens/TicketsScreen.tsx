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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/PhoneInput';
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
import { updateCustomer } from '@/lib/data/customers.repo';
import type { Ticket } from '@/lib/data/tickets.repo';
import { deleteTicket } from '@/lib/data/tickets.repo';
import { LayoutGrid, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  resolved: 'Resolvido',
};
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

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function TicketsScreen() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  const { tickets, customers, isLoading, reload } = useTicketsAndCustomers();
  const [search, setSearch] = useState('');
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = session?.role === 'admin';
  const isRep = session?.role === 'rep';
  const myCustomer = isRep ? (customers[0] ?? null) : null;

  const [editingPhone, setEditingPhone] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const openEditPhone = () => {
    if (!myCustomer) return;
    setEditPhone(myCustomer.phone_e164);
    setEditingPhone(true);
  };

  const handleSavePhone = async () => {
    const digits = editPhone.replace(/\D/g, '');
    if (!myCustomer || !digits) {
      toast({ title: 'Telefone inválido', variant: 'destructive' });
      return;
    }
    setSavingPhone(true);
    try {
      await updateCustomer(myCustomer.id, { phone_e164: digits });
      await reload();
      setEditingPhone(false);
      toast({ title: 'Telefone atualizado', variant: 'success' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar telefone', description: e.message, variant: 'destructive' });
    } finally {
      setSavingPhone(false);
    }
  };

  const customersById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets
      .filter(
        (t) =>
          !q ||
          t.category?.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          customersById.get(t.customer_id)?.name.toLowerCase().includes(q)
      )
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
          <h1 className="text-2xl font-bold text-foreground">
            {isRep ? 'Meus Chamados' : 'Tickets'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRep ? `${filtered.length} chamados no seu histórico` : `${filtered.length} tickets`}
          </p>
        </div>
        <div className="flex gap-2">
          {!isRep && (
            <Button variant="outline" asChild className="gap-2">
              <Link to="/tickets/kanban">
                <LayoutGrid className="h-4 w-4" /> Ver como Kanban
              </Link>
            </Button>
          )}
          <Button asChild className="gap-2">
            <Link to="/tickets/new">
              <Plus className="h-4 w-4" /> {isRep ? 'Abrir chamado' : 'Novo Ticket'}
            </Link>
          </Button>
        </div>
      </div>

      {myCustomer && (
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Seu telefone de contato</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              É o número que o suporte usa pra falar com você pelo WhatsApp quando atender um
              chamado seu.
            </p>
          </div>
          {editingPhone ? (
            <div className="flex gap-2">
              <PhoneInput value={editPhone} onChange={setEditPhone} />
              <Button size="sm" onClick={handleSavePhone} disabled={savingPhone}>
                {savingPhone && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingPhone(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">{myCustomer.phone_e164}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={openEditPhone}
                aria-label="Editar telefone"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={
            isRep
              ? 'Buscar por categoria ou assunto...'
              : 'Buscar por categoria, assunto ou cliente...'
          }
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            {filtered.map((ticket) => (
              <TableRow
                key={ticket.id}
                className="hover:bg-accent/50 cursor-pointer"
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {ticket.number}
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-foreground line-clamp-1">
                    {ticket.subject}
                  </span>
                  {isRep && ticket.description && (
                    <span className="block text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {ticket.description}
                    </span>
                  )}
                </TableCell>
                {!isRep && (
                  <TableCell className="text-sm text-muted-foreground">
                    {customersById.get(ticket.customer_id)?.name ?? '—'}
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant="outline" className={STATUS_TONE[ticket.status]}>
                    {STATUS_LABEL[ticket.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={PRIORITY_TONE[ticket.priority]}>
                    {PRIORITY_LABEL[ticket.priority]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {ticket.category ?? '—'}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(ticket.created_at)}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTicketToDelete(ticket);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="text-center text-sm text-muted-foreground py-8"
                >
                  Nenhum ticket encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!ticketToDelete}
        onOpenChange={(open) => !open && setTicketToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ticket #{ticketToDelete?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              O ticket será removido junto com suas notas internas. Esta ação não pode ser desfeita.
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
