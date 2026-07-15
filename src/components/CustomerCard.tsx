import { useState } from 'react';
import type { Customer, Ticket } from '@/types';
import { Mail, Phone, Building, Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { CustomerEditDialog } from '@/components/CustomerEditDialog';
import { Button } from '@/components/ui/button';

interface CustomerCardProps {
  customer: Customer;
  recentTickets?: Ticket[];
  onUpdated?: () => void;
}

export function CustomerCard({ customer, recentTickets = [], onUpdated }: CustomerCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Dados do Cliente</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CustomerEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          customer={customer}
          onSaved={onUpdated}
        />
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground truncate">{customer.email}</span>
          </div>
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{customer.phone}</span>
            </div>
          )}
          {customer.company && (
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{customer.company}</span>
            </div>
          )}
        </div>
      </div>

      {recentTickets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Últimos Tickets</h3>
          <div className="space-y-2">
            {recentTickets.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] text-muted-foreground">#{t.number}</span>
                  <span className="text-xs text-foreground truncate">{t.subject}</span>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
