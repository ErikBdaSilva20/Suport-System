import { useState, useEffect, useCallback } from 'react';
import { ManageTagsUseCase } from '@/application/settings/ManageTagsUseCase';
import type { Tag } from '@/domain/settings/entities/Tag';

export function useTags() {
  const [data, setData] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const uc = new ManageTagsUseCase();

  const fetch = useCallback(async () => {
    setIsLoading(true);
    const result = await uc.list();
    setData(result);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, refetch: fetch };
}
