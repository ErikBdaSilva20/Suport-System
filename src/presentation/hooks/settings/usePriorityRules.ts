import { useCallback, useEffect, useState } from 'react';
import { ManagePriorityRulesUseCase } from '@/application/settings/ManagePriorityRulesUseCase';
import type { PriorityRule } from '@/domain/settings/entities/PriorityRule';

export function usePriorityRules() {
  const [data, setData] = useState<PriorityRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const uc = new ManagePriorityRulesUseCase();

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      setData(await uc.list());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return {
    data,
    isLoading,
    refetch,
    save: async (rule: Omit<PriorityRule, 'id'> & { id?: string }) => {
      await uc.save(rule);
      await refetch();
    },
    remove: async (id: string) => {
      await uc.remove(id);
      await refetch();
    },
  };
}
