import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEmployees } from './useEmployees';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  description: string;
  color: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const { data: allEmployees } = useEmployees();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const email = user?.email;
  const actualEmployee = (allEmployees || []).find((e) => e.email === email);
  const userId = actualEmployee?.id;

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const fetchNotifications = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('dt_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
      } else if (isMounted && data) {
        setNotifications(data as Notification[]);
      }
      if (isMounted) setLoading(false);
    };

    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dt_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('REALTIME EVENT RECEIVED:', payload);
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification;
            if (!newNotif.is_read) {
              setNotifications((prev) => [newNotif, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as Notification;
            if (updatedNotif.is_read) {
              setNotifications((prev) => prev.filter((n) => n.id !== updatedNotif.id));
            } else {
              setNotifications((prev) => prev.map((n) => n.id === updatedNotif.id ? updatedNotif : n));
            }
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Supabase Realtime Status:', status);
        if (err) console.error('Supabase Realtime Error:', err);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    
    const { error } = await supabase
      .from('dt_notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    setNotifications([]);

    const { error } = await supabase
      .from('dt_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return { notifications, loading, markAsRead, markAllAsRead };
}
