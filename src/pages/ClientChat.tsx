import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send, MessageCircle, CheckCircle2, Paperclip, Loader2, Sparkles, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { EmojiBar } from '@/components/live-chat/EmojiBar';
import { AttachmentBubble } from '@/components/live-chat/AttachmentBubble';
import { useLiveChatUpload } from '@/components/live-chat/useLiveChatUpload';
import { MessageActions } from '@/components/live-chat/MessageActions';
import { ClientTicketsPanel, type ClientTicketItem } from '@/components/live-chat/ClientTicketsPanel';

interface Msg {
  id: string;
  ticket_id: string;
  sender_type: 'agent' | 'client' | 'system';
  sender_name: string | null;
  message: string | null;
  created_at: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  attachment_type?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function ClientChat() {
  const { token } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<{ id: string; number: number; subject: string; chat_status: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [clientName, setClientName] = useState<string>(() => localStorage.getItem('live_chat_name') || '');
  const [nameSubmitted, setNameSubmitted] = useState<boolean>(!!localStorage.getItem('live_chat_name'));
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useLiveChatUpload(ticket?.id ?? '');

  // AI history assistant state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTickets, setHistoryTickets] = useState<ClientTicketItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [hasSimilar, setHasSimilar] = useState(false);
  const [customerRealName, setCustomerRealName] = useState<string | null>(null);

  useEffect(() => {
    if (!emailVerified || !token || historyLoaded) return;
    let cancelled = false;
    setHistoryLoading(true);
    (async () => {
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-similar-tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email: verifyEmail }),
        });
        const j = await resp.json();
        if (cancelled) return;
        if (resp.ok) {
          setHistoryTickets(j.tickets ?? []);
          setHasSimilar(!!j.hasSimilar);
        }
      } catch { /* ignore */ }
      finally {
        if (!cancelled) { setHistoryLoading(false); setHistoryLoaded(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [emailVerified, token, verifyEmail, historyLoaded]);

  const shareAiAnswerWithAgent = useCallback(async (text: string) => {
    if (!ticket || ticket.chat_status !== 'active') return;
    const body = `📋 Do meu histórico (via assistente):\n\n${text}`;
    const { error } = await supabase.from('live_chat_messages').insert({
      ticket_id: ticket.id,
      sender_type: 'client',
      sender_name: clientName || 'Cliente',
      message: body,
    });
    if (error) { alert('Erro ao compartilhar: ' + error.message); return; }
    setHistoryOpen(false);
  }, [ticket, clientName]);

  const handleVerify = async () => {
    const email = verifyEmail.trim();
    if (!email || !token) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const { data, error } = await supabase.functions.invoke('verify-chat-access', {
        body: { token, email },
      });
      if (error) throw error;
      if ((data as any)?.ok) {
        setEmailVerified(true);
        const nm = (data as any)?.name;
        if (nm && typeof nm === 'string') setCustomerRealName(nm);
      } else {
        setVerifyError('E-mail não confere com este atendimento.');
      }
    } catch (e: any) {
      setVerifyError('Não foi possível verificar. Tente novamente.');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('tickets')
        .select('id, number, subject, chat_status')
        .eq('chat_token', token)
        .maybeSingle();
      if (cancelled) return;
      if (!data) { setNotFound(true); return; }
      setTicket(data as any);
      const { data: msgs } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('ticket_id', (data as any).id)
        .order('created_at', { ascending: true });
      if (!cancelled && msgs) setMessages(msgs as any);
    })();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!ticket?.id) return;
    const channel = supabase
      .channel(`client-chat-${ticket.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `ticket_id=eq.${ticket.id}` },
        (payload) => setMessages(prev => [...prev, payload.new as Msg]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_chat_messages', filter: `ticket_id=eq.${ticket.id}` },
        (payload) => setMessages(prev => prev.map(m => m.id === (payload.new as any).id ? (payload.new as Msg) : m)),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${ticket.id}` },
        (payload) => setTicket(t => t ? { ...t, chat_status: (payload.new as any).chat_status } : t),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) { setInput(v => v + emoji); return; }
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const next = input.slice(0, start) + emoji + input.slice(end);
    setInput(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleFile = async (file: File) => {
    if (!ticket || ticket.chat_status !== 'active') return;
    const att = await upload(file);
    if (!att) return;
    const { error } = await supabase.from('live_chat_messages').insert({
      ticket_id: ticket.id,
      sender_type: 'client',
      sender_name: clientName || 'Cliente',
      message: null,
      attachment_path: att.path,
      attachment_name: att.name,
      attachment_size: att.size,
      attachment_type: att.type,
    });
    if (error) alert('Erro ao enviar anexo: ' + error.message);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length === 0) return;
    e.preventDefault();
    files.forEach(handleFile);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !ticket || ticket.chat_status !== 'active') return;
    setInput('');
    const { error } = await supabase.from('live_chat_messages').insert({
      ticket_id: ticket.id,
      sender_type: 'client',
      sender_name: clientName || 'Cliente',
      message: text,
    });
    if (error) {
      alert('Erro ao enviar: ' + error.message);
      setInput(text);
    }
  };

  const handleDelete = async (m: Msg) => {
    const { error } = await supabase
      .from('live_chat_messages')
      .update({ deleted_at: new Date().toISOString(), deleted_by: 'client', message: null, attachment_path: null, attachment_name: null, attachment_size: null, attachment_type: null })
      .eq('id', m.id);
    if (error) { alert('Erro ao apagar: ' + error.message); return; }
    if (m.attachment_path) {
      await supabase.storage.from('live-chat-attachments').remove([m.attachment_path]);
    }
    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, deleted_at: new Date().toISOString(), deleted_by: 'client', message: null, attachment_path: null } : x));
  };


  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-foreground">Chat não encontrado</h1>
          <p className="text-sm text-muted-foreground mt-2">O link é inválido ou expirou.</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">Carregando...</div>;
  }

  if (ticket.chat_status === 'ended' || ticket.chat_status === 'inactive') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <CheckCircle2 className="h-12 w-12 text-status-resolved mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-foreground">Atendimento encerrado</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Este atendimento foi encerrado. O histórico foi enviado para o seu e-mail.
          </p>
        </div>
      </div>
    );
  }

  if (!emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-3">
          <div className="text-center">
            <MessageCircle className="h-10 w-10 text-primary mx-auto mb-2" />
            <h1 className="text-base font-semibold text-foreground">Verificação de acesso</h1>
            <p className="text-xs text-muted-foreground">Ticket #{ticket.number} — {ticket.subject}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Digite o e-mail vinculado a este atendimento para acessar o chat.
            </p>
          </div>
          <Input
            type="email"
            value={verifyEmail}
            onChange={e => { setVerifyEmail(e.target.value); setVerifyError(null); }}
            onKeyDown={e => { if (e.key === 'Enter' && !verifying) handleVerify(); }}
            placeholder="seu@email.com"
            className="text-sm"
            autoFocus
            disabled={verifying}
          />
          {verifyError && (
            <p className="text-xs text-destructive text-center">{verifyError}</p>
          )}
          <Button
            className="w-full"
            disabled={!verifyEmail.trim() || verifying}
            onClick={handleVerify}
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Acessar chat'}
          </Button>
        </div>
      </div>
    );
  }

  if (!nameSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-3">
          <div className="text-center">
            <MessageCircle className="h-10 w-10 text-primary mx-auto mb-2" />
            <h1 className="text-base font-semibold text-foreground">Bem-vindo ao atendimento</h1>
            <p className="text-xs text-muted-foreground">Ticket #{ticket.number} — {ticket.subject}</p>
            <p className="text-xs text-muted-foreground mt-2">Como devemos te chamar?</p>
          </div>
          <Input
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="Seu nome"
            className="text-sm"
            autoFocus
          />
          <Button
            className="w-full"
            disabled={!clientName.trim()}
            onClick={() => {
              localStorage.setItem('live_chat_name', clientName.trim());
              setNameSubmitted(true);
            }}
          >
            Entrar no chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 flex-shrink-0">
        <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">
            Ticket #{ticket.number} — {ticket.subject}
          </h1>
          <p className="text-[10px] text-status-open flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-status-open animate-pulse" /> Online
          </p>
        </div>
        {historyTickets.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 flex-shrink-0"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Meus atendimentos</span>
          </Button>
        )}
      </header>

      {/* AI history banner */}
      {historyTickets.length > 0 && (
        <button
          onClick={() => setHistoryOpen(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 border-b text-left transition-colors',
            hasSimilar
              ? 'bg-primary/10 border-primary/30 hover:bg-primary/15'
              : 'bg-secondary/40 border-border hover:bg-secondary/60'
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <span className="text-xs text-foreground flex-1">
            {hasSimilar
              ? <>Parece que você já falou com a gente sobre isso. <span className="text-primary font-medium">Ver o que já foi feito →</span></>
              : <>Você já abriu {historyTickets.length} atendimento{historyTickets.length > 1 ? 's' : ''}. <span className="text-primary font-medium">Consultar com IA →</span></>
            }
          </span>
        </button>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            Envie uma mensagem para iniciar a conversa.
          </p>
        )}
        {messages.map(m => {
          if (m.sender_type === 'system') {
            return (
              <div key={m.id} className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground italic">{m.message} · {fmtTime(m.created_at)}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            );
          }
          const mine = m.sender_type === 'client';
          const isDeleted = !!m.deleted_at;
          return (
            <div key={m.id} className={cn('flex group', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'relative max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm space-y-2',
                isDeleted
                  ? 'bg-muted/50 text-muted-foreground italic border border-dashed border-border'
                  : mine
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border border-border text-foreground rounded-bl-sm'
              )}>
                {mine && !isDeleted && ticket.chat_status === 'active' && (
                  <MessageActions onDelete={() => handleDelete(m)} align="right" />
                )}
                {isDeleted ? (
                  <p>Mensagem apagada</p>
                ) : (
                  <>
                    {!mine && m.sender_name && (
                      <p className="text-[10px] font-semibold text-primary mb-0.5">{m.sender_name}</p>
                    )}
                    {m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                    {m.attachment_path && (
                      <AttachmentBubble
                        path={m.attachment_path}
                        name={m.attachment_name || 'arquivo'}
                        size={m.attachment_size || 0}
                        type={m.attachment_type || ''}
                      />
                    )}
                  </>
                )}
                <p className={cn('text-[9px] text-right', isDeleted ? 'text-muted-foreground' : mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {fmtTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card px-3 py-2 flex-shrink-0">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <div className="flex gap-2 items-center">
          <Button
            size="icon"
            variant="ghost"
            className="flex-shrink-0"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Anexar arquivo (até 10MB)"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
          <EmojiBar onPick={insertEmoji} />
          <Textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onPaste={handlePaste}
            placeholder="Digite uma mensagem ou cole um print..."
            rows={1}
            className="flex-1 resize-none min-h-0 py-2 leading-snug text-sm max-h-40"
          />

          <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="flex-shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
            <SheetTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Meus atendimentos
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 px-4 py-3">
            <ClientTicketsPanel
              token={token || ''}
              email={verifyEmail}
              tickets={historyTickets}
              loading={historyLoading}
              customerName={(customerRealName || clientName || 'você').split(' ')[0]}
              hasSimilar={hasSimilar}
              onShareToAgent={shareAiAnswerWithAgent}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
