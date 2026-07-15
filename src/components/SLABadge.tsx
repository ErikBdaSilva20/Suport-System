import React from 'react';
import type { SLAStatus } from '@/types';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

const slaConfig: Record<SLAStatus, { label: string; className: string }> = {
  ok: { label: 'No prazo', className: 'bg-sla-ok/20 text-sla-ok border-sla-ok/30' },
  warning: { label: 'Em risco', className: 'bg-sla-warning/20 text-sla-warning border-sla-warning/30' },
  breached: { label: 'Violado', className: 'bg-sla-breached/20 text-sla-breached border-sla-breached/30' },
};

export const SLABadge = React.forwardRef<HTMLSpanElement, { status: SLAStatus }>(
  ({ status, ...props }, ref) => {
    const config = slaConfig[status];
    return (
      <span ref={ref} {...props} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', config.className)}>
        <Clock className="h-3 w-3" />
        {config.label}
      </span>
    );
  }
);

SLABadge.displayName = 'SLABadge';
