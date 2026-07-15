import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { History } from 'lucide-react';
import { SimilarTicketsCard } from './SimilarTicketsCard';
import { CustomerHistoryChat } from './CustomerHistoryChat';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  customerId: string;
  customerName: string;
}

export function CustomerHistoryDrawer({ open, onOpenChange, ticketId, customerId, customerName }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            Histórico do cliente com IA
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Consulte tickets anteriores de <strong className="text-foreground">{customerName}</strong>
          </p>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* Similar tickets on top, chat below sharing the drawer space */}
          <div className="p-4 pb-2 flex-shrink-0">
            {open && <SimilarTicketsCard ticketId={ticketId} customerId={customerId} />}
          </div>
          <div className="flex-1 min-h-0 px-4 pb-4">
            {open && (
              <CustomerHistoryChat ticketId={ticketId} customerId={customerId} customerName={customerName} />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
