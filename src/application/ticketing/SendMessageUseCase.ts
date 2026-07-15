import { supabase } from '@/integrations/supabase/client';
import { getTicketRepository, getTicketMessageRepository, getAuditLogRepository, getTicketParticipantRepository } from '@/infrastructure/registries/ticketing';
import { getProfileRepository } from '@/infrastructure/registries/identity';
import { DomainError } from '@/shared/errors/DomainError';
import type { CreateMessageProps } from '@/domain/ticketing/repositories/ITicketMessageRepository';
import type { TicketMessage } from '@/domain/ticketing/entities/TicketMessage';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function extractMentionIds(html: string): string[] {
  const ids = new Set<string>();
  // Tiptap mention renders <span data-type="mention" data-id="UUID" ...>
  const re = /data-type="mention"[^>]*data-id="([^"]+)"|data-id="([^"]+)"[^>]*data-type="mention"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1] ?? m[2];
    if (id && UUID_RE.test(id)) ids.add(id);
    UUID_RE.lastIndex = 0;
  }
  return Array.from(ids);
}

export class SendMessageUseCase {
  async execute(props: CreateMessageProps): Promise<TicketMessage> {
    const ticket = await getTicketRepository().findById(props.ticketId);
    if (!ticket) throw new DomainError(`Ticket ${props.ticketId} not found`);

    const message = await getTicketMessageRepository().create(props);

    if (props.senderType === 'agent' && props.messageType === 'public_reply') {
      const plain = ticket.toPlainObject();
      const changes: Record<string, unknown> = {};
      if (!plain.firstResponseAt) changes.firstResponseAt = new Date();
      if (Object.keys(changes).length) {
        await getTicketRepository().update(props.ticketId, changes);
      }
    }

    await getAuditLogRepository().create({
      ticketId: props.ticketId,
      userName: props.senderName,
      action: 'Mensagem enviada',
      details: props.messageType === 'internal_note' ? 'Nota interna' : 'Resposta pública',
    });

    // Process @mentions in internal notes
    if (props.messageType === 'internal_note' && props.senderType === 'agent') {
      const mentionedIds = extractMentionIds(props.body).filter(id => id !== props.senderId);
      if (mentionedIds.length > 0) {
        const participantRepo = getTicketParticipantRepository();
        const profileRepo = getProfileRepository();
        const ticketPlain = ticket.toPlainObject();

        for (const userId of mentionedIds) {
          try {
            await participantRepo.add(props.ticketId, userId, props.senderId ?? null);
            const profile = await profileRepo.findById(userId);
            if (profile) {
              const p = profile.toPlainObject();
              await getAuditLogRepository().create({
                ticketId: props.ticketId,
                userName: props.senderName,
                action: 'Participante mencionado',
                details: `${p.fullName} foi mencionado em uma nota interna`,
              });
              // Fire-and-forget notification
              supabase.functions.invoke('send-notification', {
                body: {
                  to: p.email,
                  subject: `Você foi mencionado no chamado #${ticketPlain.number}`,
                  template: 'agent_reply',
                  data: {
                    number: ticketPlain.number,
                    subject: ticketPlain.subject,
                    link: `${window.location.origin}/tickets/${props.ticketId}`,
                  },
                },
              }).catch(err => console.warn('mention notify failed', err));
            }
          } catch (err) {
            console.warn('mention add failed for', userId, err);
          }
        }
      }
    }

    return message;
  }
}
