import { useState, useEffect, useCallback } from 'react';
import { GetTicketDetailUseCase } from '@/application/ticketing/GetTicketDetailUseCase';
import { getProfileRepository } from '@/infrastructure/registries/identity';
import type { Ticket, TicketMessage, AuditLogEntry, Customer } from '@/types';

function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

interface TicketDetailData {
  ticket: Ticket;
  messages: TicketMessage[];
  auditLog: AuditLogEntry[];
  customer: Customer | null;
}

export function useTicketDetail(ticketId: string | undefined) {
  const [data, setData] = useState<TicketDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!ticketId) return;
    setIsLoading(true);
    try {
      const uc = new GetTicketDetailUseCase();
      const result = await uc.execute(ticketId);
      if (!result) { setData(null); return; }

      const tp = result.ticket.toPlainObject();

      // Fetch agent from profile repo if assigned
      let agent: { id: string; full_name: string; email: string; role: 'admin' | 'agent'; avatar_url?: string; is_active: boolean } | undefined;
      if (tp.assignedAgentId) {
        const profileRepo = getProfileRepository();
        const agentEntity = await profileRepo.findById(tp.assignedAgentId);
        if (agentEntity) {
          const ap = agentEntity.toPlainObject();
          agent = { id: ap.id, full_name: ap.fullName, email: ap.email, role: ap.role, avatar_url: ap.avatarUrl ?? undefined, is_active: ap.isActive };
        }
      }

      // Build customer from use case result
      let legacyCustomer: Customer | null = null;
      if (result.customer) {
        const cp = result.customer.toPlainObject();
        legacyCustomer = { id: cp.id, name: cp.fullName, email: cp.email, phone: cp.phone ?? undefined, company: cp.company ?? undefined, created_at: cp.createdAt.toISOString() };
      }

      const ticket: Ticket = {
        id: tp.id, number: tp.number, subject: tp.subject,
        description: tp.description,
        internal_title: tp.internalTitle ?? null,
        status: tp.status, priority: tp.priority, channel: tp.channel,
        customer_id: tp.customerId,
        customer: legacyCustomer ?? undefined,
        assigned_agent_id: tp.assignedAgentId ?? undefined,
        assigned_agent: agent,
        tags: tp.tagIds,
        sla_status: tp.slaStatus,
        sla_due_at: tp.slaFirstResponseDue?.toISOString(),
        created_at: tp.createdAt.toISOString(),
        updated_at: tp.updatedAt.toISOString(),
        resolved_at: tp.resolvedAt?.toISOString(),
        first_response_at: tp.firstResponseAt?.toISOString(),
      };

      const messages: TicketMessage[] = result.messages.map(m => {
        const mp = m.toPlainObject();
        return {
          id: mp.id, ticket_id: mp.ticketId,
          sender_type: mp.senderType, sender_id: mp.senderId ?? '',
          sender_name: mp.senderName, sender_avatar: mp.senderAvatar ?? undefined,
          message_type: mp.messageType, body: mp.body,
          attachments: (mp.attachments ?? []).map(a => ({
            name: a.fileName,
            url: a.fileUrl,
            size: formatFileSize(a.fileSize),
          })),
          created_at: mp.createdAt.toISOString(),
        };
      });

      const auditLog: AuditLogEntry[] = result.auditLog.map(a => ({
        id: a.id, ticket_id: a.ticketId,
        user_name: a.userName, action: a.action,
        details: a.details, created_at: a.createdAt.toISOString(),
      }));

      setData({ ticket, messages, auditLog, customer: legacyCustomer });
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
