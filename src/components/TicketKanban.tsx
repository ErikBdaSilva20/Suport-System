import { useCallback, useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Ticket as TicketEntity } from '@/domain/ticketing/entities/Ticket';
import { KanbanColumn } from '@/components/KanbanColumn';
import { KanbanCard } from '@/components/KanbanCard';
import { useToast } from '@/hooks/use-toast';
import type { Ticket, TicketStatus } from '@/types';

const KANBAN_COLUMNS: { status: TicketStatus; label: string; accentClass: string }[] = [
  { status: 'open', label: 'Aberto', accentClass: 'border-t-status-open' },
  { status: 'pending', label: 'Pendente', accentClass: 'border-t-status-pending' },
  { status: 'resolved', label: 'Resolvido', accentClass: 'border-t-status-resolved' },
];

interface Props {
  tickets: Ticket[];
  onStatusChange: (ticketId: string, newStatus: TicketStatus) => void;
}

function buildEntity(t: Ticket): TicketEntity {
  return TicketEntity.create({
    id: t.id, number: t.number, subject: t.subject, description: '',
    status: t.status, priority: t.priority, channel: (t.channel as any) ?? 'email',
    customerId: t.customer_id, assignedAgentId: t.assigned_agent_id ?? null,
    tagIds: [], slaStatus: t.sla_status,
    createdAt: new Date(t.created_at), updatedAt: new Date(t.updated_at),
  });
}

export function TicketKanban({ tickets, onStatusChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, TicketStatus>>({});
  const { toast } = useToast();

  const displayTickets = tickets.map(t => optimistic[t.id] ? { ...t, status: optimistic[t.id] } : t);
  const activeTicket = activeId ? displayTickets.find(t => t.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const ticketId = active.id as string;
    const overId = over.id as string;
    const ticket = displayTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    // overId can be a column status OR another ticket id
    let newStatus: TicketStatus | null = null;
    if (KANBAN_COLUMNS.some(c => c.status === overId)) {
      newStatus = overId as TicketStatus;
    } else {
      const overTicket = displayTickets.find(t => t.id === overId);
      if (overTicket) newStatus = overTicket.status;
    }
    if (!newStatus || ticket.status === newStatus) return;

    const entity = buildEntity(ticket);
    if (!entity.canTransitionTo(newStatus)) {
      toast({
        title: 'Transição não permitida',
        description: `Não é possível mover de "${ticket.status}" para "${newStatus}".`,
        variant: 'destructive',
      });
      return;
    }

    setOptimistic(prev => ({ ...prev, [ticketId]: newStatus! }));
    onStatusChange(ticketId, newStatus);
    // Clear optimistic state shortly after parent refetch
    setTimeout(() => setOptimistic(prev => {
      const next = { ...prev };
      delete next[ticketId];
      return next;
    }), 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayTickets, onStatusChange, toast]);

  return (
    <>
      <div className="md:hidden rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        O modo Kanban funciona melhor em telas maiores. Use a visualização em lista no celular.
      </div>
      <div className="hidden md:block">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 320px)' }}>
            {KANBAN_COLUMNS.map(col => (
              <KanbanColumn
                key={col.status}
                id={col.status}
                label={col.label}
                accentClass={col.accentClass}
                tickets={displayTickets.filter(t => t.status === col.status)}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeTicket ? <KanbanCard ticket={activeTicket} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  );
}
