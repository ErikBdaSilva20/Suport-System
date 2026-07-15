// Shared professional email template renderer for ticket-related notifications.
// Returns a responsive HTML email with the company logo, ticket metadata chips,
// the main body, an optional CTA, and a footer.

export type EmailKind = 'reply' | 'new_ticket_ack' | 'auto_response';

interface TicketLite {
  id: string;
  number: number;
  subject: string;
  status?: string;
  priority?: string;
}

interface CustomerLite {
  full_name: string;
  email: string;
}

interface SettingsLite {
  company_name?: string | null;
  company_logo_url?: string | null;
  primary_color?: string | null;
  support_email?: string | null;
}

interface RenderArgs {
  kind: EmailKind;
  ticket: TicketLite;
  customer: CustomerLite;
  settings: SettingsLite;
  bodyHtml: string;
  senderName?: string | null;
  cta?: { url: string; label: string } | null;
  // Extra block displayed after the body (e.g., "Artigos consultados").
  extraHtml?: string | null;
}

const PRIORITY_COLOR: Record<string, string> = {
  low: '#10B981',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  pending: 'Pendente',
  resolved: 'Resolvido',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function headlineFor(kind: EmailKind, ticket: TicketLite, customerName: string): string {
  switch (kind) {
    case 'new_ticket_ack':
      return `Recebemos seu chamado, ${customerName.split(' ')[0]} 👋`;
    case 'auto_response':
      return `Tentamos uma resposta inicial — chamado #${ticket.number}`;
    case 'reply':
    default:
      return `Atualização no chamado #${ticket.number}`;
  }
}

export function renderTicketEmail(args: RenderArgs): string {
  const { kind, ticket, customer, settings, bodyHtml, senderName, cta, extraHtml } = args;

  const company = settings.company_name ?? 'Help Desk';
  const primary = settings.primary_color ?? '#1A5276';
  const logoBlock = settings.company_logo_url
    ? `<img src="${escapeHtml(settings.company_logo_url)}" alt="${escapeHtml(company)}" style="max-height:36px;display:block;" />`
    : `<span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">${escapeHtml(company)}</span>`;

  const priorityKey = (ticket.priority ?? 'medium').toLowerCase();
  const statusKey = (ticket.status ?? 'open').toLowerCase();
  const priorityColor = PRIORITY_COLOR[priorityKey] ?? '#6B7280';
  const priorityText = PRIORITY_LABEL[priorityKey] ?? priorityKey;
  const statusText = STATUS_LABEL[statusKey] ?? statusKey;

  const headline = headlineFor(kind, ticket, customer.full_name);

  // Customer-facing email: never expose internal priority. Only show ticket number + status.
  const metaChips = `
    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
      <tr>
        <td style="padding:6px 12px;background:#F3F4F6;border-radius:999px;font-size:12px;color:#374151;font-weight:600;">
          #${ticket.number}
        </td>
        <td style="width:8px;"></td>
        <td style="padding:6px 12px;background:#F3F4F6;border-radius:999px;font-size:12px;color:#374151;">
          ${escapeHtml(statusText)}
        </td>
      </tr>
    </table>
  `;
  // Suppress unused-var warnings for now-internal-only fields.
  void priorityColor; void priorityText;

  const ctaBlock = cta
    ? `
      <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td style="background:${primary};border-radius:6px;">
            <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">
              ${escapeHtml(cta.label)}
            </a>
          </td>
        </tr>
      </table>
    `
    : '';

  const senderLine = senderName
    ? `<p style="margin:24px 0 0 0;font-size:13px;color:#6B7280;">— ${escapeHtml(senderName)}</p>`
    : '';

  const supportLine = settings.support_email
    ? `Em caso de dúvidas, responda este email ou escreva para <a href="mailto:${escapeHtml(settings.support_email)}" style="color:${primary};text-decoration:none;">${escapeHtml(settings.support_email)}</a>.`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(`Chamado #${ticket.number}`)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;padding:32px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:${primary};padding:24px 32px;">
              ${logoBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">
                ${escapeHtml(headline)}
              </h1>
              <p style="margin:0 0 20px 0;font-size:14px;color:#6B7280;">
                ${escapeHtml(ticket.subject)}
              </p>
              ${metaChips}
              <div style="font-size:14px;color:#374151;line-height:1.65;">
                ${bodyHtml}
              </div>
              ${ctaBlock}
              ${extraHtml ?? ''}
              ${senderLine}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#FAFAFA;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF;line-height:1.6;">
              <div style="margin-bottom:6px;color:#6B7280;font-weight:600;">${escapeHtml(company)}</div>
              ${supportLine}
              <div style="margin-top:8px;">Você está recebendo este email porque abriu o chamado #${ticket.number}.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function formatTicketSubject(
  ticket: { number: number; subject: string },
  prefix: string = 'Re',
): string {
  // Always include [#N] so subject-based threading fallback works even
  // when Mailgun rewrites the Message-ID and In-Reply-To matching fails.
  const baseSubject = ticket.subject ?? '';
  const alreadyHasNumber = new RegExp(`\\[#${ticket.number}\\]`).test(baseSubject);
  if (alreadyHasNumber) return prefix ? `${prefix}: ${baseSubject}` : baseSubject;
  return prefix
    ? `${prefix}: [#${ticket.number}] ${baseSubject}`
    : `[#${ticket.number}] ${baseSubject}`;
}

export function renderSourcesBlock(sources: Array<{ title: string }>): string {
  if (!sources.length) return '';
  const items = sources
    .map(
      (s) =>
        `<li style="margin:4px 0;color:#374151;">${s.title.replace(/</g, '&lt;')}</li>`,
    )
    .join('');
  return `
    <div style="margin-top:24px;padding:16px;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;">
      <div style="font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
        Artigos consultados
      </div>
      <ul style="margin:0;padding-left:20px;font-size:13px;">
        ${items}
      </ul>
    </div>
  `;
}
