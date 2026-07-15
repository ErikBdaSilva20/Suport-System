import { getKBArticleRepository } from '@/infrastructure/registries/knowledge-base';
import type { KBArticle } from '@/domain/knowledge-base/entities/KBArticle';
import type { KBArticleFilters } from '@/domain/knowledge-base/repositories/IKBArticleRepository';

export class SearchArticlesUseCase {
  async execute(filters?: KBArticleFilters): Promise<KBArticle[]> {
    return getKBArticleRepository().list(filters);
  }
}
