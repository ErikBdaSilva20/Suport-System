export const ARTICLE_STATUS = ['draft', 'published', 'archived'] as const;
export type ArticleStatus = typeof ARTICLE_STATUS[number];
