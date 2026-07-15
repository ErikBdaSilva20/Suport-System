import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KBConversationSummary {
  id: string;
  title: string;
  updated_at: string;
}

export function useKBConversations() {
  const [conversations, setConversations] = useState<KBConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('kb_conversations')
      .select('id,title,updated_at')
      .order('updated_at', { ascending: false });
    setConversations(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('kb_conversations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kb_conversations' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const rename = useCallback(async (id: string, title: string) => {
    await supabase.from('kb_conversations').update({ title }).eq('id', id);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
  }, []);

  const remove = useCallback(async (id: string) => {
    await supabase.from('kb_conversations').delete().eq('id', id);
    setConversations(prev => prev.filter(c => c.id !== id));
  }, []);

  return { conversations, loading, rename, remove, reload: load };
}
