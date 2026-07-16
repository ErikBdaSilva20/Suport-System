import { useCallback, useEffect, useState } from 'react';
import { listTickets } from '@/lib/data/tickets.repo';
import { listCustomers } from '@/lib/data/customers.repo';
import type { Ticket } from '@/lib/data/tickets.repo';
import type { Customer } from '@/lib/data/customers.repo';
import { useToast } from '@/hooks/use-toast';

interface TicketsAndCustomers {
  tickets: Ticket[];
  customers: Customer[];
  isLoading: boolean;
  reload: () => Promise<void>;
}

// Tickets e clientes são buscados juntos em praticamente toda tela (list-then-find,
// NFR8). Um `Promise.all` ingênuo faz a falha de um fetch esconder o sucesso do
// outro (ex: tickets falha => clientes que já tinham carregado nunca chegam a
// aparecer) — aqui os dois falham/renderizam de forma independente.
export function useTicketsAndCustomers(): TicketsAndCustomers {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const [ticketsResult, customersResult] = await Promise.allSettled([listTickets(), listCustomers()]);

    if (ticketsResult.status === 'fulfilled') {
      setTickets(ticketsResult.value);
    } else {
      toast({ title: 'Erro ao carregar tickets', description: ticketsResult.reason.message, variant: 'destructive' });
    }

    if (customersResult.status === 'fulfilled') {
      setCustomers(customersResult.value);
    } else {
      toast({ title: 'Erro ao carregar clientes', description: customersResult.reason.message, variant: 'destructive' });
    }

    setIsLoading(false);
  }, [toast]);

  useEffect(() => { reload(); }, [reload]);

  return { tickets, customers, isLoading, reload };
}
