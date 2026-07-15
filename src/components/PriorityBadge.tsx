import React from 'react';
import type { TicketPriority } from '@/types';
import { cn } from '@/lib/utils';

const priorityConfig: Record<TicketPriority, { label: string; className: string }> = {
  urgent: { label: 'Urgente', className: 'bg-priority-urgent/20 text-priority-urgent border-priority-urgent/30' },
  high: { label: 'Alto', className: 'bg-priority-high/20 text-priority-high border-priority-high/30' },
  medium: { label: 'Médio', className: 'bg-priority-medium/20 text-priority-medium border-priority-medium/30' },
  low: { label: 'Baixo', className: 'bg-priority-low/20 text-priority-low border-priority-low/30' },
};

export const PriorityBadge = React.forwardRef<HTMLSpanElement, { priority: TicketPriority }>(
  ({ priority, ...props }, ref) => {
    const config = priorityConfig[priority];
    return (
      <span ref={ref} {...props} className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', config.className)}>
        {config.label}
      </span>
    );
  }
);

PriorityBadge.displayName = 'PriorityBadge';
