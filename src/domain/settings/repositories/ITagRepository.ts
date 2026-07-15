import type { Tag } from '../entities/Tag';

export interface ITagRepository {
  list(): Promise<Tag[]>;
  create(tag: Omit<Tag, 'id'>): Promise<Tag>;
  update(id: string, changes: Partial<Omit<Tag, 'id'>>): Promise<Tag>;
  delete(id: string): Promise<void>;
}
