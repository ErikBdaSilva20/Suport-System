import type { Customer } from '@/lib/data/customers.repo';
import type { Feedback } from '@/lib/data/feedback.repo';
import type { Ticket } from '@/lib/data/tickets.repo';

// wa.me exige dígitos puros (sem "+", espaço ou traço) — mesmo formato de
// phone_e164 já gravado no cadastro do cliente (ver TicketNewScreen/LoginScreen).
function toWhatsAppDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

function buildWhatsAppUrl(phone: string, text: string): string {
  const digits = toWhatsAppDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function buildGreeting(customerName: string, ticketNumber: number, subject: string): string {
  return `Olá ${customerName}, sobre o chamado #${ticketNumber}: ${subject}`;
}

/**
 * Monta o link do wa.me pro cliente dono do chamado, com o número e uma
 * mensagem genérica de atendimento já preenchidos. `null` quando o cliente
 * não tem telefone cadastrado (nada pra chamar).
 */
export function buildWhatsAppLink(
  customer: Pick<Customer, 'name' | 'phone_e164'> | null | undefined,
  ticket: Pick<Ticket, 'number' | 'subject'>
): string | null {
  if (!customer?.phone_e164) return null;
  return buildWhatsAppUrl(customer.phone_e164, buildGreeting(customer.name, ticket.number, ticket.subject));
}

/**
 * Mesma ideia de `buildWhatsAppLink`, mas pro contexto de um feedback em vez
 * de um ticket. `null` quando o cliente não tem telefone cadastrado.
 */
export function buildFeedbackWhatsAppLink(
  customer: Pick<Customer, 'name' | 'phone_e164'> | null | undefined,
  feedback: Pick<Feedback, 'category' | 'message'>
): string | null {
  if (!customer?.phone_e164) return null;
  const categorySuffix = feedback.category ? ` (${feedback.category})` : '';
  const text = `Olá, ${customer.name}, Me chamo ----- e estou entrando em contato sobre seu feedback${categorySuffix}: "${feedback.message}".`;
  return buildWhatsAppUrl(customer.phone_e164, text);
}
