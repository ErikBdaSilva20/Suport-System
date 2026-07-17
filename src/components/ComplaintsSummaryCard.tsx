import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { listFeedback } from '@/lib/data/feedback.repo';
import { COMPLAINT_CATEGORY } from '@/utils/feedback-labels';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Mesmo padrão self-contained do ComplaintsCard/NotificationBell: busca os
// próprios dados em vez de receber via props. Reclamações só fazem sentido
// pro admin (mesmo corte de acesso do ComplaintsCard em TicketsScreen).
export function ComplaintsSummaryCard() {
  const { session } = useAuth();
  const { toast } = useToast();
  const isAdmin = session?.role === 'admin';

  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    listFeedback()
      .then((rows) => {
        if (cancelled) return;
        setPendingCount(
          rows.filter((f) => f.category === COMPLAINT_CATEGORY && f.status !== 'resolved').length
        );
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const description = e instanceof Error ? e.message : undefined;
        toast({ title: 'Erro ao carregar reclamações', description, variant: 'destructive' });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, toast]);

  if (!isAdmin) return null;

  if (isLoading) return <Skeleton className="h-28 w-full" />;

  return (
    <Link to="/tickets" className="block">
      <Card className="border-destructive/30 bg-destructive/5 hover:border-destructive/50 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Reclamações</CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{pendingCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {pendingCount === 0 ? 'Nenhuma pendente' : 'pendente(s) de atendimento'}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
