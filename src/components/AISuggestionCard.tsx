import { Sparkles, Check, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AISuggestion } from '@/presentation/hooks/ticketing/useAISuggestions';
import type { TicketPriority, TicketStatus } from '@/types';

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente',
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Aberto', pending: 'Pendente', resolved: 'Resolvido',
};

interface Props {
  suggestion: AISuggestion;
  onApply: (s: AISuggestion) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

export function AISuggestionCard({ suggestion, onApply, onDismiss }: Props) {
  const [busy, setBusy] = useState<'apply' | 'dismiss' | null>(null);

  const handleApply = async () => {
    setBusy('apply');
    try { await onApply(suggestion); } finally { setBusy(null); }
  };
  const handleDismiss = async () => {
    setBusy('dismiss');
    try { await onDismiss(suggestion.id); } finally { setBusy(null); }
  };

  return (
    <div className="rounded-lg border border-status-pending/40 bg-status-pending/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-status-pending" />
        <h2 className="text-sm font-semibold text-foreground">Sugestão da IA</h2>
        <Badge variant="outline" className="text-[10px] border-status-pending/40 text-status-pending ml-auto">
          {Math.round(suggestion.confidence * 100)}% confiança
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground italic leading-relaxed">
        "{suggestion.reasoning}"
      </p>

      <div className="space-y-1.5 text-xs">
        {suggestion.suggested_priority && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Prioridade →</span>
            <Badge className="text-[10px]">{PRIORITY_LABEL[suggestion.suggested_priority]}</Badge>
          </div>
        )}
        {suggestion.suggested_status && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status →</span>
            <Badge className="text-[10px]">{STATUS_LABEL[suggestion.suggested_status]}</Badge>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-8 text-xs gap-1.5" onClick={handleApply} disabled={busy !== null}>
          {busy === 'apply' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Aplicar
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5" onClick={handleDismiss} disabled={busy !== null}>
          {busy === 'dismiss' ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          Descartar
        </Button>
      </div>
    </div>
  );
}
