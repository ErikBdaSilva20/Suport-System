import { supabase } from '@/integrations/supabase/client';
import type { ITicketMessageRepository, CreateMessageProps } from '@/domain/ticketing/repositories/ITicketMessageRepository';
import { TicketMessage } from '@/domain/ticketing/entities/TicketMessage';
import type { TicketMessageProps } from '@/domain/ticketing/entities/TicketMessage';

const PUBLIC_URL_MARKER = '/object/public/ticket-attachments/';

/** Resolves a stored file reference (path or legacy URL) to a usable URL. */
async function resolveAttachmentUrl(fileUrl: string): Promise<string> {
  let path: string | null = null;
  if (!/^https?:\/\//i.test(fileUrl)) {
    path = fileUrl;
  } else if (fileUrl.includes(PUBLIC_URL_MARKER)) {
    // Legacy public URL on a private bucket — extract path and sign it
    path = decodeURIComponent(fileUrl.split(PUBLIC_URL_MARKER)[1] ?? '');
  }
  if (!path) return fileUrl; // already a signed/external URL
  const { data, error } = await supabase.storage
    .from('ticket-attachments')
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return fileUrl;
  return data.signedUrl;
}

export class SupabaseTicketMessageRepository implements ITicketMessageRepository {
  async findByTicketId(ticketId: string): Promise<TicketMessage[]> {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*, ticket_attachments(id, file_name, file_url, file_size, content_type)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return Promise.all((data ?? []).map(async (row: any) => TicketMessage.create({
      id: row.id,
      ticketId: row.ticket_id,
      senderType: row.sender_type,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderAvatar: row.sender_avatar,
      messageType: row.message_type,
      body: row.body,
      createdAt: new Date(row.created_at),
      attachments: await Promise.all((row.ticket_attachments ?? []).map(async (a: any) => ({
        id: a.id,
        fileName: a.file_name,
        fileUrl: await resolveAttachmentUrl(a.file_url),
        fileSize: a.file_size,
        contentType: a.content_type,
      }))),
    })));
  }

  async create(props: CreateMessageProps): Promise<TicketMessage> {
    const { data, error } = await supabase.from('ticket_messages').insert({
      ticket_id: props.ticketId,
      sender_type: props.senderType,
      sender_id: props.senderId ?? null,
      sender_name: props.senderName,
      sender_avatar: props.senderAvatar ?? null,
      message_type: props.messageType,
      body: props.body,
    }).select().single();

    if (error || !data) throw error ?? new Error('Failed to create message');
    return TicketMessage.create({
      id: data.id,
      ticketId: data.ticket_id,
      senderType: data.sender_type,
      senderId: data.sender_id,
      senderName: data.sender_name,
      senderAvatar: data.sender_avatar,
      messageType: data.message_type,
      body: data.body,
      createdAt: new Date(data.created_at),
    });
  }
}
