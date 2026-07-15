import { getKBArticleRepository } from '@/infrastructure/registries/knowledge-base';
import type { KBArticle } from '@/domain/knowledge-base/entities/KBArticle';

export class PublishArticleUseCase {
  async execute(articleId: string, publishedBy: string): Promise<KBArticle> {
    return getKBArticleRepository().publish(articleId, publishedBy);
  }
}
