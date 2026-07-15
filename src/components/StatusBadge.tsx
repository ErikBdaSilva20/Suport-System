import type { TicketStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: 'Aberto', className: 'bg-status-open/20 text-status-open border-status-open/30' },
  pending: { label: 'Pendente', className: 'bg-status-pending/20 text-status-pending border-status-pending/30' },
  resolved: { label: 'Resolvido', className: 'bg-status-resolved/20 text-status-resolved border-status-resolved/30' },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
