import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import type { Customer } from '@/lib/data/customers.repo';
import { listCustomers } from '@/lib/data/customers.repo';
import { createFeedback, listFeedback, updateFeedback, type Feedback } from '@/lib/data/feedback.repo';
import type { FeedbackChannel } from '@/lib/data/types.gen';
import {
  CHANNEL_LABEL,
  COMPLAINT_CATEGORY,
  FEEDBACK_CATEGORIES,
  STATUS_LABEL,
  STATUS_TONE,
} from '@/utils/feedback-labels';
import { buildFeedbackWhatsAppLink } from '@/utils/whatsapp';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

function RepFeedbackView() {
  const { toast } = useToast();
  const [category, setCategory] = useState('');
  const [channel, setChannel] = useState<FeedbackChannel | ''>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [history, setHistory] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const rows = await listFeedback();
      setHistory(rows.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (e: any) {
      toast({ title: 'Erro ao carregar feedbacks', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSubmit = async () => {
    if (!category) {
      toast({ title: 'Escolha uma categoria', variant: 'destructive' });
      return;
    }
    if (!channel) {
      toast({ title: 'Escolha um canal', variant: 'destructive' });
      return;
    }
    if (message.trim().length < 3) {
      toast({ title: 'Mensagem muito curta', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await createFeedback({ category, channel, message: message.trim() });
      setCategory('');
      setChannel('');
      setMessage('');
      toast({ title: 'Feedback enviado', variant: 'success' });
      await loadHistory();
    } catch (e: any) {
      toast({ title: 'Erro ao enviar feedback', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feedback</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conte pra gente como foi seu atendimento, ou envie uma sugestão.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {FEEDBACK_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Canal</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as FeedbackChannel)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">{CHANNEL_LABEL.urgent}</SelectItem>
              <SelectItem value="general">{CHANNEL_LABEL.general}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Mensagem</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px]"
            placeholder="Descreva sua experiência ou sugestão..."
          />
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar feedback
        </Button>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Seus feedbacks enviados</h2>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum feedback enviado ainda.</p>
        ) : (
          <div className="space-y-2">
            {history.map((f) => (
              <div
                key={f.id}
                className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {f.category ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{f.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={STATUS_TONE[f.status]}>
                    {STATUS_LABEL[f.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(f.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Diferente de tickets (customer_id → customers.id), o feedback não guarda
// customer_id — owner_id É o user.id do rep, o mesmo valor que customers.owner_id
// já usa pro próprio cadastro do rep. Resolver "cliente" é achar o customer
// cujo owner_id bate com o owner_id do feedback (list-then-find, NFR8).
//
// 'Reclamação' fica de fora desta triagem: vira caso de atendimento e é
// exibida só pro admin, em ComplaintsCard dentro de TicketsScreen — não faz
// sentido reclamação de cliente ficar misturada com sugestão/elogio aqui.
function StaffFeedbackView() {
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
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
      setFeedbacks(feedbackResult.value.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } else {
      toast({
        title: 'Erro ao carregar feedbacks',
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
    load();
  }, [load]);

  const customersByOwner = useMemo(
    () => new Map(customers.map((c) => [c.owner_id, c])),
    [customers]
  );

  const triageFeedbacks = useMemo(
    () => feedbacks.filter((f) => f.category !== COMPLAINT_CATEGORY),
    [feedbacks]
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feedbacks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {triageFeedbacks.length} feedbacks recebidos
        </p>
      </div>

      {triageFeedbacks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum feedback recebido ainda.</p>
      ) : (
        <div className="space-y-3">
          {triageFeedbacks.map((f) => {
            const customer = customersByOwner.get(f.owner_id) ?? null;
            const whatsappLink = buildFeedbackWhatsAppLink(customer, f);
            const isUpdating = updatingId === f.id;
            return (
              <div key={f.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{f.category ?? '—'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {customer?.name ?? 'Cliente não identificado'} ·{' '}
                      {formatDate(f.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline">{CHANNEL_LABEL[f.channel]}</Badge>
                    <Badge variant="outline" className={STATUS_TONE[f.status]}>
                      {STATUS_LABEL[f.status]}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {f.message}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {f.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(f, 'read')}
                    >
                      {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Marcar
                      como lido
                    </Button>
                  )}
                  {f.status !== 'resolved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(f, 'resolved')}
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

export default function FeedbackScreen() {
  const { session } = useAuth();
  const isRep = session?.role === 'rep';

  return isRep ? <RepFeedbackView /> : <StaffFeedbackView />;
}
