import type { Ticket, Customer, Profile, TicketMessage, AuditLogEntry, SLAPolicy, CSATResponse, ApiKeyService } from '@/types';

export const mockProfiles: Profile[] = [
  { id: 'agent-1', full_name: 'Carlos Silva', email: 'carlos@helpdesk.com', role: 'admin', avatar_url: '', is_active: true },
  { id: 'agent-2', full_name: 'Ana Oliveira', email: 'ana@helpdesk.com', role: 'agent', avatar_url: '', is_active: true },
  { id: 'agent-3', full_name: 'Pedro Santos', email: 'pedro@helpdesk.com', role: 'agent', avatar_url: '', is_active: true },
  { id: 'agent-4', full_name: 'Maria Costa', email: 'maria@helpdesk.com', role: 'agent', avatar_url: '', is_active: true },
  { id: 'agent-5', full_name: 'João Ferreira', email: 'joao@helpdesk.com', role: 'agent', avatar_url: '', is_active: true },
];

export const mockCustomers: Customer[] = [
  { id: 'cust-1', name: 'Empresa Alpha Ltda', email: 'contato@alpha.com', phone: '(11) 99999-0001', company: 'Alpha Tecnologia', created_at: '2024-01-15T10:00:00Z' },
  { id: 'cust-2', name: 'Beta Soluções S.A.', email: 'suporte@beta.com', phone: '(21) 98888-0002', company: 'Beta Soluções', created_at: '2024-02-20T14:30:00Z' },
  { id: 'cust-3', name: 'Gamma Comércio', email: 'ti@gamma.com', phone: '(31) 97777-0003', company: 'Gamma Comércio', created_at: '2024-03-10T09:15:00Z' },
  { id: 'cust-4', name: 'Delta Serviços', email: 'help@delta.com', company: 'Delta Serviços Digitais', created_at: '2024-04-05T16:45:00Z' },
  { id: 'cust-5', name: 'Epsilon Logística', email: 'operacoes@epsilon.com', phone: '(41) 96666-0005', company: 'Epsilon Log', created_at: '2024-05-12T11:00:00Z' },
];

export const mockTickets: Ticket[] = [
  {
    id: 'tk-1', number: 1001, subject: 'Sistema de login não funciona após atualização',
    status: 'open', priority: 'urgent', channel: 'email',
    customer_id: 'cust-1', customer: mockCustomers[0],
    assigned_agent_id: 'agent-1', assigned_agent: mockProfiles[0],
    tags: ['bug', 'autenticação'], sla_status: 'breached', sla_due_at: '2024-06-01T10:00:00Z',
    created_at: '2024-06-01T08:30:00Z', updated_at: '2024-06-01T09:45:00Z',
  },
  {
    id: 'tk-2', number: 1002, subject: 'Dúvida sobre integração com API REST',
    status: 'pending', priority: 'medium', channel: 'email',
    customer_id: 'cust-2', customer: mockCustomers[1],
    assigned_agent_id: 'agent-2', assigned_agent: mockProfiles[1],
    tags: ['integração', 'api'], sla_status: 'ok', sla_due_at: '2024-06-03T14:00:00Z',
    created_at: '2024-06-01T10:15:00Z', updated_at: '2024-06-01T11:30:00Z',
  },
  {
    id: 'tk-3', number: 1003, subject: 'Relatório financeiro com dados incorretos',
    status: 'pending', priority: 'high', channel: 'email',
    customer_id: 'cust-3', customer: mockCustomers[2],
    assigned_agent_id: 'agent-3', assigned_agent: mockProfiles[2],
    tags: ['relatório', 'financeiro'], sla_status: 'warning', sla_due_at: '2024-06-02T09:00:00Z',
    created_at: '2024-06-01T07:00:00Z', updated_at: '2024-06-01T08:00:00Z',
  },
  {
    id: 'tk-4', number: 1004, subject: 'Solicitação de novo módulo de inventário',
    status: 'pending', priority: 'low', channel: 'chat',
    customer_id: 'cust-4', customer: mockCustomers[3],
    assigned_agent_id: 'agent-4', assigned_agent: mockProfiles[3],
    tags: ['feature-request'], sla_status: 'ok',
    created_at: '2024-05-30T15:00:00Z', updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: 'tk-5', number: 1005, subject: 'Erro 500 ao exportar planilha de clientes',
    status: 'open', priority: 'high', channel: 'phone',
    customer_id: 'cust-5', customer: mockCustomers[4],
    tags: ['bug', 'exportação'], sla_status: 'warning', sla_due_at: '2024-06-02T12:00:00Z',
    created_at: '2024-06-01T11:00:00Z', updated_at: '2024-06-01T11:30:00Z',
  },
  {
    id: 'tk-6', number: 1006, subject: 'Configuração de notificações por email',
    status: 'resolved', priority: 'low', channel: 'email',
    customer_id: 'cust-1', customer: mockCustomers[0],
    assigned_agent_id: 'agent-2', assigned_agent: mockProfiles[1],
    tags: ['configuração'], sla_status: 'ok',
    created_at: '2024-05-28T09:00:00Z', updated_at: '2024-05-29T14:00:00Z', resolved_at: '2024-05-29T14:00:00Z',
  },
  {
    id: 'tk-7', number: 1007, subject: 'Lentidão no carregamento do dashboard',
    status: 'pending', priority: 'medium', channel: 'email',
    customer_id: 'cust-2', customer: mockCustomers[1],
    assigned_agent_id: 'agent-1', assigned_agent: mockProfiles[0],
    tags: ['performance'], sla_status: 'ok',
    created_at: '2024-06-01T06:00:00Z', updated_at: '2024-06-01T07:30:00Z',
  },
  {
    id: 'tk-8', number: 1008, subject: 'Problema com permissões de usuário admin',
    status: 'resolved', priority: 'urgent', channel: 'phone',
    customer_id: 'cust-3', customer: mockCustomers[2],
    assigned_agent_id: 'agent-5', assigned_agent: mockProfiles[4],
    tags: ['permissões', 'segurança'], sla_status: 'ok',
    created_at: '2024-05-25T08:00:00Z', updated_at: '2024-05-26T16:00:00Z', resolved_at: '2024-05-26T15:00:00Z',
  },
];

export const mockMessages: TicketMessage[] = [
  {
    id: 'msg-1', ticket_id: 'tk-1', sender_type: 'customer', sender_id: 'cust-1',
    sender_name: 'Empresa Alpha Ltda', message_type: 'public_reply',
    body: 'Bom dia, após a atualização de ontem nosso sistema de login parou de funcionar. Nenhum usuário consegue acessar a plataforma. Isso está impactando toda a operação.',
    created_at: '2024-06-01T08:30:00Z',
  },
  {
    id: 'msg-2', ticket_id: 'tk-1', sender_type: 'agent', sender_id: 'agent-1',
    sender_name: 'Carlos Silva', message_type: 'public_reply',
    body: 'Bom dia! Entendo a urgência. Já estamos investigando o problema. Pode me informar qual versão do navegador seus usuários estão utilizando?',
    created_at: '2024-06-01T08:45:00Z',
  },
  {
    id: 'msg-3', ticket_id: 'tk-1', sender_type: 'agent', sender_id: 'agent-1',
    sender_name: 'Carlos Silva', message_type: 'internal_note',
    body: 'Verificar logs do auth service. Possível problema com a migração do banco de dados na última release. @Pedro pode verificar?',
    created_at: '2024-06-01T08:50:00Z',
  },
  {
    id: 'msg-4', ticket_id: 'tk-1', sender_type: 'system', sender_id: 'system',
    sender_name: 'Sistema', message_type: 'system',
    body: 'Prioridade alterada de Alta para Urgente por Carlos Silva',
    created_at: '2024-06-01T09:00:00Z',
  },
  {
    id: 'msg-5', ticket_id: 'tk-1', sender_type: 'customer', sender_id: 'cust-1',
    sender_name: 'Empresa Alpha Ltda', message_type: 'public_reply',
    body: 'Estamos usando Chrome 125 e Firefox 126. O problema acontece em ambos. Seguem os screenshots do erro em anexo.',
    attachments: [
      { name: 'erro_login_chrome.png', url: '#', size: '245 KB' },
      { name: 'erro_login_firefox.png', url: '#', size: '312 KB' },
    ],
    created_at: '2024-06-01T09:15:00Z',
  },
];

export const mockAuditLog: AuditLogEntry[] = [
  { id: 'al-1', ticket_id: 'tk-1', user_name: 'Sistema', action: 'Ticket criado', details: 'Via email', created_at: '2024-06-01T08:30:00Z' },
  { id: 'al-2', ticket_id: 'tk-1', user_name: 'Carlos Silva', action: 'Ticket atribuído', details: 'Para Carlos Silva', created_at: '2024-06-01T08:35:00Z' },
  { id: 'al-3', ticket_id: 'tk-1', user_name: 'Carlos Silva', action: 'Prioridade alterada', details: 'De Alta para Urgente', created_at: '2024-06-01T09:00:00Z' },
  { id: 'al-4', ticket_id: 'tk-1', user_name: 'Carlos Silva', action: 'Tag adicionada', details: 'autenticação', created_at: '2024-06-01T09:05:00Z' },
  { id: 'al-5', ticket_id: 'tk-1', user_name: 'Carlos Silva', action: 'Status alterado', details: 'De Aberto para Em Progresso', created_at: '2024-06-01T09:10:00Z' },
];

export const mockSLAPolicies: SLAPolicy[] = [
  { id: 'sla-1', name: 'Urgente', priority: 'urgent', first_response_hours: 1, resolution_hours: 4 },
  { id: 'sla-2', name: 'Alta', priority: 'high', first_response_hours: 4, resolution_hours: 12 },
  { id: 'sla-3', name: 'Média', priority: 'medium', first_response_hours: 8, resolution_hours: 24 },
  { id: 'sla-4', name: 'Baixa', priority: 'low', first_response_hours: 24, resolution_hours: 72 },
];

export const mockCSATResponses: CSATResponse[] = [
  { id: 'csat-1', ticket_id: 'tk-6', customer_id: 'cust-1', score: 5, comment: 'Excelente atendimento!', created_at: '2024-05-29T15:00:00Z' },
  { id: 'csat-2', ticket_id: 'tk-8', customer_id: 'cust-3', score: 4, comment: 'Bom, mas demorou um pouco', created_at: '2024-05-27T10:00:00Z' },
];

export const mockApiKeyServices: ApiKeyService[] = [
  { id: 'svc-1', service_name: 'openai', label: 'OpenAI', description: 'Utilizada para geração de texto e embeddings (GPT-4, etc.)', icon: 'Brain', status: 'active', updated_at: '2024-05-20T10:00:00Z', docs_url: 'https://platform.openai.com/api-keys', placeholder: 'sk-...' },
  { id: 'svc-2', service_name: 'anthropic', label: 'Anthropic', description: 'Utilizada para o Claude e funcionalidades de IA', icon: 'Bot', status: 'not_configured', docs_url: 'https://console.anthropic.com/', placeholder: 'sk-ant-...' },
  { id: 'svc-3', service_name: 'sendgrid', label: 'SendGrid', description: 'Utilizada para envio de emails transacionais', icon: 'Mail', status: 'not_configured', docs_url: 'https://app.sendgrid.com/settings/api_keys', placeholder: 'SG...' },
  { id: 'svc-4', service_name: 'stripe', label: 'Stripe', description: 'Utilizada para processamento de pagamentos', icon: 'CreditCard', status: 'invalid', updated_at: '2024-05-15T08:00:00Z', docs_url: 'https://dashboard.stripe.com/apikeys', placeholder: 'sk_live_...' },
];

export const mockDashboardKPIs = {
  openTickets: { value: 24, trend: +12, label: 'Tickets Abertos' },
  slaAtRisk: { value: 5, trend: -2, label: 'SLA em Risco' },
  avgFirstResponse: { value: '2.4h', trend: -15, label: 'Tempo Médio 1ª Resp.' },
  avgCSAT: { value: '4.2', trend: +5, label: 'CSAT Médio' },
  firstContactResolution: { value: '68%', trend: +3, label: 'Resolução 1º Contato' },
  unassigned: { value: 7, trend: +4, label: 'Não Atribuídos' },
};

export const mockAgentRanking = [
  { agent: mockProfiles[0], resolved: 45 },
  { agent: mockProfiles[1], resolved: 38 },
  { agent: mockProfiles[4], resolved: 32 },
  { agent: mockProfiles[2], resolved: 28 },
  { agent: mockProfiles[3], resolved: 21 },
];
