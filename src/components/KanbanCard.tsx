import { Link } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PriorityBadge } from '@/components/PriorityBadge';
import { SLABadge } from '@/components/SLABadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/types';

interface Props {
  ticket: Ticket;
  isOverlay?: boolean;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function KanbanCard({ ticket, isOverlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
    disabled: isOverlay,
  });

  const style = isOverlay ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const assignedName = ticket.assigned_agent?.full_name;
  const customerName = ticket.customer?.name;
  const customerCompany = (ticket.customer as any)?.company;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link
        to={`/tickets/${ticket.id}`}
        className={cn(
          'block rounded-md border bg-card p-3 space-y-2 transition-all',
          isOverlay
            ? 'border-primary shadow-lg shadow-primary/20 cursor-grabbing rotate-2'
            : 'border-border hover:border-primary/40 hover:shadow-sm cursor-grab active:cursor-grabbing'
        )}
        onClick={e => { if (isDragging) e.preventDefault(); }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[10px] text-muted-foreground">#{ticket.number}</span>
            <PriorityBadge priority={ticket.priority} />
          </div>
          <SLABadge status={ticket.sla_status} />
        </div>

        <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{ticket.internal_title || ticket.subject}</p>
        {ticket.internal_title && (
          <p className="text-[10px] text-muted-foreground/70 truncate italic">{ticket.subject}</p>
        )}

        {(customerName || customerCompany) && (
          <p className="text-[11px] text-muted-foreground truncate">
            {customerName}{customerCompany ? ` · ${customerCompany}` : ''}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex gap-1 flex-wrap min-w-0">
            {ticket.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{tag}</Badge>
            ))}
            {ticket.tags.length > 3 && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">+{ticket.tags.length - 3}</Badge>
            )}
          </div>
          {assignedName ? (
            <Avatar className="h-5 w-5 flex-shrink-0" title={assignedName}>
              {ticket.assigned_agent?.avatar_url && <AvatarImage src={ticket.assigned_agent.avatar_url} alt={assignedName} />}
              <AvatarFallback className="bg-primary/20 text-primary text-[8px]">
                {initials(assignedName)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">Sem agente</span>
          )}
        </div>
      </Link>
    </div>
  );
}
