import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { markTicketSeen } from '@/hooks/use-open-tickets-badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import type { Customer } from '@/lib/data/customers.repo';
import { listCustomers } from '@/lib/data/customers.repo';
import type { TicketNote } from '@/lib/data/ticket_notes.repo';
import { createTicketNote, listTicketNotes } from '@/lib/data/ticket_notes.repo';
import type { Ticket } from '@/lib/data/tickets.repo';
import { assignTicket, listTickets, resolveTicket } from '@/lib/data/tickets.repo';
import { buildWhatsAppLink } from '@/utils/whatsapp';
import { ArrowLeft, Loader2, MessageCircle, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

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

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export default function TicketDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const { toast } = useToast();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const isRep = session?.role === 'rep';

  const load = async () => {
    setIsLoading(true);
    try {
      const [tickets, customers, ticketNotes] = await Promise.all([
        listTickets(),
        listCustomers(),
        listTicketNotes(),
      ]);
      const found = tickets.find((t) => t.id === id) ?? null;
      if (found) markTicketSeen(found.id);
      setTicket(found);
      setCustomer(found ? (customers.find((c) => c.id === found.customer_id) ?? null) : null);
      setNotes(
        ticketNotes
          .filter((n) => n.ticket_id === id)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
      );
    } catch (e: any) {
      toast({ title: 'Erro ao carregar ticket', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const whatsappLink = useMemo(
    () => (ticket ? buildWhatsAppLink(customer, ticket) : null),
    [ticket, customer],
  );

  const handleAssign = async () => {
    if (!ticket || !session) return;
    setUpdatingStatus(true);
    try {
      await assignTicket(ticket.id, session.user.id);
      toast({ title: 'Ticket assumido', variant: 'success' });
      await load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleResolve = async () => {
    if (!ticket) return;
    setUpdatingStatus(true);
    try {
      await resolveTicket(ticket.id);
      toast({ title: 'Ticket concluído', variant: 'success' });
      await load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!ticket || !newNote.trim()) return;
    setSavingNote(true);
    try {
      await createTicketNote({ ticket_id: ticket.id, body: newNote.trim() });
      setNewNote('');
      toast({ title: 'Nota salva', variant: 'success' });
      await load();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar nota', description: e.message, variant: 'destructive' });
    } finally {
      setSavingNote(false);
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

  if (!ticket) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-muted-foreground">Ticket não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">#{ticket.number}</span>
            <h1 className="text-lg font-bold text-foreground truncate">{ticket.subject}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={STATUS_TONE[ticket.status]}>
              {STATUS_LABEL[ticket.status]}
            </Badge>
            <Badge variant="outline" className={PRIORITY_TONE[ticket.priority]}>
              {PRIORITY_LABEL[ticket.priority]}
            </Badge>
            {ticket.category && <Badge variant="outline">{ticket.category}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Descrição
            </h2>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {ticket.description}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isRep ? 'Notas do problema' : 'Notas internas'}
            </h2>
            {notes.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma nota ainda.</p>
            )}
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-md border border-status-pending/30 bg-status-pending/5 p-3"
              >
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{timeAgo(note.created_at)}</p>
              </div>
            ))}

            {!isRep && (
              <div className="pt-2 space-y-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Descreva o que foi tratado com o cliente..."
                  className="min-h-[80px] text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={handleAddNote}
                    disabled={savingNote || !newNote.trim()}
                  >
                    {savingNote ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}{' '}
                    Salvar nota
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!isRep && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <h2 className="text-sm font-semibold text-foreground">Ações</h2>
              {ticket.status === 'open' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleAssign}
                  disabled={updatingStatus}
                >
                  Atender
                </Button>
              )}
              {ticket.status !== 'resolved' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleResolve}
                  disabled={updatingStatus}
                >
                  Concluir
                </Button>
              )}
              {whatsappLink && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 text-sla-ok border-sla-ok/40 hover:bg-sla-ok/10"
                  asChild
                >
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" /> Abrir conversa no WhatsApp
                  </a>
                </Button>
              )}
            </div>
          )}

          {customer && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-1">
              <h2 className="text-sm font-semibold text-foreground mb-2">
                <Link to={`/customers/${customer.id}`} className="hover:text-primary">
                  {customer.name}
                </Link>
              </h2>
              <p className="text-xs text-muted-foreground">{customer.phone_e164}</p>
              {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
