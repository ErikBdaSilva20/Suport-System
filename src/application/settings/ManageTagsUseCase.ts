import { getTagRepository } from '@/infrastructure/registries/settings';
import type { Tag } from '@/domain/settings/entities/Tag';

export class ManageTagsUseCase {
  async list(): Promise<Tag[]> {
    return getTagRepository().list();
  }

  async create(tag: Omit<Tag, 'id'>): Promise<Tag> {
    return getTagRepository().create(tag);
  }

  async update(id: string, changes: Partial<Omit<Tag, 'id'>>): Promise<Tag> {
    return getTagRepository().update(id, changes);
  }

  async delete(id: string): Promise<void> {
    return getTagRepository().delete(id);
  }
}
