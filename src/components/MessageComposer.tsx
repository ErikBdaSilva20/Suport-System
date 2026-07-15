import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useSendMessage } from '@/presentation/hooks/ticketing/useSendMessage';
import { useAuth } from '@/presentation/hooks/identity/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Props {
  ticketId: string;
  onSent?: () => void;
}

export function MessageComposer({ ticketId, onSent }: Props) {
  const [body, setBody] = useState('');
  const { sendMessage, isLoading } = useSendMessage();
  const { currentUser, profile } = useAuth();
  const { toast } = useToast();

  const handleSend = async () => {
    const text = body.trim();
    if (!text) return;
    try {
      await sendMessage({
        ticketId,
        senderType: 'agent',
        senderId: profile?.id ?? null,
        senderName: currentUser?.full_name ?? 'Agente',
        senderAvatar: currentUser?.avatar_url ?? null,
        messageType: 'internal_note',
        body: text,
      });
      setBody('');
      onSent?.();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar nota', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-lg border border-status-pending/40 bg-status-pending/5 p-3 flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nota interna</h2>
      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Descreva o que foi tratado com o cliente..."
        className="min-h-[80px] text-sm"
      />
      <div className="flex justify-end">
        <Button size="sm" className="gap-1" onClick={handleSend} disabled={isLoading || !body.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Salvar nota
        </Button>
      </div>
    </div>
  );
}
