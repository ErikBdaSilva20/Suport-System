import { useState, useEffect } from 'react';
import { GetCurrentProfileUseCase } from '@/application/identity/GetCurrentProfileUseCase';
import type { ProfileProps } from '@/domain/identity/entities/Profile';

export function useCurrentProfile(userId: string) {
  const [data, setData] = useState<ProfileProps | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const uc = new GetCurrentProfileUseCase();
      const result = await uc.execute(userId);
      setData(result?.toPlainObject() ?? null);
      setIsLoading(false);
    };
    fetch();
  }, [userId]);

  return { data, isLoading };
}
