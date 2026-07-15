export interface KBCategoryProps {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  sortOrder: number;
}
