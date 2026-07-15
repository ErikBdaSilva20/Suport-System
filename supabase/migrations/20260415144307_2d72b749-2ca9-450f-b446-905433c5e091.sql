
-- ============================
-- ENUMS
-- ============================
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'pending', 'waiting_customer', 'resolved', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.ticket_channel AS ENUM ('email', 'portal', 'chat', 'phone', 'api');
CREATE TYPE public.message_type AS ENUM ('public_reply', 'internal_note', 'system');
CREATE TYPE public.message_sender_type AS ENUM ('agent', 'customer', 'system');
CREATE TYPE public.user_role AS ENUM ('admin', 'agent');
CREATE TYPE public.article_status AS ENUM ('draft', 'published', 'archived');

-- ============================
-- TABLES
-- ============================

CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Help Desk',
  company_logo_url text,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  business_hours_start text NOT NULL DEFAULT '09:00',
  business_hours_end text NOT NULL DEFAULT '18:00',
  business_days integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  support_email text NOT NULL DEFAULT 'suporte@empresa.com',
  portal_welcome_message text,
  primary_color text NOT NULL DEFAULT '#1A5276',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'agent',
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  company text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#6B7280'
);

CREATE TABLE public.sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority public.ticket_priority NOT NULL UNIQUE,
  first_response_minutes integer NOT NULL,
  resolution_minutes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number serial NOT NULL UNIQUE,
  subject text NOT NULL,
  description text NOT NULL DEFAULT '',
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  channel public.ticket_channel NOT NULL DEFAULT 'portal',
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  assigned_agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sla_status text NOT NULL DEFAULT 'ok',
  sla_first_response_due timestamptz,
  sla_resolution_due timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  email_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_status_priority ON public.tickets(status, priority);
CREATE INDEX idx_tickets_assigned ON public.tickets(assigned_agent_id);
CREATE INDEX idx_tickets_customer ON public.tickets(customer_id);

CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_type public.message_sender_type NOT NULL,
  sender_id uuid,
  sender_name text NOT NULL,
  sender_avatar text,
  message_type public.message_type NOT NULL DEFAULT 'public_reply',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_ticket ON public.ticket_messages(ticket_id);

CREATE TABLE public.ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_message_id uuid NOT NULL REFERENCES public.ticket_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  content_type text NOT NULL DEFAULT 'application/octet-stream'
);

CREATE TABLE public.ticket_tags (
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

CREATE TABLE public.kb_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  status public.article_status NOT NULL DEFAULT 'draft',
  category_id uuid NOT NULL REFERENCES public.kb_categories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  last_edited_by uuid REFERENCES public.profiles(id),
  is_public boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_articles_fts ON public.kb_articles USING gin(to_tsvector('portuguese', title || ' ' || content));

CREATE TABLE public.csat_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_ticket ON public.audit_log(ticket_id);

-- ============================
-- HELPER FUNCTIONS
-- ============================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  )
$$;

-- ============================
-- RLS
-- ============================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can view active profiles" ON public.profiles FOR SELECT USING (public.is_agent() AND is_active = true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can do everything with customers" ON public.customers FOR ALL USING (public.is_agent());
CREATE POLICY "Customers can view own record" ON public.customers FOR SELECT USING (auth_user_id = auth.uid());

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can do everything with tickets" ON public.tickets FOR ALL USING (public.is_agent());
CREATE POLICY "Customers can view own tickets" ON public.tickets FOR SELECT USING (customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid()));

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can do everything with messages" ON public.ticket_messages FOR ALL USING (public.is_agent());
CREATE POLICY "Customers can view public messages on own tickets" ON public.ticket_messages FOR SELECT USING (message_type != 'internal_note' AND ticket_id IN (SELECT t.id FROM public.tickets t JOIN public.customers c ON c.id = t.customer_id WHERE c.auth_user_id = auth.uid()));

ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can manage attachments" ON public.ticket_attachments FOR ALL USING (public.is_agent());

ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can manage ticket tags" ON public.ticket_tags FOR ALL USING (public.is_agent());

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view tags" ON public.tags FOR SELECT USING (public.is_agent());
CREATE POLICY "Admins can manage tags" ON public.tags FOR ALL USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view SLA policies" ON public.sla_policies FOR SELECT USING (public.is_agent());
CREATE POLICY "Admins can manage SLA policies" ON public.sla_policies FOR ALL USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view settings" ON public.settings FOR SELECT USING (public.is_agent());
CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view KB categories" ON public.kb_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage KB categories" ON public.kb_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published public articles" ON public.kb_articles FOR SELECT USING (status = 'published' AND is_public = true);
CREATE POLICY "Agents can view all articles" ON public.kb_articles FOR SELECT USING (public.is_agent());
CREATE POLICY "Agents can manage articles" ON public.kb_articles FOR ALL USING (public.is_agent());

ALTER TABLE public.csat_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view CSAT responses" ON public.csat_responses FOR SELECT USING (public.is_agent());
CREATE POLICY "Anyone can submit CSAT by token" ON public.csat_responses FOR UPDATE USING (true) WITH CHECK (submitted_at IS NOT NULL AND rating IS NOT NULL);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view audit log" ON public.audit_log FOR SELECT USING (public.is_agent());
CREATE POLICY "System can insert audit log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- ============================
-- TRIGGERS
-- ============================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_sla_policies_updated_at BEFORE UPDATE ON public.sla_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_kb_articles_updated_at BEFORE UPDATE ON public.kb_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email, 'agent');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_created();

CREATE OR REPLACE FUNCTION public.on_ticket_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sla record;
BEGIN
  SELECT first_response_minutes, resolution_minutes INTO sla FROM public.sla_policies WHERE priority = NEW.priority;
  IF FOUND THEN
    NEW.sla_first_response_due = NEW.created_at + (sla.first_response_minutes || ' minutes')::interval;
    NEW.sla_resolution_due = NEW.created_at + (sla.resolution_minutes || ' minutes')::interval;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_ticket_sla_on_create BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.on_ticket_created();

CREATE OR REPLACE FUNCTION public.on_ticket_status_changed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN NEW.resolved_at = now(); END IF;
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN NEW.closed_at = now(); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_ticket_status_changed BEFORE UPDATE OF status ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.on_ticket_status_changed();

CREATE OR REPLACE FUNCTION public.on_ticket_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE agent_name text;
BEGIN
  IF NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id THEN
    SELECT full_name INTO agent_name FROM public.profiles WHERE id = NEW.assigned_agent_id;
    INSERT INTO public.audit_log (ticket_id, user_name, action, details)
    VALUES (NEW.id, COALESCE(agent_name, 'Sistema'), 'assigned', 'Ticket atribuído para ' || COALESCE(agent_name, 'ninguém'));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_ticket_assigned AFTER UPDATE OF assigned_agent_id ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.on_ticket_assigned();

CREATE OR REPLACE FUNCTION public.on_message_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sender_type = 'agent' AND NEW.message_type = 'public_reply' THEN
    UPDATE public.tickets SET first_response_at = COALESCE(first_response_at, now()) WHERE id = NEW.ticket_id AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_message_first_response AFTER INSERT ON public.ticket_messages FOR EACH ROW EXECUTE FUNCTION public.on_message_created();

-- ============================
-- STORAGE
-- ============================

INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('kb-images', 'kb-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

CREATE POLICY "Agents can upload ticket attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ticket-attachments' AND public.is_agent());
CREATE POLICY "Agents can view ticket attachments" ON storage.objects FOR SELECT USING (bucket_id = 'ticket-attachments' AND public.is_agent());
CREATE POLICY "Agents can upload KB images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kb-images' AND public.is_agent());
CREATE POLICY "Anyone can view KB images" ON storage.objects FOR SELECT USING (bucket_id = 'kb-images');
CREATE POLICY "Admins can upload company assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view company assets" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');

-- ============================
-- SEED: Default SLA policies
-- ============================

INSERT INTO public.sla_policies (priority, first_response_minutes, resolution_minutes) VALUES
  ('urgent', 60, 240),
  ('high', 120, 480),
  ('medium', 240, 1440),
  ('low', 480, 2880);

-- Seed default settings
INSERT INTO public.settings (company_name) VALUES ('Help Desk');
