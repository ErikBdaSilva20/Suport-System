import { useState, useEffect, useCallback } from 'react';
import { SuggestArticlesForTicketUseCase } from '@/application/knowledge-base/SuggestArticlesForTicketUseCase';
import type { KBArticleProps } from '@/domain/knowledge-base/entities/KBArticle';

export function useKBSuggestions(subject: string) {
  const [data, setData] = useState<KBArticleProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!subject) return;
    setIsLoading(true);
    const uc = new SuggestArticlesForTicketUseCase();
    const result = await uc.execute(subject);
    setData(result.map(a => a.toPlainObject()));
    setIsLoading(false);
  }, [subject]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading };
}
