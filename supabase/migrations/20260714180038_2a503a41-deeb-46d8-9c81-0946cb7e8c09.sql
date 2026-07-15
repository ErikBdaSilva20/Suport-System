ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ai_summary text;

CREATE INDEX IF NOT EXISTS tickets_fts_pt_idx
ON public.tickets
USING gin (to_tsvector('portuguese', coalesce(subject, '') || ' ' || coalesce(description, '')));