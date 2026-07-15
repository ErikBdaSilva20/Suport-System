import { describe, it, expect } from 'vitest';
import { SLACalculator } from './SLACalculator';
import type { SLAPolicy } from '@/domain/settings/entities/SLAPolicy';

describe('SLACalculator', () => {
  describe('calculateStatus', () => {
    const now = new Date('2025-01-15T10:00:00Z');

    it('returns ok when dueAt is null', () => {
      expect(SLACalculator.calculateStatus(null, now)).toBe('ok');
    });

    it('returns ok when dueAt is undefined', () => {
      expect(SLACalculator.calculateStatus(undefined, now)).toBe('ok');
    });

    it('returns breached when past due', () => {
      const pastDue = new Date('2025-01-15T09:00:00Z');
      expect(SLACalculator.calculateStatus(pastDue, now)).toBe('breached');
    });

    it('returns warning when less than 30 minutes remaining', () => {
      const soonDue = new Date('2025-01-15T10:20:00Z');
      expect(SLACalculator.calculateStatus(soonDue, now)).toBe('warning');
    });

    it('returns ok when more than 30 minutes remaining', () => {
      const farDue = new Date('2025-01-15T12:00:00Z');
      expect(SLACalculator.calculateStatus(farDue, now)).toBe('ok');
    });
  });

  describe('calculateDueDate', () => {
    it('adds firstResponseMinutes to createdAt', () => {
      const createdAt = new Date('2025-01-15T10:00:00Z');
      const policy = { firstResponseMinutes: 60, resolutionMinutes: 480 } as SLAPolicy;
      const due = SLACalculator.calculateDueDate(createdAt, policy, 'firstResponse');
      expect(due.getTime()).toBe(createdAt.getTime() + 60 * 60 * 1000);
    });

    it('adds resolutionMinutes to createdAt', () => {
      const createdAt = new Date('2025-01-15T10:00:00Z');
      const policy = { firstResponseMinutes: 60, resolutionMinutes: 480 } as SLAPolicy;
      const due = SLACalculator.calculateDueDate(createdAt, policy, 'resolution');
      expect(due.getTime()).toBe(createdAt.getTime() + 480 * 60 * 1000);
    });
  });
});
