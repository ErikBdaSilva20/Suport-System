import type { KBArticle, KBArticleProps } from '../entities/KBArticle';
import type { ArticleStatus } from '../value-objects/ArticleStatus';

export interface KBArticleFilters {
  status?: ArticleStatus;
  categoryId?: string;
  search?: string;
  onlyPublic?: boolean;
}

export interface IKBArticleReader {
  findById(id: string): Promise<KBArticle | null>;
  findBySlug(slug: string): Promise<KBArticle | null>;
  list(filters?: KBArticleFilters): Promise<KBArticle[]>;
  searchSimilar(subject: string, limit?: number): Promise<KBArticle[]>;
}

export interface IKBArticleWriter {
  create(props: Omit<KBArticleProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<KBArticle>;
  update(id: string, changes: Partial<KBArticleProps>): Promise<KBArticle>;
  publish(id: string, publishedBy: string): Promise<KBArticle>;
  archive(id: string): Promise<KBArticle>;
  incrementViewCount(id: string): Promise<void>;
}

export interface IKBArticleRepository extends IKBArticleReader, IKBArticleWriter {}
