import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, CheckCircle2, MapPin, Megaphone, Check } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonCard from '@/components/shared/SkeletonCard';
import { formatDistanceToNow } from 'date-fns';

const typeIcons = {
  event_reminder: Calendar,
  task_due: CheckCircle2,
  checkin: MapPin,
  family_alert: Megaphone,
  general: Bell,
};

function notifAccent(type) {
  if (type === 'family_alert') return 'rgba(127, 48, 203, 0.38)';
  return 'rgba(47, 157, 182, 0.32)';
}

export default function NotificationsPage() {
  const { currentUser } = useFamily();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
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
  });

  const markRead = useMutation({
    mutationFn: async (id) => {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser?.id)
        .eq('read', false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <SkeletonCard count={4} />;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl font-bold">Notifications</h2>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} className="text-xs">
            <Check className="w-3 h-3 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState emoji="🔔" title="All quiet" description="You're all caught up! No notifications yet." />
      ) : (
        <div className="space-y-1">
          {notifications.map((notif) => {
            const Icon = typeIcons[notif.type] || Bell;
            return (
              <button
                key={notif.id}
                onClick={() => !notif.read && markRead.mutate(notif.id)}
                className={`flex items-start gap-3 w-full text-left p-3 rounded-xl transition-colors pl-2.5 border-l-[3px] ${
                  notif.read ? 'opacity-60' : 'bg-[rgba(47,157,182,0.06)]'
                }`}
                style={{ borderLeftColor: notifAccent(notif.type) }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notif.read ? 'bg-muted' : 'bg-primary/10'
                }`}>
                  <Icon className={`w-4 h-4 ${notif.read ? 'text-muted-foreground' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'font-medium'}`}>{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notif.read && <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}