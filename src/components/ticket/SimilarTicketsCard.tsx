import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { Loader2, ExternalLink } from 'lucide-react';
import type { TicketStatus } from '@/types';

interface SimilarTicket {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  created_at: string;
  resolved_at: string | null;
  ai_summary: string | null;
}

interface Props {
  ticketId: string;
  customerId: string;
}

export function SimilarTicketsCard({ ticketId, customerId }: Props) {
  const [tickets, setTickets] = useState<SimilarTicket[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/find-similar-tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ticketId, customerId }),
        });
        const j = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(j.error || 'Erro ao buscar tickets similares');
        setTickets(j.tickets ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ticketId, customerId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando tickets similares deste cliente…
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>;
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
        Este cliente não tem tickets anteriores parecidos.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tickets similares deste cliente
      </h3>
      <ul className="space-y-1.5">
        {tickets.map((t) => (
          <li key={t.id}>
            <Link
              to={`/tickets/${t.id}`}
              target="_blank"
              className="block rounded-md border border-border/70 bg-background/50 p-2 hover:bg-accent hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground">#{t.number}</span>
                <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{t.subject}</span>
                <StatusBadge status={t.status} />
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {t.ai_summary && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.ai_summary}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(t.created_at).toLocaleDateString('pt-BR')}
                {t.resolved_at && ` • resolvido em ${new Date(t.resolved_at).toLocaleDateString('pt-BR')}`}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
