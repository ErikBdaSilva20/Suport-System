import type { KBCategoryProps } from '../entities/KBCategory';

export interface IKBCategoryRepository {
  list(): Promise<KBCategoryProps[]>;
  create(props: Omit<KBCategoryProps, 'id'>): Promise<KBCategoryProps>;
  update(id: string, changes: Partial<KBCategoryProps>): Promise<KBCategoryProps>;
  delete(id: string): Promise<void>;
}
