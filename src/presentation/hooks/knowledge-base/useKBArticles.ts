import { useState, useEffect, useCallback } from 'react';
import { SearchArticlesUseCase } from '@/application/knowledge-base/SearchArticlesUseCase';
import type { KBArticleFilters } from '@/domain/knowledge-base/repositories/IKBArticleRepository';
import type { KBArticleProps } from '@/domain/knowledge-base/entities/KBArticle';

export function useKBArticles(filters?: KBArticleFilters) {
  const [data, setData] = useState<KBArticleProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    const uc = new SearchArticlesUseCase();
    const result = await uc.execute(filters);
    setData(result.map(a => a.toPlainObject()));
    setIsLoading(false);
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, refetch: fetch };
}
