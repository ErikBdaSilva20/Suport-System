import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { List } from 'lucide-react';
import { listTickets, updateTicket, assignTicket, resolveTicket } from '@/lib/data/tickets.repo';
import { listCustomers } from '@/lib/data/customers.repo';
import type { Ticket } from '@/lib/data/tickets.repo';
import type { Customer } from '@/lib/data/customers.repo';
import type { TicketStatus } from '@/lib/data/types.gen';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const COLUMNS: { status: TicketStatus; label: string; tone: string }[] = [
  { status: 'open', label: 'Aberto', tone: 'border-status-open/40' },
  { status: 'in_progress', label: 'Em atendimento', tone: 'border-status-pending/40' },
  { status: 'resolved', label: 'Resolvido', tone: 'border-status-resolved/40' },
];

const PRIORITY_LABEL: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };

function KanbanCard({ ticket, customerName, disabled }: { ticket: Ticket; customerName: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ticket.id, disabled });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-md border border-border bg-card p-3 space-y-1.5 ${disabled ? '' : 'cursor-grab active:cursor-grabbing'} ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">#{ticket.number}</span>
        <Badge variant="secondary" className="text-[10px]">{PRIORITY_LABEL[ticket.priority]}</Badge>
      </div>
      <Link to={`/tickets/${ticket.id}`} className="block text-sm font-medium text-foreground hover:text-primary line-clamp-2">
        {ticket.subject}
      </Link>
      <p className="text-xs text-muted-foreground truncate">{customerName}</p>
      {ticket.category && <Badge variant="outline" className="text-[10px]">{ticket.category}</Badge>}
    </div>
  );
}

function KanbanColumn({ status, label, tone, tickets, customersById, disabled }: {
  status: TicketStatus; label: string; tone: string; tickets: Ticket[];
  customersById: Map<string, Customer>; disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef} className={`flex-1 min-w-64 rounded-lg border-t-2 bg-muted/30 p-3 space-y-2 ${tone} ${isOver ? 'bg-accent/50' : ''}`}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        <span className="text-xs text-muted-foreground">{tickets.length}</span>
      </div>
      <div className="space-y-2 min-h-16">
        {tickets.map(ticket => (
          <KanbanCard key={ticket.id} ticket={ticket} customerName={customersById.get(ticket.customer_id)?.name ?? '—'} disabled={disabled} />
        ))}
      </div>
    </div>
  );
}

export default function TicketKanbanScreen() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isRep = session?.role === 'rep';
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  const byStatus = useMemo(() => {
    const grouped: Record<TicketStatus, Ticket[]> = { open: [], in_progress: [], resolved: [] };
    for (const t of tickets) grouped[t.status].push(t);
    return grouped;
  }, [tickets]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !session) return;
    const ticket = tickets.find(t => t.id === active.id);
    const newStatus = over.id as TicketStatus;
    if (!ticket || ticket.status === newStatus) return;

    setTickets(prev => prev.map(t => (t.id === ticket.id ? { ...t, status: newStatus } : t)));
    try {
      if (newStatus === 'in_progress') await assignTicket(ticket.id, session.user.id);
      else if (newStatus === 'resolved') await resolveTicket(ticket.id);
      else await updateTicket(ticket.id, { status: 'open', resolved_at: null });
    } catch (e: any) {
      toast({ title: 'Erro ao mover ticket', description: e.message, variant: 'destructive' });
      await load();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-3"><Skeleton className="h-96 flex-1" /><Skeleton className="h-96 flex-1" /><Skeleton className="h-96 flex-1" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Kanban de tickets</h1>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link to="/tickets"><List className="h-4 w-4" /> Ver como lista</Link>
        </Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              tone={col.tone}
              tickets={byStatus[col.status]}
              customersById={customersById}
              disabled={isRep}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
