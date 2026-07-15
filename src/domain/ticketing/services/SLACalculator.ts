import type { SLAPolicy } from '@/domain/settings/entities/SLAPolicy';
import type { SLAStatus } from '../value-objects/SLAStatus';

export class SLACalculator {
  static calculateStatus(dueAt: Date | null | undefined, now: Date = new Date()): SLAStatus {
    if (!dueAt) return 'ok';
    const diffMs = dueAt.getTime() - now.getTime();
    if (diffMs < 0) return 'breached';
    const diffMinutes = diffMs / (1000 * 60);
    // Warning if less than 25% of time remaining
    return diffMinutes < 30 ? 'warning' : 'ok';
  }

  static calculateDueDate(createdAt: Date, policy: SLAPolicy, type: 'firstResponse' | 'resolution'): Date {
    const minutes = type === 'firstResponse' ? policy.firstResponseMinutes : policy.resolutionMinutes;
    return new Date(createdAt.getTime() + minutes * 60 * 1000);
  }
}
