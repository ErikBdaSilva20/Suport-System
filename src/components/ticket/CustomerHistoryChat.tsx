import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Msg { role: 'user' | 'assistant'; content: string; }

interface Props {
  ticketId: string;
  customerId: string;
  customerName: string;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-history-chat`;

// Renders `#123` as a link to the ticket by that number. Resolves ids client-side lazily.
function TicketReference({ number }: { number: number }) {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let c = false;
    supabase.from('tickets').select('id').eq('number', number).maybeSingle().then(({ data }) => {
      if (!c && data) setId(data.id);
    });
    return () => { c = true; };
  }, [number]);
  if (!id) return <span className="font-mono text-primary">#{number}</span>;
  return (
    <Link to={`/tickets/${id}`} target="_blank" className="font-mono text-primary hover:underline">
      #{number}
    </Link>
  );
}

function renderWithTicketRefs(text: string) {
  const parts = text.split(/(#\d+)/g);
  return parts.map((p, i) => {
    const m = p.match(/^#(\d+)$/);
    if (m) return <TicketReference key={i} number={parseInt(m[1], 10)} />;
    return <span key={i}>{p}</span>;
  });
}

const SUGGESTIONS = [
  'O que já foi resolvido para este cliente?',
  'Este problema já apareceu antes?',
  'Resuma o último ticket dele',
];

export function CustomerHistoryChat({ ticketId, customerId, customerName }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (question: string) => {
    if (!question.trim() || streaming) return;
    const history = messages.slice();
    setMessages((prev) => [...prev, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
    setStreaming(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error('Não autenticado');

      const resp = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, ticketId, customerId, history }),
      });

      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(j.error || 'Erro na IA');
      }

      // If server returned non-stream JSON (error path passthrough), handle it
      const ctype = resp.headers.get('content-type') || '';
      if (!ctype.includes('event-stream')) {
        const j = await resp.json();
        throw new Error(j.error || 'Erro na IA');
      }

      let assistantText = '';
      const updateLast = () => setMessages((prev) => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m));

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
      setMessages((prev) => prev.slice(0, -1)); // remove empty assistant bubble
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, ticketId, customerId, toast]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setInput('');
    send(q);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
              Pergunte sobre os tickets anteriores de <strong>{customerName}</strong>. Uso apenas o assunto, descrição e mensagens públicas.
            </div>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
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
              : 'max-w-[95%] rounded-lg border border-border bg-card px-3 py-2 text-sm'
            }>
              {m.role === 'assistant' ? (
                m.content ? (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p>{typeof children === 'string' ? renderWithTicketRefs(children) : children}</p>,
                        li: ({ children }) => <li>{typeof children === 'string' ? renderWithTicketRefs(children) : children}</li>,
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
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

      <div className="pt-3 mt-2 border-t border-border flex-shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            }}
            placeholder="Pergunte sobre este cliente…"
            rows={2}
            disabled={streaming}
            className="resize-none bg-secondary border-border text-sm"
          />
          <Button onClick={handleSubmit} disabled={streaming || !input.trim()} size="icon" className="h-[52px] w-10">
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Enter envia · Shift+Enter nova linha
        </p>
      </div>
    </div>
  );
}
