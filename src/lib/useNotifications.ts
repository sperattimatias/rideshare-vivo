import { useState, useEffect } from 'react';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Database } from './database.types';
import { mapNotificationRowToUI, type UINotification } from './notificationModels';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<UINotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();
    const unsubscribe = subscribeToNotifications();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const fetchNotifications = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data ?? []).map(mapNotificationRowToUI));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!userId) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresInsertPayload<NotificationRow>) => {
          const newNotification = mapNotificationRowToUI(payload.new);
          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase.rpc('mark_all_notifications_as_read');

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
