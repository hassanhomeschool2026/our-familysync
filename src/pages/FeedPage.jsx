import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import MemberAvatar from '@/components/shared/MemberAvatar';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonCard from '@/components/shared/SkeletonCard';
import { format, formatDistanceToNow } from 'date-fns';
import { Calendar, CheckCircle2, MapPin, UserPlus, Megaphone } from 'lucide-react';

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

const typeIcons = {
  event_added: Calendar,
  task_completed: CheckCircle2,
  checkin: MapPin,
  member_joined: UserPlus,
  family_alert: Megaphone,
};

const typeColors = {
  event_added: 'text-[#247a8f] bg-[rgba(47,157,182,0.12)]',
  task_completed: 'text-[#247a8f] bg-[rgba(47,157,182,0.14)]',
  checkin: 'text-[#2f9db6] bg-[rgba(47,157,182,0.12)]',
  member_joined: 'text-[#7f30cb] bg-[rgba(127,48,203,0.12)]',
  family_alert: 'text-[#b91c1c] bg-[rgba(239,68,68,0.1)]',
};

const getTimeDisplay = (dateString) => {
  const date = new Date(dateString);
  const relative = formatDistanceToNow(date, { addSuffix: true });
  const absolute = format(date, 'MMM d, yyyy h:mm a');
  const timezone = date.toLocaleTimeString('en-us', { timeZoneName: 'short' }).split(' ').pop();
  return { relative, absolute, timezone };
};

export default function FeedPage() {
  const { family, isPremium, getMemberColor, members } = useFamily();

  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const { data: feedItems = [], isLoading } = useQuery({
    queryKey: ['feed', family?.id, isPremium],
    queryFn: async () => {
      const base = supabase
        .from('feed_items')
        .select('*')
        .eq('family_id', family?.id)
        .gte('created_at', fiveDaysAgo.toISOString())
        .order('created_at', { ascending: false });
      const { data } = await base.limit(isPremium ? 200 : 100);
      return data || [];
    },
    enabled: !!family?.id,
  });

  const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const filtered = isPremium
    ? feedItems
    : feedItems.filter((item) => new Date(item.created_at).getTime() >= thirtyDaysAgoMs);

  const freeUserHasOlderActivity =
    !isPremium &&
    feedItems.some((item) => new Date(item.created_at).getTime() < thirtyDaysAgoMs);

  if (isLoading) return <SkeletonCard count={5} />;

  return (
    <div>
      <div
        className="rounded-2xl p-4 mb-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 50%, #1e3a8a 100%)',
          boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
        }}
      >
        <GradientHeaderStarField />
        <style>{GRADIENT_HEADER_STAR_TWINKLE_CSS}</style>
        <div
          className="pointer-events-none absolute inset-0"
          style={sectionHeaderOverlayStyle}
          aria-hidden
        />
        <div className="relative z-10 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-white">Family Feed</h2>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState emoji="📰" title="No activity yet" description="Your family's activity will show up here." />
      ) : (
        <div className="space-y-1">
          {filtered.map((item, i) => {
            const Icon = typeIcons[item.type] || Calendar;
            const colorClasses = typeColors[item.type] || 'text-muted-foreground bg-muted';
            const { relative, absolute, timezone } = getTimeDisplay(item.created_at);

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 py-3 border-b border-border last:border-0 pl-2 border-l-[3px]"
                style={{ borderLeftColor: getMemberColor(item.user_id) }}
              >
                <div className="relative">
                  <MemberAvatar
                    avatar={item.user_avatar}
                    avatarUrl={members.find((member) => member.id === item.user_id)?.avatar_url}
                    color={getMemberColor(item.user_id)}
                    size="sm"
                    name={item.user_name}
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

      {freeUserHasOlderActivity && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Upgrade to Premium to see your full activity history.{' '}
          <Link to="/upgrade" className="text-primary font-medium hover:underline">
            Upgrade
          </Link>
        </p>
      )}
    </div>
  );
}