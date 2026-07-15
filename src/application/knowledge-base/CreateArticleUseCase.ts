import { getKBArticleRepository } from '@/infrastructure/registries/knowledge-base';
import type { KBArticle, KBArticleProps } from '@/domain/knowledge-base/entities/KBArticle';

export class CreateArticleUseCase {
  async execute(props: Omit<KBArticleProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<KBArticle> {
    return getKBArticleRepository().create(props);
  }
}
