import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTicketsAndCustomers } from '@/hooks/use-tickets-and-customers';
import { listTickets } from '@/lib/data/tickets.repo';
import { listCustomers } from '@/lib/data/customers.repo';

vi.mock('@/lib/data/tickets.repo', () => ({ listTickets: vi.fn() }));
vi.mock('@/lib/data/customers.repo', () => ({ listCustomers: vi.fn() }));

const mockTicket = { id: 't1', customer_id: 'c1', subject: 'Test', status: 'open' } as any;
const mockCustomer = { id: 'c1', name: 'Cliente Teste' } as any;

describe('useTicketsAndCustomers', () => {
  beforeEach(() => {
    vi.mocked(listTickets).mockReset();
    vi.mocked(listCustomers).mockReset();
  });

  it('loads both resources on mount', async () => {
    vi.mocked(listTickets).mockResolvedValue([mockTicket]);
    vi.mocked(listCustomers).mockResolvedValue([mockCustomer]);

    const { result } = renderHook(() => useTicketsAndCustomers());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tickets).toEqual([mockTicket]);
    expect(result.current.customers).toEqual([mockCustomer]);
  });

  it('keeps customers visible even when the tickets fetch fails', async () => {
    vi.mocked(listTickets).mockRejectedValue(new Error('tickets down'));
    vi.mocked(listCustomers).mockResolvedValue([mockCustomer]);

    const { result } = renderHook(() => useTicketsAndCustomers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.customers).toEqual([mockCustomer]);
    expect(result.current.tickets).toEqual([]);
  });

  it('keeps tickets visible even when the customers fetch fails', async () => {
    vi.mocked(listTickets).mockResolvedValue([mockTicket]);
    vi.mocked(listCustomers).mockRejectedValue(new Error('customers down'));

    const { result } = renderHook(() => useTicketsAndCustomers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tickets).toEqual([mockTicket]);
    expect(result.current.customers).toEqual([]);
  });

  it('reload() refetches both resources', async () => {
    vi.mocked(listTickets).mockResolvedValue([]);
    vi.mocked(listCustomers).mockResolvedValue([]);

    const { result } = renderHook(() => useTicketsAndCustomers());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(listTickets).mockResolvedValue([mockTicket]);
    await act(() => result.current.reload());

    expect(result.current.tickets).toEqual([mockTicket]);
  });
});
