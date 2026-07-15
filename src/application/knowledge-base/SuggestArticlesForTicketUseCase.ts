import { getKBArticleRepository } from '@/infrastructure/registries/knowledge-base';
import type { KBArticle } from '@/domain/knowledge-base/entities/KBArticle';

export class SuggestArticlesForTicketUseCase {
  async execute(subject: string, limit = 5): Promise<KBArticle[]> {
    return getKBArticleRepository().searchSimilar(subject, limit);
  }
}
