import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Paperclip, Eye, EyeOff, Loader2, X, FileText } from 'lucide-react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Mention from '@tiptap/extension-mention';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { useSendMessage } from '@/presentation/hooks/ticketing/useSendMessage';
import { useAuth } from '@/presentation/hooks/identity/useAuth';
import { getStorageService } from '@/infrastructure/registries/storage';
import { getProfileRepository } from '@/infrastructure/registries/identity';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MentionList, type MentionItem } from '@/components/MentionList';
import { cn } from '@/lib/utils';

interface Props {
  ticketId: string;
  ticketChannel?: string;
  customerEmail?: string;
  zendeskTicketId?: string | null;
  onSent?: () => void;
}

export function MessageComposer({ ticketId, ticketChannel, customerEmail, zendeskTicketId, onSent }: Props) {
  const [isInternal, setIsInternal] = useState(false);
  const { sendMessage, isLoading } = useSendMessage();
  const { currentUser, profile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ fileName: string; filePath: string; fileSize: number; contentType: string }>>([]);
  const [agents, setAgents] = useState<MentionItem[]>([]);
  const agentsRef = useRef<MentionItem[]>([]);
  const [, forceTick] = useState(0);

  useEffect(() => {
    getProfileRepository().listAgents(true).then(list => {
      const items = list
        .map(a => a.toPlainObject())
        .filter(a => a.id !== profile?.id)
        .map(a => ({ id: a.id, label: a.fullName, email: a.email, avatarUrl: a.avatarUrl }));
      setAgents(items);
      agentsRef.current = items;
    });
  }, [profile?.id]);

  const mentionExtension = useMemo(() => Mention.configure({
    HTMLAttributes: {
      class: 'inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-primary/15 text-primary text-xs font-medium',
    },
    renderText({ options, node }) {
      return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
    },
    suggestion: {
      char: '@',
      items: ({ query }) =>
        agentsRef.current
          .filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8),
      render: () => {
        let component: ReactRenderer | null = null;
        let popup: TippyInstance[] = [];
        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionList, { props, editor: props.editor });
            if (!props.clientRect) return;
            popup = tippy('body', {
              getReferenceClientRect: props.clientRect as any,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
            });
          },
          onUpdate: (props) => {
            component?.updateProps(props);
            if (props.clientRect && popup[0]) {
              popup[0].setProps({ getReferenceClientRect: props.clientRect as any });
            }
          },
          onKeyDown: (props) => {
            if (props.event.key === 'Escape') { popup[0]?.hide(); return true; }
            return (component?.ref as any)?.onKeyDown?.(props) ?? false;
          },
          onExit: () => {
            popup[0]?.destroy();
            component?.destroy();
          },
        };
      },
    },
  }), []);

  const uploadImageFile = async (file: File): Promise<{ signedUrl: string; fileName: string } | null> => {
    setUploading(true);
    try {
      const storage = getStorageService();
      const safeName = file.name && file.name !== 'image.png' ? file.name : `pasted-${Date.now()}.png`;
      const path = await storage.uploadPrivate('ticket-attachments', `${ticketId}/${Date.now()}-${safeName}`, file);
      const signedUrl = await storage.getSignedUrl('ticket-attachments', path, 3600);
      setPendingAttachments(prev => [...prev, {
        fileName: safeName,
        filePath: path,
        fileSize: file.size,
        contentType: file.type || 'image/png',
      }]);
      return { signedUrl, fileName: safeName };
    } catch (err: any) {
      toast({ title: 'Erro ao anexar imagem', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false } as any),
      LinkExtension.configure({ openOnClick: false }),
      ImageExtension.configure({ inline: false, allowBase64: false, HTMLAttributes: { class: 'max-w-[240px] max-h-[200px] object-contain rounded-md border border-border my-2 cursor-zoom-in' } }),
      mentionExtension,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'min-h-[80px] outline-none text-sm text-foreground prose prose-sm dark:prose-invert max-w-none',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        const imageItems = Array.from(items).filter(it => it.kind === 'file' && it.type.startsWith('image/'));
        if (imageItems.length === 0) return false;
        event.preventDefault();
        (async () => {
          for (const it of imageItems) {
            const file = it.getAsFile();
            if (!file) continue;
            const result = await uploadImageFile(file);
            if (result && editor) {
              editor.chain().focus().setImage({ src: result.signedUrl, alt: result.fileName }).run();
            }
          }
        })();
        return true;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        (async () => {
          for (const file of imageFiles) {
            const result = await uploadImageFile(file);
            if (result && editor) {
              editor.chain().focus().setImage({ src: result.signedUrl, alt: result.fileName }).run();
            }
          }
        })();
        return true;
      },
    },
    onUpdate: () => forceTick(t => t + 1),
    onSelectionUpdate: () => forceTick(t => t + 1),
  });

  const handleSend = async () => {
    if (!editor) return;
    const hasText = !editor.isEmpty;
    const hasAttachments = pendingAttachments.length > 0;
    if (!hasText && !hasAttachments) return;

    // Sempre usa HTML — preserva menções, formatação, quebras. Zendesk aceita html_body.
    const body = hasText ? editor.getHTML() : '<p></p>';
    try {
      const sent = await sendMessage({
        ticketId,
        senderType: 'agent',
        senderId: profile?.id ?? null,
        senderName: currentUser?.full_name ?? 'Agente',
        senderAvatar: currentUser?.avatar_url ?? null,
        messageType: isInternal ? 'internal_note' : 'public_reply',
        body,
      });
      editor.commands.clearContent();

      const messageId = sent?.toPlainObject?.().id ?? (sent as any)?.id;
      const attachmentsToSend = pendingAttachments;
      setPendingAttachments([]);

      // Persistir anexos vinculados à mensagem
      if (messageId && attachmentsToSend.length > 0) {
        const { error: attErr } = await supabase.from('ticket_attachments').insert(
          attachmentsToSend.map(a => ({
            ticket_message_id: messageId,
            file_name: a.fileName,
            file_url: a.filePath,
            file_size: a.fileSize,
            content_type: a.contentType,
          })),
        );
        if (attErr) console.warn('attachments insert failed', attErr);
      }

      if (zendeskTicketId) {
        // Ticket veio do Zendesk: posta comentário lá (público ou privado). Zendesk notifica o cliente.
        try {
          const { data, error } = await supabase.functions.invoke('push-zendesk-reply', {
            body: { ticketId, messageId, attachments: attachmentsToSend },
          });
          if (error) {
            toast({ title: 'Resposta salva, mas falhou ao enviar ao Zendesk', description: error.message, variant: 'destructive' });
          } else if (data?.success === false) {
            toast({ title: 'Resposta salva, mas o Zendesk recusou', description: data.error ?? 'Confira as credenciais em Integrações.', variant: 'destructive' });
          } else {
            toast({ title: isInternal ? 'Nota sincronizada com o Zendesk' : 'Resposta enviada via Zendesk' });
          }
        } catch (zErr: any) {
          toast({ title: 'Falha ao sincronizar com Zendesk', description: zErr.message, variant: 'destructive' });
        }
      } else if (!isInternal && (ticketChannel === 'email' || customerEmail)) {
        try {
          const { data, error } = await supabase.functions.invoke('send-reply-email', {
            body: { ticketId, messageId: 'latest' },
          });
          if (error) {
            toast({ title: 'Resposta salva, mas o email falhou', description: error.message, variant: 'destructive' });
          } else if (data?.success === false) {
            toast({ title: 'Resposta salva, mas o email não foi enviado', description: data.error ?? 'Confira a integração de email.', variant: 'destructive' });
          }
        } catch (emailErr) {
          console.warn('Email reply failed (non-blocking):', emailErr);
        }
      }


      onSent?.();
    } catch (e: any) {
      toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storage = getStorageService();
      const path = await storage.uploadPrivate('ticket-attachments', `${ticketId}/${Date.now()}-${file.name}`, file);
      setPendingAttachments(prev => [...prev, {
        fileName: file.name,
        filePath: path,
        fileSize: file.size,
        contentType: file.type || 'application/octet-stream',
      }]);
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={cn(
      'rounded-lg border p-3 flex flex-col gap-3 max-h-[60vh]',
      isInternal ? 'border-status-pending/40 bg-status-pending/5' : 'border-border bg-card'
    )}>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => setIsInternal(false)}
          className={cn('text-xs font-medium px-2.5 py-1 rounded-md transition-colors',
            !isInternal ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Eye className="h-3 w-3 inline mr-1" />Resposta Pública
        </button>
        <button
          onClick={() => setIsInternal(true)}
          className={cn('text-xs font-medium px-2.5 py-1 rounded-md transition-colors',
            isInternal ? 'bg-status-pending text-background' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <EyeOff className="h-3 w-3 inline mr-1" />Nota Interna
        </button>
        {isInternal && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Digite <kbd className="px-1 py-0.5 rounded bg-secondary text-foreground">@</kbd> para mencionar um agente
          </span>
        )}
      </div>

      {editor && (
        <div className="flex gap-1 border-b border-border pb-2 flex-shrink-0">
          <Button type="button" variant="ghost" size="sm" className={cn('h-7 px-2 text-xs', editor.isActive('bold') && 'bg-accent')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <strong>B</strong>
          </Button>
          <Button type="button" variant="ghost" size="sm" className={cn('h-7 px-2 text-xs', editor.isActive('italic') && 'bg-accent')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <em>I</em>
          </Button>
          <Button type="button" variant="ghost" size="sm" className={cn('h-7 px-2 text-xs', editor.isActive('bulletList') && 'bg-accent')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            Lista
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => {
            const url = window.prompt('URL do link:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}>
            Link
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>


      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {pendingAttachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="max-w-[180px] truncate">{a.fileName}</span>
              <span className="text-muted-foreground">{(a.fileSize / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remover anexo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between flex-shrink-0">

        <div className="flex gap-1">
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />} Anexar
          </Button>
        </div>
        <Button size="sm" className="gap-1" onClick={handleSend} disabled={isLoading || !editor || (editor.isEmpty && pendingAttachments.length === 0)}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
        </Button>
      </div>
    </div>
  );
}
