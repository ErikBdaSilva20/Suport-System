import { supabase } from '@/integrations/supabase/client';
import type { IKBArticleRepository, KBArticleFilters } from '@/domain/knowledge-base/repositories/IKBArticleRepository';
import { KBArticle } from '@/domain/knowledge-base/entities/KBArticle';
import type { KBArticleProps } from '@/domain/knowledge-base/entities/KBArticle';
import type { Database } from '@/integrations/supabase/types';

type ArticleRow = Database['public']['Tables']['kb_articles']['Row'];

export class SupabaseKBArticleRepository implements IKBArticleRepository {
  private toEntity(row: ArticleRow): KBArticle {
    return KBArticle.create({
      id: row.id, slug: row.slug, title: row.title, content: row.content,
      status: row.status as KBArticleProps['status'], categoryId: row.category_id,
      authorId: row.author_id, lastEditedBy: row.last_edited_by, isPublic: row.is_public,
      viewCount: row.view_count, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    });
  }

  async findById(id: string) {
    const { data } = await supabase.from('kb_articles').select('*').eq('id', id).single();
    return data ? this.toEntity(data) : null;
  }

  async findBySlug(slug: string) {
    const { data } = await supabase.from('kb_articles').select('*').eq('slug', slug).single();
    return data ? this.toEntity(data) : null;
  }

  async list(filters?: KBArticleFilters) {
    let query = supabase.from('kb_articles').select('*');
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters?.onlyPublic) query = query.eq('is_public', true);
    if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    const { data } = await query.order('updated_at', { ascending: false });
    return (data ?? []).map(r => this.toEntity(r));
  }

  async searchSimilar(subject: string, limit = 5) {
    const query = (subject ?? '').trim();
    if (!query) return [];

    // Full-text search em português (reconhece variações da mesma raiz: validar/validação/validado).
    const { data: ftsData, error: ftsError } = await supabase
      .rpc('search_kb_articles', { query, max_results: limit });

    if (!ftsError && ftsData && ftsData.length > 0) {
      return (ftsData as unknown as ArticleRow[]).map((r) => this.toEntity(r));
    }

    // Fallback: se o FTS não retornou nada (ex.: só stopwords), tenta ILIKE literal.
    const { data } = await supabase.from('kb_articles').select('*')
      .eq('status', 'published').eq('is_public', true)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`).limit(limit);
    return (data ?? []).map((r) => this.toEntity(r));
  }

  async create(props: Omit<KBArticleProps, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase.from('kb_articles').insert({
      slug: props.slug, title: props.title, content: props.content, status: props.status,
      category_id: props.categoryId, author_id: props.authorId,
      is_public: props.isPublic, view_count: props.viewCount,
    }).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    return this.toEntity(data);
  }

  async update(id: string, changes: Partial<KBArticleProps>) {
    const { data, error } = await supabase.from('kb_articles').update({
      ...(changes.title !== undefined && { title: changes.title }),
      ...(changes.content !== undefined && { content: changes.content }),
      ...(changes.slug !== undefined && { slug: changes.slug }),
      ...(changes.status !== undefined && { status: changes.status }),
      ...(changes.categoryId !== undefined && { category_id: changes.categoryId }),
      ...(changes.isPublic !== undefined && { is_public: changes.isPublic }),
      ...(changes.lastEditedBy !== undefined && { last_edited_by: changes.lastEditedBy }),
    }).eq('id', id).select().single();
    if (error || !data) throw error ?? new Error('Failed');
    return this.toEntity(data);
  }

  async publish(id: string, publishedBy: string) {
    return this.update(id, { status: 'published', isPublic: true, lastEditedBy: publishedBy });
  }

  async archive(id: string) { return this.update(id, { status: 'archived' }); }

  async incrementViewCount(id: string) {
    const { data } = await supabase.from('kb_articles').select('view_count').eq('id', id).single();
    if (data) await supabase.from('kb_articles').update({ view_count: (data.view_count ?? 0) + 1 }).eq('id', id);
  }
}
