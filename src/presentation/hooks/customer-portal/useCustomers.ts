import { useState, useEffect, useCallback } from 'react';
import { getCustomerRepository } from '@/infrastructure/registries/customer-portal';
import { getTicketRepository } from '@/infrastructure/registries/ticketing';
import type { Customer, Ticket } from '@/types';
import type { Customer as CustomerEntity } from '@/domain/customer-portal/entities/Customer';

function entityToView(entity: CustomerEntity): Customer {
  const p = entity.toPlainObject();
  return {
    id: p.id, name: p.fullName, email: p.email,
    phone: p.phone ?? undefined, company: p.company ?? undefined,
    created_at: p.createdAt.toISOString(),
  };
}

export function useCustomers(search?: string) {
  const [data, setData] = useState<{ customers: Customer[]; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    const repo = getCustomerRepository();
    const result = await repo.list({ search });
    setData({ customers: result.customers.map(entityToView), total: result.total });
    setIsLoading(false);
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, refetch: fetch };
}

export interface CustomerDetailData {
  customer: Customer;            // primary contact (first)
  contacts: Customer[];          // all contacts in the company (incl. primary)
  tickets: Ticket[];             // aggregated tickets across all contacts
}

export function useCustomerDetail(id: string | undefined) {
  const [data, setData] = useState<CustomerDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    const repo = getCustomerRepository();
    const entity = await repo.findById(id);
    if (!entity) { setData(null); setIsLoading(false); return; }
    const primary = entityToView(entity);

    // Load all contacts for the same company (if customer has a company)
    let contacts: Customer[] = [primary];
    if (primary.company) {
      const sameCompany = await repo.findByCompany(primary.company);
      const views = sameCompany.map(entityToView);
      // ensure primary first, dedupe
      contacts = [primary, ...views.filter(c => c.id !== primary.id)];
    }

    // Load tickets for all contacts in parallel
    const ticketRepo = getTicketRepository();
    const ticketResults = await Promise.all(
      contacts.map(c => ticketRepo.list({ customerId: c.id }))
    );
    const tickets: Ticket[] = ticketResults.flatMap(r => r.tickets.map(t => {
      const tp = t.toPlainObject();
      return {
        id: tp.id, number: tp.number, subject: tp.subject,
        status: tp.status, priority: tp.priority, channel: tp.channel,
        customer_id: tp.customerId,
        assigned_agent_id: tp.assignedAgentId ?? undefined,
        tags: tp.tagIds, sla_status: tp.slaStatus,
        sla_due_at: tp.slaFirstResponseDue?.toISOString(),
        created_at: tp.createdAt.toISOString(),
        updated_at: tp.updatedAt.toISOString(),
        resolved_at: tp.resolvedAt?.toISOString(),
        first_response_at: tp.firstResponseAt?.toISOString(),
      };
    }));
    tickets.sort((a, b) => b.created_at.localeCompare(a.created_at));

    setData({ customer: primary, contacts, tickets });
    setIsLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, isLoading, refetch: fetchData };
}
