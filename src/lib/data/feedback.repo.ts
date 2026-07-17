import { db } from './client';
import type { Database, FeedbackChannel } from './types.gen';

export type Feedback = Database['public']['Tables']['customer_feedback']['Row'];

export const listFeedback = () => db.table<Feedback>('customer_feedback').list();

export const createFeedback = (input: {
  channel: FeedbackChannel;
  category?: string | null;
  message: string;
}) => db.table<Feedback>('customer_feedback').create(input);

export const updateFeedback = (id: string, patch: Partial<Pick<Feedback, 'status'>>) =>
  db.table<Feedback>('customer_feedback').update(id, patch);
