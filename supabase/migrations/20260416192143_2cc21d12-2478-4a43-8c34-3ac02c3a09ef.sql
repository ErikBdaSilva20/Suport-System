
-- Tabela de conversas
CREATE TABLE public.kb_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_conversations_user_updated ON public.kb_conversations(user_id, updated_at DESC);

ALTER TABLE public.kb_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations"
  ON public.kb_conversations FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access conversations"
  ON public.kb_conversations FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Tabela de mensagens
CREATE TABLE public.kb_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.kb_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL DEFAULT '',
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_messages_conv_created ON public.kb_conversation_messages(conversation_id, created_at);

ALTER TABLE public.kb_conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversation messages"
  ON public.kb_conversation_messages FOR ALL
  USING (conversation_id IN (SELECT id FROM public.kb_conversations WHERE user_id = auth.uid()))
  WITH CHECK (conversation_id IN (SELECT id FROM public.kb_conversations WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access messages"
  ON public.kb_conversation_messages FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Trigger: atualizar updated_at da conversa quando mensagem nova entra
CREATE OR REPLACE FUNCTION public.touch_kb_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.kb_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_kb_conversation
AFTER INSERT ON public.kb_conversation_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_kb_conversation();

-- Trigger: updated_at na conversa em UPDATE direto (rename)
CREATE TRIGGER trg_kb_conversations_updated_at
BEFORE UPDATE ON public.kb_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
