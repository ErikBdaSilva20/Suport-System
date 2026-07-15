import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTickets } from './useTickets';
import { MockTicketRepository } from '@/infrastructure/mock/MockTicketRepository';
import { MockCustomerRepository } from '@/infrastructure/mock/MockCustomerRepository';
import { MockProfileRepository } from '@/infrastructure/mock/MockProfileRepository';
import { _setTicketRepository } from '@/infrastructure/registries/ticketing';
import { _setCustomerRepository } from '@/infrastructure/registries/customer-portal';
import { _setProfileRepository } from '@/infrastructure/registries/identity';
import { createWrapper } from '@/test/testUtils';

describe('useTickets', () => {
  beforeEach(() => {
    _setTicketRepository(new MockTicketRepository());
    _setCustomerRepository(new MockCustomerRepository());
    _setProfileRepository(new MockProfileRepository());
  });

  it('returns all tickets without filters', async () => {
    const { result } = renderHook(() => useTickets({}), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });
    expect(result.current.data!.tickets.length).toBeGreaterThan(0);
  });

  it('filters by status', async () => {
    const { result } = renderHook(() => useTickets({ status: ['open'] }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });
    result.current.data!.tickets.forEach(t => expect(t.status).toBe('open'));
  });

  it('filters by search', async () => {
    const { result } = renderHook(() => useTickets({ search: 'zzznotfound' }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });
    expect(result.current.data!.tickets.length).toBe(0);
  });
});
