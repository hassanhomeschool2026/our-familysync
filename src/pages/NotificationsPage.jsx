import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
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

const sectionHeaderBarStyle = {
  background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
  boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
};

const sectionHeaderOverlayStyle = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
};

const GRADIENT_HEADER_STAR_TWINKLE_CSS = `
@keyframes starTwinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
`;

const GRADIENT_HEADER_STARS = [
  { left: '5%', top: '25%', size: 1.8, delay: '0s', dur: '2.2s' },
  { left: '12%', top: '65%', size: 1.4, delay: '0.6s', dur: '3s' },
  { left: '22%', top: '30%', size: 2.2, delay: '1.1s', dur: '2.5s' },
  { left: '33%', top: '70%', size: 1.4, delay: '0.3s', dur: '2.8s' },
  { left: '45%', top: '20%', size: 1.8, delay: '1.5s', dur: '2s' },
  { left: '56%', top: '68%', size: 1.4, delay: '0.8s', dur: '3.2s' },
  { left: '66%', top: '28%', size: 2, delay: '0.4s', dur: '2.4s' },
  { left: '76%', top: '72%', size: 1.4, delay: '1.3s', dur: '2.7s' },
  { left: '86%', top: '35%', size: 2.2, delay: '0.2s', dur: '2.1s' },
  { left: '94%', top: '68%', size: 1.4, delay: '1.8s', dur: '3.1s' },
];

function GradientHeaderStarField() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        borderRadius: 'inherit',
        zIndex: 0,
      }}
    >
      {GRADIENT_HEADER_STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: '50%',
            background: 'white',
            animation: `starTwinkle ${s.dur} ease-in-out infinite`,
            animationDelay: s.delay,
            boxShadow: `0 0 ${s.size * 2}px rgba(255,255,255,0.8)`,
          }}
        />
      ))}
    </div>
  );
}

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
      <div
        className="relative mb-4 overflow-hidden rounded-xl"
        style={sectionHeaderBarStyle}
      >
        <GradientHeaderStarField />
        <style>{GRADIENT_HEADER_STAR_TWINKLE_CSS}</style>
        <div
          className="pointer-events-none absolute inset-0"
          style={sectionHeaderOverlayStyle}
          aria-hidden
        />
        <div className="relative z-[1] flex items-center justify-between gap-2">
          <h2 className="font-heading text-xl font-bold text-white">Notifications</h2>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              className="bg-white dark:bg-card text-primary font-semibold text-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shrink-0 border border-white/30 dark:border-white/10"
            >
              <Check className="w-3 h-3 shrink-0 text-primary" aria-hidden /> Mark all read
            </button>
          )}
        </div>
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
                  notif.read ? 'opacity-60' : 'bg-[rgba(47,157,182,0.06)] dark:bg-teal-950/35'
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