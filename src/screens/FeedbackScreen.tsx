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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import type { Customer } from '@/lib/data/customers.repo';
import { listCustomers } from '@/lib/data/customers.repo';
import { createFeedback, listFeedback, type Feedback } from '@/lib/data/feedback.repo';
import type { FeedbackChannel } from '@/lib/data/types.gen';
import { Loader2, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FEEDBACK_CATEGORIES = ['Atendimento', 'Produto', 'Reclamação', 'Sugestão'];

export const CHANNEL_LABEL: Record<FeedbackChannel, string> = {
  urgent: 'Preciso de contato',
  general: 'Feedback geral',
};
export const STATUS_LABEL: Record<Feedback['status'], string> = {
  open: 'Aberto',
  read: 'Lido',
  resolved: 'Resolvido',
};
export const STATUS_TONE: Record<Feedback['status'], string> = {
  open: 'bg-status-open text-white border-transparent',
  read: 'bg-status-pending text-white border-transparent',
  resolved: 'bg-status-resolved text-white border-transparent',
};

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
function StaffFeedbackView() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
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
    };
    load();
  }, [toast]);

  const customersByOwner = useMemo(
    () => new Map(customers.map((c) => [c.owner_id, c])),
    [customers]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feedbacks</h1>
        <p className="text-sm text-muted-foreground mt-1">{feedbacks.length} feedbacks recebidos</p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Criado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedbacks.map((f) => (
              <TableRow
                key={f.id}
                className="hover:bg-accent/50 cursor-pointer"
                onClick={() => navigate(`/feedback/${f.id}`)}
              >
                <TableCell className="text-sm text-foreground">{f.category ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{CHANNEL_LABEL[f.channel]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_TONE[f.status]}>
                    {STATUS_LABEL[f.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {customersByOwner.get(f.owner_id)?.name ?? '—'}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(f.created_at)}
                </TableCell>
              </TableRow>
            ))}
            {feedbacks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum feedback recebido ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function FeedbackScreen() {
  const { session } = useAuth();
  const isRep = session?.role === 'rep';

  return isRep ? <RepFeedbackView /> : <StaffFeedbackView />;
}
