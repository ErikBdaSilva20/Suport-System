import { useEffect, useState } from 'react';
import { Users, X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getTicketParticipantRepository } from '@/infrastructure/registries/ticketing';
import { getProfileRepository } from '@/infrastructure/registries/identity';
import { useAuth } from '@/presentation/hooks/identity/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import type { ProfileProps } from '@/domain/identity/entities/Profile';

interface Props {
  ticketId: string;
}

export function TicketParticipantsCard({ ticketId }: Props) {
  const [participants, setParticipants] = useState<ProfileProps[]>([]);
  const [allAgents, setAllAgents] = useState<ProfileProps[]>([]);
  const { profile } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const [parts, agents] = await Promise.all([
      getTicketParticipantRepository().listByTicket(ticketId),
      getProfileRepository().listAgents(true),
    ]);
    const agentsPlain = agents.map(a => a.toPlainObject());
    setAllAgents(agentsPlain);
    const ids = new Set(parts.map(p => p.userId));
    setParticipants(agentsPlain.filter(a => ids.has(a.id)));
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`participants-${ticketId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_participants', filter: `ticket_id=eq.${ticketId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const handleAdd = async (userId: string) => {
    try {
      await getTicketParticipantRepository().add(ticketId, userId, profile?.id ?? null);
      toast({ title: 'Participante adicionado' });
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await getTicketParticipantRepository().remove(ticketId, userId);
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const available = allAgents.filter(a => !participants.some(p => p.id === a.id));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" /> Participantes
          {participants.length > 0 && <span className="text-xs text-muted-foreground">({participants.length})</span>}
        </h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Adicionar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" align="end">
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-1.5">Todos já participam</p>
            ) : available.map(a => (
              <button
                key={a.id}
                onClick={() => handleAdd(a.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded-sm hover:bg-accent transition-colors"
              >
                <Avatar className="h-6 w-6">
                  {a.avatarUrl && <AvatarImage src={a.avatarUrl} alt={a.fullName} />}
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                    {a.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs truncate">{a.fullName}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {participants.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Mencione um agente em uma nota interna com @nome para adicioná-lo aqui.</p>
      ) : (
        <div className="space-y-2">
          {participants.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-2 group">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-6 w-6">
                  {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.fullName} />}
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                    {p.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-foreground truncate">{p.fullName}</span>
              </div>
              <button
                onClick={() => handleRemove(p.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                title="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
