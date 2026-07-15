import type { ITagRepository } from '@/domain/settings/repositories/ITagRepository';
import type { Tag } from '@/domain/settings/entities/Tag';
import { mockTickets } from '@/data/mockData';

function extractTags(): Tag[] {
  const unique = new Set<string>();
  mockTickets.forEach(t => t.tags.forEach(tag => unique.add(tag)));
  return Array.from(unique).map((name, i) => ({ id: `tag-${i + 1}`, name, color: '#6B7280' }));
}

export class MockTagRepository implements ITagRepository {
  private tags: Tag[] = extractTags();

  async list(): Promise<Tag[]> {
    return [...this.tags];
  }

  async create(tag: Omit<Tag, 'id'>): Promise<Tag> {
    const created = { ...tag, id: `tag-${Date.now()}` };
    this.tags.push(created);
    return created;
  }

  async update(id: string, changes: Partial<Omit<Tag, 'id'>>): Promise<Tag> {
    const idx = this.tags.findIndex(t => t.id === id);
    if (idx === -1) throw new Error(`Tag ${id} not found`);
    this.tags[idx] = { ...this.tags[idx], ...changes };
    return this.tags[idx];
  }

  async delete(id: string): Promise<void> {
    this.tags = this.tags.filter(t => t.id !== id);
  }
}
