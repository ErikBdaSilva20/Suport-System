
-- 1) Generated tsvector column with weights (title=A, content=B) in portuguese
ALTER TABLE public.kb_articles
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(content, '')), 'B')
  ) STORED;

-- 2) GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS kb_articles_search_vector_idx
  ON public.kb_articles USING GIN (search_vector);

-- 3) Search function used by the ticket suggestion sidebar
CREATE OR REPLACE FUNCTION public.search_kb_articles(query text, max_results int DEFAULT 5)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  content text,
  status article_status,
  category_id uuid,
  author_id uuid,
  last_edited_by uuid,
  is_public boolean,
  view_count int,
  created_at timestamptz,
  updated_at timestamptz,
  rank real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT plainto_tsquery('portuguese', coalesce(query, '')) AS tsq
  )
  SELECT a.id, a.slug, a.title, a.content, a.status, a.category_id, a.author_id,
         a.last_edited_by, a.is_public, a.view_count, a.created_at, a.updated_at,
         ts_rank(a.search_vector, q.tsq) AS rank
  FROM public.kb_articles a, q
  WHERE a.status = 'published'
    AND a.is_public = true
    AND q.tsq <> ''::tsquery
    AND a.search_vector @@ q.tsq
  ORDER BY rank DESC, a.updated_at DESC
  LIMIT greatest(1, coalesce(max_results, 5));
$$;

GRANT EXECUTE ON FUNCTION public.search_kb_articles(text, int) TO authenticated, anon, service_role;
