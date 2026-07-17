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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/PhoneInput';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useTicketsAndCustomers } from '@/hooks/use-tickets-and-customers';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { deleteCustomer, updateCustomer } from '@/lib/data/customers.repo';
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

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

export default function CustomerDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  const { customers, tickets, isLoading, reload } = useTicketsAndCustomers();

  const isAdmin = session?.role === 'admin';

  const customer = useMemo(() => customers.find((c) => c.id === id) ?? null, [customers, id]);
  const sortedTickets = useMemo(
    () =>
      tickets
        .filter((t) => t.customer_id === id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [tickets, id]
  );

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openEdit = () => {
    if (!customer) return;
    setEditName(customer.name);
    setEditPhone(customer.phone_e164);
    setEditEmail(customer.email ?? '');
    setEditNotes(customer.notes ?? '');
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!customer || !editName.trim() || !editPhone.trim()) {
      toast({ title: 'Nome e telefone são obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await updateCustomer(customer.id, {
        name: editName.trim(),
        phone_e164: editPhone,
        email: editEmail.trim() || null,
        notes: editNotes.trim() || null,
      });
      await reload();
      setShowEdit(false);
      toast({ title: 'Cliente atualizado', variant: 'success' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    setDeleting(true);
    try {
      await deleteCustomer(customer.id);
      toast({ title: `${customer.name} excluído` });
      navigate('/customers');
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-muted-foreground">Cliente não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground flex-1">{customer.name}</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10 disabled:opacity-40"
              disabled={sortedTickets.length > 0}
              title={
                sortedTickets.length > 0 ? 'Só é possível excluir clientes sem tickets' : undefined
              }
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </Button>
          </div>
        )}
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
          <h2 className="text-sm font-semibold text-foreground">
            Tickets ({sortedTickets.length})
          </h2>
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
            {sortedTickets.map((ticket) => (
              <TableRow key={ticket.id} className="hover:bg-accent/50">
                <TableCell>
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="font-mono text-xs text-muted-foreground"
                  >
                    {ticket.number}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary"
                  >
                    {ticket.subject}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_TONE[ticket.status]}>
                    {STATUS_LABEL[ticket.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {sortedTickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum ticket ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Editar cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone (WhatsApp) *</Label>
              <PhoneInput value={editPhone} onChange={setEditPhone} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="email@empresa.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {customer.name}?</AlertDialogTitle>
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
