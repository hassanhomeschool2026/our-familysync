import React from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFamily } from '@/lib/familyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export default function NotificationBell() {
  const { currentUser } = useFamily();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser?.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!currentUser?.id,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Link to="/notifications" className="relative p-2 rounded-full hover:bg-secondary transition-colors">
      <Bell className="w-5 h-5 text-foreground" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center min-w-[18px] h-[18px] px-1">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}