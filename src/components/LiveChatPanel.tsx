import { useEffect, useRef, useState } from 'react';
import { Copy, Link2, Send, PowerOff, MessageSquare, Loader2, RotateCcw, Paperclip, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/presentation/hooks/identity/useAuth';
import { useSendMessage } from '@/presentation/hooks/ticketing/useSendMessage';
import { cn } from '@/lib/utils';
import { EmojiBar } from '@/components/live-chat/EmojiBar';
import { AttachmentBubble } from '@/components/live-chat/AttachmentBubble';
import { useLiveChatUpload } from '@/components/live-chat/useLiveChatUpload';

import { MessageActions } from '@/components/live-chat/MessageActions';

interface LiveChatMessage {
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


interface Props {
  ticketId: string;
  zendeskTicketId?: string | null;
  onEnded?: () => void;
}

function fmtTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function LiveChatPanel({ ticketId, zendeskTicketId, onEnded }: Props) {
  const { currentUser, profile } = useAuth();
  const { toast } = useToast();
  const { sendMessage } = useSendMessage();
  const { upload, uploading } = useLiveChatUpload(ticketId);
  const [chatToken, setChatToken] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState<'inactive' | 'active' | 'ended'>('inactive');
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [ticketMeta, setTicketMeta] = useState<{ number: number | null; subject: string | null }>({ number: null, subject: null });
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [confirmReopenOpen, setConfirmReopenOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRefExpanded = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputRefExpanded = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('tickets')
        .select('chat_token, chat_status, number, subject, customer:customers(full_name)')
        .eq('id', ticketId)
        .maybeSingle();
      if (cancelled || !data) return;
      setChatToken((data as any).chat_token ?? null);
      setChatStatus(((data as any).chat_status ?? 'inactive') as any);
      setTicketMeta({ number: (data as any).number ?? null, subject: (data as any).subject ?? null });
      const cName = ((data as any)?.customer?.full_name as string | undefined)?.trim() || null;
      setCustomerName(cName);
      const { data: msgs } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (!cancelled && msgs) setMessages(msgs as any);
    })();
    return () => { cancelled = true; };
  }, [ticketId]);

  useEffect(() => {
    const channel = supabase
      .channel(`live-chat-${ticketId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `ticket_id=eq.${ticketId}` },
        (payload) => setMessages(prev => [...prev, payload.new as LiveChatMessage]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_chat_messages', filter: `ticket_id=eq.${ticketId}` },
        (payload) => setMessages(prev => prev.map(m => m.id === (payload.new as any).id ? (payload.new as LiveChatMessage) : m)),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    scrollRefExpanded.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, expanded]);

  useEffect(() => {
    const el = expanded ? inputRefExpanded.current : inputRef.current;
    if (!el) return;
    const max = expanded ? 160 : 112;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [input, expanded]);


  const publicUrl = chatToken ? `${window.location.origin}/c/${chatToken}` : '';

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const token = (globalThis.crypto as any)?.randomUUID?.() ?? null;
      const { data, error } = await supabase
        .from('tickets')
        .update({ chat_token: token, chat_status: 'active' })
        .eq('id', ticketId)
        .select('chat_token, chat_status')
        .single();
      if (error) throw error;
      setChatToken((data as any).chat_token);
      setChatStatus((data as any).chat_status);
      toast({ title: 'Link de chat gerado' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar link', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        throw new Error('clipboard-unavailable');
      }
      toast({ title: 'Link copiado' });
    } catch {
      const ta = document.createElement('textarea');
      ta.value = publicUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        const ok = document.execCommand('copy');
        toast({ title: ok ? 'Link copiado' : 'Copie manualmente', description: ok ? undefined : publicUrl });
      } catch {
        toast({ title: 'Copie manualmente', description: publicUrl });
      }
      document.body.removeChild(ta);
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = (expanded ? inputRefExpanded.current : inputRef.current) ?? inputRef.current;
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
    if (chatStatus !== 'active') return;
    const att = await upload(file);
    if (!att) return;
    const { error } = await supabase.from('live_chat_messages').insert({
      ticket_id: ticketId,
      sender_type: 'agent',
      sender_name: currentUser?.full_name ?? 'Agente',
      message: null,
      attachment_path: att.path,
      attachment_name: att.name,
      attachment_size: att.size,
      attachment_type: att.type,
    });
    if (error) toast({ title: 'Erro ao enviar anexo', description: error.message, variant: 'destructive' });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length === 0) return;
    e.preventDefault();
    files.forEach(handleFile);
  };

  const handleDelete = async (m: LiveChatMessage) => {
    const { error } = await supabase
      .from('live_chat_messages')
      .update({ deleted_at: new Date().toISOString(), deleted_by: 'agent', message: null, attachment_path: null, attachment_name: null, attachment_size: null, attachment_type: null })
      .eq('id', m.id);
    if (error) {
      toast({ title: 'Erro ao apagar', description: error.message, variant: 'destructive' });
      return;
    }
    if (m.attachment_path) {
      await supabase.storage.from('live-chat-attachments').remove([m.attachment_path]);
    }
    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, deleted_at: new Date().toISOString(), deleted_by: 'agent', message: null, attachment_path: null } : x));
  };


  const handleSend = async () => {
    const text = input.trim();
    if (!text || chatStatus !== 'active') return;
    setInput('');
    const { error } = await supabase.from('live_chat_messages').insert({
      ticket_id: ticketId,
      sender_type: 'agent',
      sender_name: currentUser?.full_name ?? 'Agente',
      message: text,
    });
    if (error) {
      toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
      setInput(text);
    }
  };

  const handleReopen = async () => {
    setConfirmReopenOpen(false);
    setReopening(true);
    try {
      const { error: updErr } = await supabase
        .from('tickets')
        .update({ chat_status: 'active' })
        .eq('id', ticketId);
      if (updErr) throw updErr;
      setChatStatus('active');
      const marker = `Chat reaberto por ${currentUser?.full_name ?? 'Agente'}`;
      await supabase.from('live_chat_messages').insert({
        ticket_id: ticketId,
        sender_type: 'system',
        sender_name: null,
        message: marker,
      });
      toast({ title: 'Chat reaberto' });
    } catch (e: any) {
      toast({ title: 'Erro ao reabrir', description: e.message, variant: 'destructive' });
    } finally {
      setReopening(false);
    }
  };

  const handleEnd = async () => {
    setConfirmEndOpen(false);
    setEnding(true);
    try {
      const { data: ticketRow } = await supabase
        .from('tickets')
        .select('customer:customers(full_name)')
        .eq('id', ticketId)
        .maybeSingle();
      const customerName = ((ticketRow as any)?.customer?.full_name as string | undefined)?.trim() || null;


      const { data: all, error: fetchErr } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (fetchErr) throw fetchErr;

      const items = (all ?? []) as LiveChatMessage[];


      // Generate signed URLs for all attachments (long TTL for Zendesk to fetch inline)
      const signedByPath = new Map<string, string>();
      const attachmentsForZendesk: Array<{ fileName: string; fileUrl: string; contentType: string }> = [];
      for (const m of items) {
        if (m.attachment_path && !m.deleted_at) {
          const { data: s } = await supabase.storage
            .from('live-chat-attachments')
            .createSignedUrl(m.attachment_path, 60 * 60 * 24 * 7);
          if (s?.signedUrl) {
            signedByPath.set(m.attachment_path, s.signedUrl);
            attachmentsForZendesk.push({
              fileName: m.attachment_name || 'arquivo',
              fileUrl: s.signedUrl,
              contentType: m.attachment_type || 'application/octet-stream',
            });
          }
        }
      }

      const rows = items.map(m => {
        if (m.sender_type === 'system') {
          const safe = (m.message ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
          return `<div style="margin:12px 0;padding:6px 0;border-top:1px dashed #d1d5db;text-align:center;color:#6b7280;font-size:12px;font-style:italic">— ${safe} (${fmtTime(m.created_at)}) —</div>`;
        }
        const who = m.sender_type === 'agent' ? (m.sender_name || 'Agente') : (customerName || m.sender_name || 'Cliente');
        const color = m.sender_type === 'agent' ? '#1A5276' : '#6b7280';
        if (m.deleted_at) {
          return `<div style="margin:4px 0;color:#9ca3af;font-style:italic"><span>[${fmtTime(m.created_at)}]</span> <strong style="color:${color}">${who}:</strong> mensagem apagada</div>`;
        }
        let content = '';
        if (m.message) {
          const safe = m.message.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
          content = safe;
        }
        if (m.attachment_path) {
          const url = signedByPath.get(m.attachment_path) || '';
          const nameSafe = (m.attachment_name || 'arquivo').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
          if ((m.attachment_type || '').startsWith('image/')) {
            content += (content ? '<br/>' : '') + `<img src="${url}" alt="${nameSafe}" style="max-width:320px;max-height:320px;border-radius:6px;margin-top:4px" />`;
          } else {
            content += (content ? '<br/>' : '') + `<a href="${url}" style="color:#1A5276">📎 ${nameSafe}</a>`;
          }
        }
        return `<div style="margin:4px 0"><span style="color:#9ca3af">[${fmtTime(m.created_at)}]</span> <strong style="color:${color}">${who}:</strong> ${content}</div>`;
      }).join('');
      const html = `<div><p><strong>Histórico do Live Chat</strong></p>${rows || '<p><em>Sem mensagens</em></p>'}</div>`;

      const { error: updErr } = await supabase
        .from('tickets')
        .update({ chat_status: 'ended' })
        .eq('id', ticketId);
      if (updErr) throw updErr;
      setChatStatus('ended');

      const sent = await sendMessage({
        ticketId,
        senderType: 'agent',
        senderId: profile?.id ?? null,
        senderName: currentUser?.full_name ?? 'Agente',
        senderAvatar: currentUser?.avatar_url ?? null,
        messageType: 'public_reply',
        body: html,
      });

      const sentId = (sent as any)?.id ?? (sent as any)?.toPlainObject?.()?.id ?? null;

      if (zendeskTicketId && sentId) {
        try {
          const { error: fnErr } = await supabase.functions.invoke('push-zendesk-reply', {
            body: { ticketId, messageId: sentId, attachments: attachmentsForZendesk },
          });
          if (fnErr) console.warn('zendesk push failed (non-blocking)', fnErr);
        } catch (e) {
          console.warn('zendesk push failed (non-blocking)', e);
        }
      }

      toast({ title: 'Chat finalizado e histórico enviado' });
      onEnded?.();
    } catch (e: any) {
      toast({ title: 'Erro ao finalizar', description: e.message, variant: 'destructive' });
    } finally {
      setEnding(false);
    }
  };

  const renderMessages = (size: 'compact' | 'expanded') => {
    const isExp = size === 'expanded';
    return (
      <div className={cn(
        'rounded-md border border-border bg-background/50 overflow-y-auto p-2 space-y-2',
        isExp ? 'flex-1 min-h-0 p-4 space-y-3' : 'h-64'
      )}>
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">Aguardando mensagens...</p>
        )}
        {messages.map(m => {
          if (m.sender_type === 'system') {
            return (
              <div key={m.id} className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground italic">{m.message} · {fmtTime(m.created_at)}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            );
          }
          const mine = m.sender_type === 'agent';
          const isDeleted = !!m.deleted_at;
          return (
            <div key={m.id} className={cn('flex group', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'relative rounded-lg space-y-1.5',
                isExp ? 'max-w-[75%] px-3 py-2 text-sm' : 'max-w-[80%] px-2.5 py-1.5 text-xs',
                isDeleted
                  ? 'bg-muted/50 text-muted-foreground italic border border-dashed border-border'
                  : mine ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
              )}>
                {mine && !isDeleted && chatStatus === 'active' && (
                  <MessageActions onDelete={() => handleDelete(m)} align="right" />
                )}
                {isDeleted ? (
                  <p>Mensagem apagada</p>
                ) : (
                  <>
                    <p className={cn(
                      'font-semibold',
                      isExp ? 'text-[11px]' : 'text-[10px]',
                      mine ? 'text-primary-foreground/90' : 'text-primary'
                    )}>
                      {m.sender_type === 'agent' ? (m.sender_name || 'Agente') : (customerName || m.sender_name || 'Cliente')}
                    </p>
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
                <p className={cn(isExp ? 'text-[10px]' : 'text-[9px]', isDeleted ? 'text-muted-foreground' : mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {fmtTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={isExp ? scrollRefExpanded : scrollRef} />
      </div>
    );
  };

  const renderComposer = (size: 'compact' | 'expanded') => {
    const isExp = size === 'expanded';
    return (
      <div className={cn('flex gap-1.5 items-center', isExp && 'gap-2')}>
        <Button
          size="icon"
          variant="ghost"
          className={cn('flex-shrink-0', isExp ? 'h-10 w-10' : 'h-8 w-8')}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Anexar arquivo (até 10MB)"
        >
          {uploading ? <Loader2 className={isExp ? 'h-4 w-4 animate-spin' : 'h-3.5 w-3.5 animate-spin'} /> : <Paperclip className={isExp ? 'h-4 w-4' : 'h-3.5 w-3.5'} />}
        </Button>
        <EmojiBar onPick={insertEmoji} size={isExp ? 'md' : 'sm'} />
        <Textarea
          ref={isExp ? inputRefExpanded : inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          onPaste={handlePaste}
          placeholder="Mensagem..."
          rows={1}
          className={cn(
            'resize-none min-h-0 py-2 leading-snug',
            isExp ? 'text-sm max-h-40' : 'text-xs max-h-28',
          )}
        />

        <Button size="icon" className={cn('flex-shrink-0', isExp ? 'h-10 w-10' : 'h-8 w-8')} onClick={handleSend} disabled={!input.trim()}>
          <Send className={isExp ? 'h-4 w-4' : 'h-3 w-3'} />
        </Button>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Live Chat
        </h2>
        <div className="flex items-center gap-2">
          {chatStatus === 'active' && (
            <span className="text-[10px] font-medium text-status-open flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-status-open animate-pulse" /> AO VIVO
            </span>
          )}
          {chatStatus === 'ended' && (
            <span className="text-[10px] font-medium text-muted-foreground">FINALIZADO</span>
          )}
          {chatStatus !== 'inactive' && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setExpanded(true)}
              title="Abrir em tela grande"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>


      {chatStatus === 'inactive' && (
        <Button size="sm" className="w-full gap-2" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
          Gerar Link de Chat Ao Vivo
        </Button>
      )}

      {chatToken && chatStatus !== 'inactive' && (
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2 py-1.5">
          <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <input
            readOnly
            value={publicUrl}
            className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-foreground outline-none truncate"
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopy}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      )}

      {chatStatus !== 'inactive' && (
        <>
          {renderMessages('compact')}

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

          {chatStatus === 'active' && (
            <>
              {renderComposer('compact')}
              <Button
                size="sm"
                variant="destructive"
                className="w-full gap-2"
                onClick={() => setConfirmEndOpen(true)}
                disabled={ending}
              >
                {ending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PowerOff className="h-3 w-3" />}
                Finalizar Chat
              </Button>
            </>
          )}

          {chatStatus === 'ended' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setConfirmReopenOpen(true)}
              disabled={reopening}
            >
              {reopening ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Reabrir Chat
            </Button>
          )}
        </>
      )}

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-3xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 py-3 border-b border-border flex-shrink-0">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="truncate">
                {ticketMeta.number ? `Ticket #${ticketMeta.number}` : 'Live Chat'}
                {ticketMeta.subject ? ` — ${ticketMeta.subject}` : ''}
              </span>
              {chatStatus === 'active' && (
                <span className="ml-2 text-[10px] font-medium text-status-open flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-open animate-pulse" /> AO VIVO
                </span>
              )}
              {chatStatus === 'ended' && (
                <span className="ml-2 text-[10px] font-medium text-muted-foreground">FINALIZADO</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col px-5 py-4 gap-3">
            {renderMessages('expanded')}

            {chatStatus === 'active' && (
              <>
                {renderComposer('expanded')}
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => setConfirmEndOpen(true)}
                  disabled={ending}
                >
                  {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PowerOff className="h-4 w-4" />}
                  Finalizar Chat
                </Button>
              </>
            )}

            {chatStatus === 'ended' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setConfirmReopenOpen(true)}
              disabled={reopening}
            >
              {reopening ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Reabrir Chat
            </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar chat?</AlertDialogTitle>
            <AlertDialogDescription>
              O histórico será enviado como resposta pública ao ticket. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEnd}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmReopenOpen} onOpenChange={setConfirmReopenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir chat?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente poderá enviar novas mensagens usando o mesmo link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopen}>Reabrir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
