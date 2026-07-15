import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/presentation/context/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  ticket_id: string | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { session } = useAuthContext();
  const userId = session?.user?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { refetch(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refetch]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
    refetch();
  }, [userId, refetch]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch };
}
