import type { IKBCategoryRepository } from '@/domain/knowledge-base/repositories/IKBCategoryRepository';
import type { KBCategoryProps } from '@/domain/knowledge-base/entities/KBCategory';

export class MockKBCategoryRepository implements IKBCategoryRepository {
  private categories: KBCategoryProps[] = [];

  async list(): Promise<KBCategoryProps[]> {
    return [...this.categories];
  }

  async create(props: Omit<KBCategoryProps, 'id'>): Promise<KBCategoryProps> {
    const cat = { ...props, id: `kbcat-${Date.now()}` };
    this.categories.push(cat);
    return cat;
  }

  async update(id: string, changes: Partial<KBCategoryProps>): Promise<KBCategoryProps> {
    const idx = this.categories.findIndex(c => c.id === id);
    if (idx === -1) throw new Error(`Category ${id} not found`);
    this.categories[idx] = { ...this.categories[idx], ...changes };
    return this.categories[idx];
  }

  async delete(id: string): Promise<void> {
    this.categories = this.categories.filter(c => c.id !== id);
  }
}
