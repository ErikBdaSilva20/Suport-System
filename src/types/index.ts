// Re-exports dos tipos de domínio (compatibilidade com código existente)
import type { TicketStatus as _TicketStatus } from '@/domain/ticketing/value-objects/TicketStatus';
import type { TicketPriority as _TicketPriority } from '@/domain/ticketing/value-objects/TicketPriority';
import type { SLAStatus as _SLAStatus } from '@/domain/ticketing/value-objects/SLAStatus';

export type TicketStatus = _TicketStatus;
export type TicketPriority = _TicketPriority;
export type SLAStatus = _SLAStatus;
export type { TicketProps as DomainTicket } from '@/domain/ticketing/entities/Ticket';
export type { TicketMessageProps as DomainTicketMessage } from '@/domain/ticketing/entities/TicketMessage';
export type { CustomerProps as DomainCustomer } from '@/domain/customer-portal/entities/Customer';
export type { ProfileProps as DomainProfile } from '@/domain/identity/entities/Profile';
export type { SLAPolicy as DomainSLAPolicy } from '@/domain/settings/entities/SLAPolicy';
export type { Tag } from '@/domain/settings/entities/Tag';
export type { CSATResponseProps as DomainCSATResponse } from '@/domain/customer-portal/entities/CSATResponse';
export type { AppSettings } from '@/domain/settings/entities/AppSettings';
export type { ArticleStatus } from '@/domain/knowledge-base/value-objects/ArticleStatus';
export type { KBArticleProps as KBArticle } from '@/domain/knowledge-base/entities/KBArticle';
export type { KBCategoryProps as KBCategory } from '@/domain/knowledge-base/entities/KBCategory';
export type { UserRole } from '@/domain/identity/value-objects/UserRole';

// Manter todos os tipos que já existiam no arquivo (usados pelas páginas atuais)
export type TicketChannel = 'email' | 'chat' | 'phone' | 'api';
export type MessageType = 'public_reply' | 'internal_note' | 'system';
export type SenderType = 'agent' | 'customer' | 'system';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'agent';
  avatar_url?: string;
  is_active: boolean;
}

export interface Ticket {
  id: string;
  number: number;
  subject: string;
  description?: string;
  internal_title?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  channel: TicketChannel;
  customer_id: string;
  customer?: Customer;
  assigned_agent_id?: string;
  assigned_agent?: Profile;
  tags: string[];
  sla_status: SLAStatus;
  sla_due_at?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  first_response_at?: string;
  involvement?: 'assignee' | 'participant' | 'both';
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: SenderType;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  message_type: MessageType;
  body: string;
  attachments?: { name: string; url: string; size: string }[];
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  ticket_id: string;
  user_name: string;
  action: string;
  details?: string;
  created_at: string;
}

export interface SLAPolicy {
  id: string;
  name: string;
  priority: TicketPriority;
  first_response_hours: number;
  resolution_hours: number;
}

export interface CSATResponse {
  id: string;
  ticket_id: string;
  customer_id: string;
  score: number;
  comment?: string;
  created_at: string;
}

export interface ApiKeyService {
  id: string;
  service_name: string;
  label: string;
  description: string;
  icon: string;
  status: 'active' | 'not_configured' | 'invalid';
  updated_at?: string;
  docs_url: string;
  placeholder: string;
}
