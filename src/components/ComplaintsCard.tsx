import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import type { Customer } from '@/lib/data/customers.repo';
import { listCustomers } from '@/lib/data/customers.repo';
import { listFeedback, updateFeedback, type Feedback } from '@/lib/data/feedback.repo';
import { COMPLAINT_CATEGORY, STATUS_LABEL, STATUS_TONE } from '@/utils/feedback-labels';
import { buildFeedbackWhatsAppLink } from '@/utils/whatsapp';
import { Loader2, MessageCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

// Reclamação (categoria de customer_feedback) é caso de atendimento, não
// feedback de produto — por isso vive em Tickets, não em /feedback, e só o
// admin lida com ela (mesmo corte de acesso do canal 'urgent' de feedback).
// Self-contained: busca os próprios dados em vez de receber via props, mesmo
// padrão de NotificationBell em AppLayout.tsx.
export function ComplaintsCard() {
  const { session } = useAuth();
  const { toast } = useToast();
  const isAdmin = session?.role === 'admin';

  const [complaints, setComplaints] = useState<Feedback[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [feedbackResult, customersResult] = await Promise.allSettled([
      listFeedback(),
      listCustomers(),
    ]);

    if (feedbackResult.status === 'fulfilled') {
      const sorted = feedbackResult.value
        .filter((f) => f.category === COMPLAINT_CATEGORY)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      setComplaints(sorted);
    } else {
      toast({
        title: 'Erro ao carregar reclamações',
        description: feedbackResult.reason.message,
        variant: 'destructive',
      });
    }

    if (customersResult.status === 'fulfilled') {
      setCustomers(customersResult.value);
    } else {
      toast({
        title: 'Erro ao carregar clientes',
        description: customersResult.reason.message,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const customersByOwner = useMemo(
    () => new Map(customers.map((c) => [c.owner_id, c])),
    [customers]
  );

  const handleUpdateStatus = async (feedback: Feedback, status: Feedback['status']) => {
    setUpdatingId(feedback.id);
    try {
      await updateFeedback(feedback.id, { status });
      await load();
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar status', description: e.message, variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Reclamações</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Feedback de clientes marcado como reclamação, separado dos demais.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : complaints.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma reclamação registrada.</p>
      ) : (
        <div className="space-y-2">
          {complaints.map((c) => {
            const customer = customersByOwner.get(c.owner_id) ?? null;
            const whatsappLink = buildFeedbackWhatsAppLink(customer, c);
            const isUpdating = updatingId === c.id;
            return (
              <div key={c.id} className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {customer?.name ?? 'Cliente não identificado'} · {formatDate(c.created_at)}
                  </p>
                  <Badge variant="outline" className={STATUS_TONE[c.status]}>
                    {STATUS_LABEL[c.status]}
                  </Badge>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {c.message}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {c.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(c, 'read')}
                    >
                      {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Marcar
                      como lido
                    </Button>
                  )}
                  {c.status !== 'resolved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(c, 'resolved')}
                    >
                      {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Marcar
                      como resolvido
                    </Button>
                  )}
                  {whatsappLink && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-sla-ok border-sla-ok/40 hover:bg-sla-ok/10"
                      asChild
                    >
                      <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
