import type { Feedback } from '@/lib/data/feedback.repo';
import type { FeedbackChannel } from '@/lib/data/types.gen';

// Categorias que o rep escolhe ao enviar feedback (FeedbackScreen). 'Reclamação'
// é tratada à parte (ComplaintsCard, em Tickets) — não aparece na triagem de
// staff em /feedback, daí ser exportada como constante própria em vez de um
// literal repetido nos dois pontos que precisam filtrar por ela.
export const FEEDBACK_CATEGORIES = ['Atendimento', 'Produto', 'Reclamação', 'Sugestão'] as const;
export const COMPLAINT_CATEGORY: (typeof FEEDBACK_CATEGORIES)[number] = 'Reclamação';

export const CHANNEL_LABEL: Record<FeedbackChannel, string> = {
  urgent: 'Preciso de contato',
  general: 'Feedback geral',
};

export const STATUS_LABEL: Record<Feedback['status'], string> = {
  open: 'Aberto',
  read: 'Lido',
  resolved: 'Resolvido',
};

export const STATUS_TONE: Record<Feedback['status'], string> = {
  open: 'bg-status-open text-white border-transparent',
  read: 'bg-status-pending text-white border-transparent',
  resolved: 'bg-status-resolved text-white border-transparent',
};
