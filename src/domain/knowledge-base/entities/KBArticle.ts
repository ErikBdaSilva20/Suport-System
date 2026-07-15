import type { ArticleStatus } from '../value-objects/ArticleStatus';

export interface KBArticleProps {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: ArticleStatus;
  categoryId: string;
  authorId: string;
  lastEditedBy?: string | null;
  isPublic: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class KBArticle {
  private constructor(private readonly props: KBArticleProps) {}

  static create(props: KBArticleProps): KBArticle {
    return new KBArticle(props);
  }

  get id() { return this.props.id; }
  get status() { return this.props.status; }

  isPublished(): boolean {
    return this.props.status === 'published' && this.props.isPublic;
  }

  toPlainObject(): KBArticleProps {
    return { ...this.props };
  }
}
