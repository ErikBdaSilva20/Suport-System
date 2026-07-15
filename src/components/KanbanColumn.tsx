import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from '@/components/KanbanCard';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/types';

interface Props {
  id: string;
  label: string;
  accentClass: string;
  tickets: Ticket[];
}

export function KanbanColumn({ id, label, accentClass, tickets }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-[300px] flex-shrink-0 rounded-lg border bg-card/40 transition-all',
        isOver ? 'border-primary border-dashed bg-primary/5' : 'border-border'
      )}
    >
      <div className={cn('flex items-center justify-between px-3 py-2 border-b border-border rounded-t-lg border-t-2', accentClass)}>
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</h3>
        <span className="text-xs font-mono text-muted-foreground bg-secondary/60 rounded px-1.5 py-0.5">{tickets.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]">
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs text-muted-foreground italic">
              Nenhum ticket
            </div>
          ) : (
            tickets.map(ticket => <KanbanCard key={ticket.id} ticket={ticket} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
}
