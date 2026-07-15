import type { IKBArticleRepository, KBArticleFilters } from '@/domain/knowledge-base/repositories/IKBArticleRepository';
import { KBArticle, type KBArticleProps } from '@/domain/knowledge-base/entities/KBArticle';

export class MockKBArticleRepository implements IKBArticleRepository {
  private articles: KBArticleProps[] = [];

  async findById(id: string): Promise<KBArticle | null> {
    const a = this.articles.find(a => a.id === id);
    return a ? KBArticle.create(a) : null;
  }

  async findBySlug(slug: string): Promise<KBArticle | null> {
    const a = this.articles.find(a => a.slug === slug);
    return a ? KBArticle.create(a) : null;
  }

  async list(filters?: KBArticleFilters): Promise<KBArticle[]> {
    let result = [...this.articles];
    if (filters?.status) result = result.filter(a => a.status === filters.status);
    if (filters?.categoryId) result = result.filter(a => a.categoryId === filters.categoryId);
    if (filters?.onlyPublic) result = result.filter(a => a.isPublic);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(a => a.title.toLowerCase().includes(s) || a.content.toLowerCase().includes(s));
    }
    return result.map(a => KBArticle.create(a));
  }

  async searchSimilar(subject: string, limit = 5): Promise<KBArticle[]> {
    const words = subject.toLowerCase().split(/\s+/);
    return this.articles
      .filter(a => a.status === 'published' && words.some(w => a.title.toLowerCase().includes(w)))
      .slice(0, limit)
      .map(a => KBArticle.create(a));
  }

  async create(props: Omit<KBArticleProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<KBArticle> {
    const article: KBArticleProps = { ...props, id: `kb-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
    this.articles.push(article);
    return KBArticle.create(article);
  }

  async update(id: string, changes: Partial<KBArticleProps>): Promise<KBArticle> {
    const idx = this.articles.findIndex(a => a.id === id);
    if (idx === -1) throw new Error(`Article ${id} not found`);
    this.articles[idx] = { ...this.articles[idx], ...changes, updatedAt: new Date() };
    return KBArticle.create(this.articles[idx]);
  }

  async publish(id: string, publishedBy: string): Promise<KBArticle> {
    return this.update(id, { status: 'published', lastEditedBy: publishedBy });
  }

  async archive(id: string): Promise<KBArticle> {
    return this.update(id, { status: 'archived' });
  }

  async incrementViewCount(id: string): Promise<void> {
    const idx = this.articles.findIndex(a => a.id === id);
    if (idx !== -1) this.articles[idx].viewCount++;
  }
}
