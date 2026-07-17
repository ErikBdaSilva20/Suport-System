import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { markFeedbackSeen } from '@/hooks/use-open-tickets-badge';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/data/customers.repo';
import { listCustomers } from '@/lib/data/customers.repo';
import type { Feedback } from '@/lib/data/feedback.repo';
import { listFeedback, updateFeedback } from '@/lib/data/feedback.repo';
import { buildFeedbackWhatsAppLink } from '@/utils/whatsapp';
import { ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CHANNEL_LABEL, STATUS_LABEL, STATUS_TONE } from './FeedbackScreen';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function FeedbackDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [feedbacks, customers] = await Promise.all([listFeedback(), listCustomers()]);
      const found = feedbacks.find((f) => f.id === id) ?? null;
      if (found) markFeedbackSeen(found.id);
      setFeedback(found);
      setCustomer(found ? (customers.find((c) => c.owner_id === found.owner_id) ?? null) : null);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar feedback', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const whatsappLink = useMemo(
    () => (feedback ? buildFeedbackWhatsAppLink(customer, feedback) : null),
    [feedback, customer]
  );

  const handleUpdateStatus = async (status: Feedback['status']) => {
    if (!feedback) return;
    setUpdatingStatus(true);
    try {
      await updateFeedback(feedback.id, { status });
      toast({ title: 'Status atualizado', variant: 'success' });
      await load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/feedback">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-muted-foreground">Feedback não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/feedback">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {feedback.category ?? 'Feedback'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{CHANNEL_LABEL[feedback.channel]}</Badge>
            <Badge variant="outline" className={STATUS_TONE[feedback.status]}>
              {STATUS_LABEL[feedback.status]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Mensagem
            </h2>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {feedback.message}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Ações</h2>
            {feedback.status === 'open' && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => handleUpdateStatus('read')}
                disabled={updatingStatus}
              >
                {updatingStatus && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Marcar como
                lido
              </Button>
            )}
            {feedback.status !== 'resolved' && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => handleUpdateStatus('resolved')}
                disabled={updatingStatus}
              >
                {updatingStatus && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Marcar como
                resolvido
              </Button>
            )}
            {whatsappLink && (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 text-sla-ok border-sla-ok/40 hover:bg-sla-ok/10"
                asChild
              >
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-3.5 w-3.5" /> Abrir conversa no WhatsApp
                </a>
              </Button>
            )}
          </div>

          {customer && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-1">
              <h2 className="text-sm font-semibold text-foreground mb-2">
                <Link to={`/customers/${customer.id}`} className="hover:text-primary">
                  {customer.name}
                </Link>
              </h2>
              <p className="text-xs text-muted-foreground">{customer.phone_e164}</p>
              {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
            </div>
          )}

          <p className="text-xs text-muted-foreground">Enviado em {formatDate(feedback.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
