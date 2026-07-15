import { useState } from 'react';
import { CreateTicketUseCase } from '@/application/ticketing/CreateTicketUseCase';
import type { CreateTicketProps } from '@/domain/ticketing/repositories/ITicketRepository';

export function useCreateTicket() {
  const [isLoading, setIsLoading] = useState(false);

  const createTicket = async (props: CreateTicketProps) => {
    setIsLoading(true);
    try {
      const uc = new CreateTicketUseCase();
      return await uc.execute(props);
    } finally {
      setIsLoading(false);
    }
  };

  return { createTicket, isLoading };
}
