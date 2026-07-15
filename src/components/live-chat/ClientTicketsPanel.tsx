import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Send, Sparkles, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import type { TicketStatus } from '@/types';

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-tickets-chat`;

export interface ClientTicketItem {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  created_at: string;
  resolved_at: string | null;
  ai_summary: string | null;
  is_similar: boolean;
}

interface Msg { role: 'user' | 'assistant'; content: string; }

interface Props {
  token: string;
  email: string;
  tickets: ClientTicketItem[];
  loading: boolean;
  customerName: string;
  hasSimilar: boolean;
  onShareToAgent: (text: string) => void;
}

const SUGGESTIONS = [
  'Já pedi algo parecido antes?',
  'O que já foi resolvido para mim?',
  'Resuma meu último atendimento',
];

function renderRefs(text: string) {
  return text.split(/(#\d+)/g).map((p, i) => {
    if (/^#\d+$/.test(p)) return <span key={i} className="font-mono text-primary font-semibold">{p}</span>;
    return <span key={i}>{p}</span>;
  });
}

export function ClientTicketsPanel({ token, email, tickets, loading, customerName, hasSimilar, onShareToAgent }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = useCallback(async (question: string) => {
    if (!question.trim() || streaming) return;
    const history = messages.slice();
    setMessages(prev => [...prev, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
    setStreaming(true);
    try {
      const resp = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, question, history }),
      });
      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(j.error || 'Erro no assistente');
      }
      const ctype = resp.headers.get('content-type') || '';
      if (!ctype.includes('event-stream')) {
        const j = await resp.json();
        throw new Error(j.error || 'Erro no assistente');
      }
      let assistantText = '';
      const updateLast = () => setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m));
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') { done = true; break; }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { assistantText += delta; updateLast(); }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, token, email, toast]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setInput('');
    send(q);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Tickets list */}
      <div className="flex-shrink-0 max-h-[40%] overflow-y-auto">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Seus atendimentos ({tickets.length})
        </h3>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Este é o seu primeiro atendimento.</p>
        ) : (
          <ul className="space-y-1.5">
            {tickets.map((t) => {
              const isOpen = expanded === t.id;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    className={`w-full text-left rounded-md border p-2 transition-colors ${
                      t.is_similar
                        ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                        : 'border-border bg-card hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-muted-foreground">#{t.number}</span>
                      <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">{t.subject}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    {t.is_similar && (
                      <p className="text-[10px] text-primary mt-1 flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> Parecido com o atendimento atual
                      </p>
                    )}
                    {isOpen && t.ai_summary && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{t.ai_summary}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(t.created_at).toLocaleDateString('pt-BR')}
                      {t.resolved_at && ` · resolvido ${new Date(t.resolved_at).toLocaleDateString('pt-BR')}`}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="h-px bg-border flex-shrink-0" />

      {/* Chat */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-2.5">
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
              {hasSimilar
                ? <>Detectei que você já falou com a gente sobre um assunto parecido. Posso te contar o que já foi feito.</>
                : <>Pergunte sobre seus atendimentos anteriores, <strong>{customerName}</strong>. Uso só as informações dos seus tickets.</>
              }
            </div>
            <div className="space-y-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left text-xs px-3 py-2 rounded-md bg-secondary/60 hover:bg-secondary text-foreground/90 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={m.role === 'user'
              ? 'max-w-[85%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm whitespace-pre-wrap'
              : 'max-w-[95%] rounded-lg border border-border bg-card px-3 py-2 text-sm space-y-2'
            }>
              {m.role === 'assistant' ? (
                m.content ? (
                  <>
                    <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p>{typeof children === 'string' ? renderRefs(children) : children}</p>,
                          li: ({ children }) => <li>{typeof children === 'string' ? renderRefs(children) : children}</li>,
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                    {!streaming && i === messages.length - 1 && (
                      <button
                        onClick={() => onShareToAgent(m.content)}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Share2 className="h-2.5 w-2.5" /> Mostrar isso para o atendente
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground italic flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Pensando…
                  </span>
                )
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="pt-2 border-t border-border flex-shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Pergunte sobre seus atendimentos…"
            rows={2}
            disabled={streaming}
            className="resize-none text-sm"
          />
          <Button onClick={handleSubmit} disabled={streaming || !input.trim()} size="icon" className="h-[52px] w-10">
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Este assistente só vê os seus atendimentos.
        </p>
      </div>
    </div>
  );
}
