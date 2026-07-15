import { useState } from 'react';
import { SendMessageUseCase } from '@/application/ticketing/SendMessageUseCase';
import type { CreateMessageProps } from '@/domain/ticketing/repositories/ITicketMessageRepository';

export function useSendMessage() {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (props: CreateMessageProps) => {
    setIsLoading(true);
    try {
      const uc = new SendMessageUseCase();
      return await uc.execute(props);
    } finally {
      setIsLoading(false);
    }
  };

  return { sendMessage, isLoading };
}
