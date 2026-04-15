import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import MemberAvatar from '@/components/shared/MemberAvatar';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonCard from '@/components/shared/SkeletonCard';
import { format, formatDistanceToNow } from 'date-fns';
import { Calendar, CheckCircle2, MapPin, UserPlus, Megaphone } from 'lucide-react';

const typeIcons = {
  event_added: Calendar,
  task_completed: CheckCircle2,
  checkin: MapPin,
  member_joined: UserPlus,
  family_alert: Megaphone,
};

const typeColors = {
  event_added: 'text-blue-500 bg-blue-50',
  task_completed: 'text-green-500 bg-green-50',
  checkin: 'text-orange-500 bg-orange-50',
  member_joined: 'text-purple-500 bg-purple-50',
  family_alert: 'text-red-500 bg-red-50',
};

const getTimeDisplay = (dateString) => {
  const date = new Date(dateString);
  const relative = formatDistanceToNow(date, { addSuffix: true });
  const absolute = format(date, 'MMM d, yyyy h:mm a');
  const timezone = date.toLocaleTimeString('en-us', { timeZoneName: 'short' }).split(' ').pop();
  return { relative, absolute, timezone };
};

export default function FeedPage() {
  const { family, isPremium, getMemberColor } = useFamily();

  const { data: feedItems = [], isLoading } = useQuery({
    queryKey: ['feed', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('feed_items')
        .select('*')
        .eq('family_id', family?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!family?.id,
  });

  // Free plan: last 30 days only
  const filtered = isPremium ? feedItems : feedItems.filter(item => {
    const created = new Date(item.created_at);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return created >= thirtyDaysAgo;
  });

  if (isLoading) return <SkeletonCard count={5} />;

  return (
    <div>
      <h2 className="font-heading text-xl font-bold mb-4">Family Feed</h2>

      {filtered.length === 0 ? (
        <EmptyState emoji="📰" title="No activity yet" description="Your family's activity will show up here." />
      ) : (
        <div className="space-y-1">
          {filtered.map((item, i) => {
            const Icon = typeIcons[item.type] || Calendar;
            const colorClasses = typeColors[item.type] || 'text-muted-foreground bg-muted';
            const { relative, absolute, timezone } = getTimeDisplay(item.created_at);

            return (
              <div key={item.id} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                <div className="relative">
                  <MemberAvatar
                    avatar={item.user_avatar}
                    color={getMemberColor(item.user_id)}
                    size="sm"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${colorClasses}`}>
                    <Icon className="w-2.5 h-2.5" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{item.message}</p>
                  <p className="text-[10px] mt-0.5">
                    <span>{relative}</span>
                    <span className="text-muted-foreground"> · {absolute} {timezone}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isPremium && feedItems.length > filtered.length && (
        <div className="mt-4 bg-accent/10 border border-accent/20 rounded-xl p-3 text-center text-sm">
          <p className="text-accent font-medium">Upgrade for full history</p>
          <p className="text-muted-foreground text-xs">Free plan shows last 30 days only</p>
        </div>
      )}
    </div>
  );
}