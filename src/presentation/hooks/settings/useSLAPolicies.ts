import { useState, useEffect, useCallback } from 'react';
import { getSLAPolicyRepository } from '@/infrastructure/registries/settings';
import type { SLAPolicy } from '@/domain/settings/entities/SLAPolicy';

export function useSLAPolicies() {
  const [data, setData] = useState<SLAPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    const result = await getSLAPolicyRepository().list();
    setData(result);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, refetch: fetch };
}
