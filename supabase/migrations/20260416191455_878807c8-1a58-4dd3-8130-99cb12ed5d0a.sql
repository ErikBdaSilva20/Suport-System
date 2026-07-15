-- 1. priority_rules table
CREATE TABLE public.priority_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  priority public.ticket_priority NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  intent_description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.priority_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view priority rules"
  ON public.priority_rules FOR SELECT
  USING (public.is_agent());

CREATE POLICY "Admins can manage priority rules"
  ON public.priority_rules FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE TRIGGER trg_priority_rules_updated_at
  BEFORE UPDATE ON public.priority_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. automation flags in settings
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS ai_classify_priority BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_auto_first_response BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_priority_min_confidence NUMERIC NOT NULL DEFAULT 0.6;