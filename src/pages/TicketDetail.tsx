import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Paperclip, Sparkles, Pencil, History } from 'lucide-react';
import { CustomerHistoryDrawer } from '@/components/ticket/CustomerHistoryDrawer';
import { EditTicketTitleDialog } from '@/components/EditTicketTitleDialog';
import { useTicketDetail } from '@/presentation/hooks/ticketing/useTicketDetail';
import { LiveChatPanel } from '@/components/LiveChatPanel';
import { useAuth } from '@/presentation/hooks/identity/useAuth';
import { useKBSuggestions } from '@/presentation/hooks/knowledge-base/useKBSuggestions';
import { useRealtime } from '@/presentation/context/RealtimeContext';
import { UpdateTicketStatusUseCase } from '@/application/ticketing/UpdateTicketStatusUseCase';
import { AssignTicketUseCase } from '@/application/ticketing/AssignTicketUseCase';
import { getProfileRepository } from '@/infrastructure/registries/identity';
import { getTicketRepository } from '@/infrastructure/registries/ticketing';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { SLABadge } from '@/components/SLABadge';
import { CustomerCard } from '@/components/CustomerCard';
import { AuditTimeline } from '@/components/AuditTimeline';
import { MessageComposer } from '@/components/MessageComposer';
import { TicketParticipantsCard } from '@/components/TicketParticipantsCard';
import { AgentAvatar } from '@/components/AgentAvatar';
import { AISuggestionCard } from '@/components/AISuggestionCard';
import { useAISuggestions, type AISuggestion } from '@/presentation/hooks/ticketing/useAISuggestions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { TicketMessage, TicketStatus, TicketPriority } from '@/types';
import type { ProfileProps } from '@/domain/identity/entities/Profile';

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

function MessageBubble({ msg }: { msg: TicketMessage }) {
  const isInternal = msg.message_type === 'internal_note';
  const isSystem = msg.message_type === 'system';
  const isAI = msg.sender_name === 'Assistente IA';

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">{msg.body}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-lg border p-4',
      isInternal ? 'border-status-pending/30 bg-status-pending/10'
        : isAI ? 'border-primary/30 bg-primary/5'
        : 'border-border bg-card'
    )}>
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className={cn('text-xs', isAI ? 'bg-primary/30 text-primary' : msg.sender_type === 'agent' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground')}>
            {isAI ? '✨' : msg.sender_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{msg.sender_name}</span>
            {isAI && <Badge variant="outline" className="text-[10px] border-primary/40 text-primary px-1.5 py-0">Resposta automática</Badge>}
            {isInternal && <Badge variant="outline" className="text-[10px] border-status-pending/40 text-status-pending px-1.5 py-0">Nota Interna</Badge>}
            <span className="text-xs text-muted-foreground">{timeAgo(msg.created_at)}</span>
          </div>
          {/<[a-z][\s\S]*>/i.test(msg.body) ? (
            <div
              className="text-sm text-muted-foreground mt-2 prose prose-sm dark:prose-invert max-w-none [&_span[data-type=mention]]:inline-flex [&_span[data-type=mention]]:items-center [&_span[data-type=mention]]:px-1.5 [&_span[data-type=mention]]:py-0.5 [&_span[data-type=mention]]:mx-0.5 [&_span[data-type=mention]]:rounded [&_span[data-type=mention]]:bg-primary/15 [&_span[data-type=mention]]:text-primary [&_span[data-type=mention]]:text-xs [&_span[data-type=mention]]:font-medium"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body, { ADD_ATTR: ['data-type', 'data-id', 'data-label', 'target', 'rel'] }) }}
            />
          ) : (
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{msg.body}</p>
          )}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {msg.attachments.map((att, i) => {
                const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(att.name);
                return (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-md transition-colors"
                  >
                    {isImage ? (
                      <img src={att.url} alt={att.name} className="h-16 w-16 object-cover rounded" />
                    ) : (
                      <>
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        <span className="text-foreground">{att.name}</span>
                        <span className="text-muted-foreground">({att.size})</span>
                      </>
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Aberto' },
  { value: 'pending', label: 'Pendente' },
  { value: 'resolved', label: 'Resolvido' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useTicketDetail(id);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { subscribeToTicket, onlineAgents } = useRealtime();
  const queryClient = useQueryClient();
  const [agents, setAgents] = useState<ProfileProps[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef<number>(0);
  const [titleDialogOpen, setTitleDialogOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  const suggestions = useKBSuggestions(data?.ticket.subject ?? '');
  const { suggestions: aiSuggestions, resolve: resolveAISuggestion } = useAISuggestions(id);

  useEffect(() => {
    getProfileRepository().listAgents(true).then(list => setAgents(list.map(a => a.toPlainObject())));
  }, []);

  const [zendeskInfo, setZendeskInfo] = useState<{ ticketId: string; subdomain: string | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const [{ data: t }, { data: s }] = await Promise.all([
        supabase.from('tickets').select('zendesk_ticket_id').eq('id', id).maybeSingle(),
        supabase.from('settings').select('zendesk_subdomain').limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      const zid = (t as any)?.zendesk_ticket_id as string | null;
      if (zid) setZendeskInfo({ ticketId: zid, subdomain: (s as any)?.zendesk_subdomain ?? null });
      else setZendeskInfo(null);
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Realtime messages subscription
  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToTicket(id, () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    });
    return unsub;
  }, [id, subscribeToTicket, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!data) return;
    const count = data.messages.length;
    if (count > prevMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCount.current = count;
  }, [data?.messages.length]);

  const isAgentOnline = (agentId: string) => {
    return Object.values(onlineAgents).some(entries =>
      entries.some(e => e.agentId === agentId)
    );
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!id) return;
    try {
      const uc = new UpdateTicketStatusUseCase();
      const result = await uc.execute(id, newStatus, currentUser?.full_name ?? 'Sistema');
      refetch();
      if (result.zendeskSync === 'failed') {
        toast({
          title: 'Status atualizado (Zendesk falhou)',
          description: result.zendeskError ?? 'Não foi possível sincronizar com o Zendesk.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Status atualizado' });
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!id) return;
    try {
      await getTicketRepository().update(id, { priority: newPriority });
      refetch();
      toast({ title: 'Prioridade atualizada' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleAssign = async (agentId: string) => {
    if (!id) return;
    try {
      const uc = new AssignTicketUseCase();
      await uc.execute(id, agentId, currentUser?.full_name ?? 'Sistema');
      refetch();
      toast({ title: 'Agente atribuído' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleApplyAISuggestion = async (s: AISuggestion) => {
    if (!id) return;
    try {
      const updates: { priority?: TicketPriority; status?: TicketStatus } = {};
      if (s.suggested_priority) updates.priority = s.suggested_priority;
      if (s.suggested_status) updates.status = s.suggested_status;
      if (Object.keys(updates).length > 0) {
        await getTicketRepository().update(id, updates);
      }
      await resolveAISuggestion(s.id, 'applied');
      refetch();
      toast({ title: 'Sugestão aplicada' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  }

  if (!data) {
    return <p className="text-muted-foreground">Ticket não encontrado.</p>;
  }

  const { ticket, messages, auditLog, customer } = data;

  return (
    <div className="space-y-4 lg:space-y-0 lg:h-[calc(100vh-5rem)] lg:flex lg:flex-col lg:overflow-hidden">
      <div className="flex items-center gap-3 lg:flex-shrink-0">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tickets"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">#{ticket.number}</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">
                {ticket.internal_title || ticket.subject}
              </h1>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
                onClick={() => setTitleDialogOpen(true)}
                title="Editar título interno"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {ticket.internal_title && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Assunto original: {ticket.subject}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <SLABadge status={ticket.sla_status} />
            {ticket.tags.map(tag => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
            {zendeskInfo && (
              zendeskInfo.subdomain ? (
                <a
                  href={`https://${zendeskInfo.subdomain}.zendesk.com/agent/tickets/${zendeskInfo.ticketId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                  title="Abrir no Zendesk"
                >
                  Zendesk #{zendeskInfo.ticketId}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-xs text-muted-foreground font-mono">Zendesk #{zendeskInfo.ticketId}</span>
              )
            )}
          </div>
        </div>
        {customer && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryDrawerOpen(true)}
            className="flex-shrink-0 gap-1.5"
            title="Consultar histórico deste cliente com IA"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Histórico do cliente</span>
            <Sparkles className="h-3 w-3 text-primary" />
          </Button>
        )}
      </div>

      {customer && (
        <CustomerHistoryDrawer
          open={historyDrawerOpen}
          onOpenChange={setHistoryDrawerOpen}
          ticketId={ticket.id}
          customerId={customer.id}
          customerName={customer.name}
        />
      )}

      <div className="flex gap-4 items-start lg:flex-1 lg:min-h-0 lg:mt-4">
        <div className="flex-[7] space-y-3 min-w-0 lg:h-full lg:flex lg:flex-col lg:space-y-0">
          <ScrollArea className="lg:flex-1 lg:min-h-0 lg:pr-3">
            <div className="space-y-3 lg:pb-3">
              {ticket.description && ticket.description.trim() && ticket.description.trim() !== ticket.subject.trim() && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Descrição</h2>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{ticket.description}</p>
                </div>
              )}
              {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <div className="lg:flex-shrink-0 lg:pt-3 lg:border-t lg:border-border">
            <MessageComposer ticketId={ticket.id} ticketChannel={ticket.channel} customerEmail={customer?.email} zendeskTicketId={zendeskInfo?.ticketId ?? null} onSent={refetch} />
          </div>
        </div>

        <div className="flex-[3] min-w-[280px] hidden lg:block lg:h-full">
          <ScrollArea className="h-full pr-3">
            <div className="space-y-4 pb-3">
              {aiSuggestions.map((s) => (
                <AISuggestionCard
                  key={s.id}
                  suggestion={s}
                  onApply={handleApplyAISuggestion}
                  onDismiss={(sid) => resolveAISuggestion(sid, 'dismissed')}
                />
              ))}
              {/* Actions */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Ações</h2>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={ticket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Prioridade</label>
                  <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Agente</label>
                  <Select value={ticket.assigned_agent_id ?? ''} onValueChange={handleAssign}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      {agents.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex items-center gap-2">
                            <AgentAvatar agentId={a.id} name={a.fullName} isOnline={isAgentOnline(a.id)} className="h-5 w-5" />
                            <span>{a.fullName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {customer && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <h2 className="text-sm font-semibold text-foreground mb-3">{customer.name}</h2>
                  <CustomerCard customer={customer} recentTickets={[]} />
                </div>
              )}

              <TicketParticipantsCard ticketId={ticket.id} />

              <LiveChatPanel ticketId={ticket.id} zendeskTicketId={zendeskInfo?.ticketId ?? null} onEnded={refetch} />

              {/* KB Assistant + Suggestions */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Base de Conhecimento
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={() => {
                    navigate(`/kb/assistant?ticketId=${ticket.id}`);
                  }}
                >
                  <Sparkles className="h-3 w-3" /> Perguntar à IA sobre este ticket
                </Button>
                {suggestions.data.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Artigos sugeridos</p>
                    {suggestions.data.slice(0, 3).map(article => (
                      <Link key={article.id} to={`/kb/${article.id}/edit`} className="block text-xs text-primary hover:underline truncate">
                        {article.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h2 className="text-sm font-semibold text-foreground mb-3">Timeline</h2>
                <div className="max-h-[40vh] overflow-y-auto pr-1">
                  <AuditTimeline entries={auditLog} />
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      <EditTicketTitleDialog
        ticketId={ticket.id}
        currentSubject={ticket.subject}
        currentInternalTitle={ticket.internal_title ?? null}
        open={titleDialogOpen}
        onOpenChange={setTitleDialogOpen}
        onSaved={refetch}
      />
    </div>
  );
}
