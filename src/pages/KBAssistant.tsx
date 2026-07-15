import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Send, Loader2, FileText, Menu, Ticket as TicketIcon, X } from 'lucide-react';
import { useKBAssistant } from '@/presentation/hooks/knowledge-base/useKBAssistant';
import { useKBConversations } from '@/presentation/hooks/knowledge-base/useKBConversations';
import { ConversationSidebar } from '@/components/kb/ConversationSidebar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

interface TicketContext {
  number: number;
  customerName: string;
  customerCompany: string | null;
}

const IMAGE_URL_PATTERN = /^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp|svg)(?:\?\S*)?$/i;
const MARKDOWN_LINK_TO_IMAGE_PATTERN = /^\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:png|jpe?g|gif|webp|bmp|svg)(?:\?[^)]*)?)\)$/i;

function normalizeAssistantMarkdown(content: string) {
  return content
    .replace(/\\!\[/g, '![')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      const markdownImage = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/i);
      if (markdownImage) return `![${markdownImage[1]}](${markdownImage[2]})`;

      const markdownLinkToImage = trimmed.match(MARKDOWN_LINK_TO_IMAGE_PATTERN);
      if (markdownLinkToImage) return `![${markdownLinkToImage[1] || 'imagem'}](${markdownLinkToImage[2]})`;

      if (IMAGE_URL_PATTERN.test(trimmed)) return `![imagem](${trimmed})`;

      return line;
    })
    .join('\n');
}

export default function KBAssistant() {
  const [params, setParams] = useSearchParams();
  const conversationId = params.get('c');
  const ticketIdParam = params.get('ticketId');
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ticketContext, setTicketContext] = useState<TicketContext | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(ticketIdParam);

  const { conversations, loading: loadingConvs, rename, remove } = useKBConversations();

  const { messages, isStreaming, isLoadingHistory, error, send, reset } = useKBAssistant({
    conversationId,
    ticketId: activeTicketId,
    onConversationCreated: (id) => {
      const next = new URLSearchParams(params);
      next.set('c', id);
      next.delete('ticketId');
      setParams(next, { replace: true });
    },
  });

  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const initialSent = useRef(false);

  // Load ticket context when ?ticketId= present
  useEffect(() => {
    if (!ticketIdParam || ticketContext) return;
    let cancelled = false;
    (async () => {
      const { data: ticket } = await supabase
        .from('tickets')
        .select('number, customer_id')
        .eq('id', ticketIdParam)
        .maybeSingle();
      if (!ticket || cancelled) return;
      const { data: customer } = await supabase
        .from('customers')
        .select('full_name, company')
        .eq('id', ticket.customer_id)
        .maybeSingle();
      if (cancelled) return;
      setTicketContext({
        number: ticket.number,
        customerName: customer?.full_name ?? 'Cliente',
        customerCompany: customer?.company ?? null,
      });
      reset();
      setActiveTicketId(ticketIdParam);
      setInput('Como devo proceder com este chamado?');
    })();
    return () => { cancelled = true; };
  }, [ticketIdParam, ticketContext, reset]);

  // Pre-fill from query param ?q= (legacy)
  useEffect(() => {
    const q = params.get('q');
    if (q && !initialSent.current) {
      initialSent.current = true;
      reset();
      send(q);
      const next = new URLSearchParams(params);
      next.delete('q');
      next.delete('c');
      setParams(next, { replace: true });
    }
  }, [params, send, setParams, reset]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (error) toast({ title: 'Erro no assistente', description: error, variant: 'destructive' });
  }, [error, toast]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    send(input.trim());
    setInput('');
  };

  const handleSelect = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('c', id);
    setParams(next, { replace: true });
    setMobileOpen(false);
  };

  const handleNew = () => {
    reset();
    setTicketContext(null);
    setActiveTicketId(null);
    const next = new URLSearchParams(params);
    next.delete('c');
    next.delete('ticketId');
    setParams(next, { replace: true });
    setMobileOpen(false);
  };

  const sidebar = (
    <ConversationSidebar
      conversations={conversations}
      loading={loadingConvs}
      activeId={conversationId}
      onSelect={handleSelect}
      onNew={handleNew}
      onRename={rename}
      onDelete={async (id) => {
        await remove(id);
        if (id === conversationId) handleNew();
      }}
    />
  );

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-6">
      {!isMobile && sidebar}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-72">
            {sidebar}
          </SheetContent>
        </Sheet>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            {isMobile && (
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
              </Sheet>
            )}
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">Assistente da Base de Conhecimento</h1>
              <p className="text-xs text-muted-foreground truncate">Respostas baseadas nos artigos publicados</p>
            </div>
          </div>
        </div>

        {ticketContext && (
          <div className="px-4 pt-3 max-w-4xl w-full mx-auto">
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
              <TicketIcon className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-foreground">
                Contexto carregado: <strong>ticket #{ticketContext.number}</strong> — {ticketContext.customerName}
                {ticketContext.customerCompany && <span className="text-muted-foreground"> ({ticketContext.customerCompany})</span>}
              </span>
              <button
                onClick={() => { setTicketContext(null); setActiveTicketId(null); const next = new URLSearchParams(params); next.delete('ticketId'); setParams(next, { replace: true }); }}
                className="ml-auto text-muted-foreground hover:text-foreground"
                title="Remover contexto"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-4xl w-full mx-auto">
          {isLoadingHistory && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoadingHistory && messages.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <Sparkles className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Faça uma pergunta sobre os processos da empresa</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                {['Como processar um reembolso?', 'Qual o SLA para tickets urgentes?', 'Como escalar um chamado?'].map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={
                m.role === 'user'
                  ? 'max-w-[80%] rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm'
                  : 'max-w-[90%] rounded-lg bg-card border border-border px-4 py-3 text-sm space-y-2'
              }>
                {m.role === 'assistant' ? (
                  <>
                    <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-img:my-2 prose-img:rounded-md prose-img:border prose-img:border-border">
                      {m.content
                        ? <ReactMarkdown
                            components={{
                              img: ({ node, ...props }) => (
                                <a href={props.src as string} target="_blank" rel="noreferrer">
                                  <img {...props} className="max-h-80 rounded-md border border-border cursor-zoom-in" loading="lazy" />
                                </a>
                              ),
                            }}
                          >{normalizeAssistantMarkdown(m.content)}</ReactMarkdown>
                        : <span className="text-muted-foreground italic flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Pensando...</span>}
                    </div>
                    {m.sources && m.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                        {m.sources.map(s => (
                          <Link key={s.id} to={`/kb/${s.id}/edit`}>
                            <Badge variant="outline" className="text-[10px] gap-1 hover:bg-accent cursor-pointer">
                              <FileText className="h-3 w-3" /> {s.title}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-4 max-w-4xl w-full mx-auto">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Pergunte algo sobre os processos..."
              rows={2}
              disabled={isStreaming}
              className="resize-none bg-secondary border-border"
            />
            <Button onClick={handleSend} disabled={isStreaming || !input.trim()} size="icon" className="h-[60px] w-12">
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Enter para enviar · Shift+Enter para nova linha</p>
        </div>
      </div>
    </div>
  );
}
