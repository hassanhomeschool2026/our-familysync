import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MemberAvatar from '@/components/shared/MemberAvatar';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonCard from '@/components/shared/SkeletonCard';
import { CheckCircle2, Plus, Pencil, Trash2, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, startOfWeek, isAfter, isBefore, startOfMonth, formatDistanceToNow } from 'date-fns';
import { playChoreCompleteSound } from '@/lib/sounds';

const UNASSIGNED = '__unassigned__';

const choresSectionHeaderBarStyle = {
  background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
  boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
  padding: '12px 16px',
};

const choresSectionHeaderOverlayStyle = {
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

function choreNeedsReset(chore) {
  if (!chore.last_reset_at) return true;
  const last = new Date(chore.last_reset_at);
  if (Number.isNaN(last.getTime())) return true;
  const now = new Date();
  const freq = chore.frequency || 'weekly';
  if (freq === 'daily') {
    return !isToday(last);
  }
  if (freq === 'weekly') {
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    return isBefore(last, weekStart);
  }
  if (freq === 'monthly') {
    const monthStart = startOfMonth(now);
    return isBefore(last, monthStart);
  }
  return false;
}

function memberDisplayName(m) {
  if (!m) return 'Member';
  return m.display_name || m.full_name || m.email || 'Member';
}

function choreFrequencyToFormArray(frequency) {
  if (Array.isArray(frequency)) return frequency;
  if (typeof frequency === 'string' && frequency.trim()) {
    try {
      const parsed = JSON.parse(frequency);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* legacy plain string */
    }
  }
  return [];
}

export default function ChoresPage() {
  const { family, currentUser, members, isAdmin, isPremium, getMemberColor } = useFamily();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChore, setEditingChore] = useState(null);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [form, setForm] = useState({
    title: '',
    assigned_to: UNASSIGNED,
    frequency: [],
    point_value: '1',
  });

  const { data: chores = [], isLoading } = useQuery({
    queryKey: ['chores', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('chores')
        .select('*')
        .eq('family_id', family?.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!family?.id,
  });

  useEffect(() => {
    if (!family?.id || !chores.length) return;
    const stale = chores.filter(choreNeedsReset);
    if (!stale.length) return;

    let cancelled = false;
    (async () => {
      await Promise.all(
        stale.map((chore) =>
          supabase
            .from('chores')
            .update({
              completed: false,
              completed_by: null,
              completed_at: null,
              last_reset_at: new Date().toISOString(),
            })
            .eq('id', chore.id)
        )
      );
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ['chores', family.id] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chores, family?.id, queryClient]);

  const emptyForm = () => ({
    title: '',
    assigned_to: UNASSIGNED,
    frequency: [],
    point_value: '1',
  });

  const saveChore = useMutation({
    mutationFn: async ({ editId, values }) => {
      const pts = Math.min(5, Math.max(1, parseInt(values.point_value, 10) || 1));
      const title = values.title.trim();
      const frequency = Array.isArray(values.frequency)
        ? JSON.stringify(values.frequency)
        : values.frequency;
      const assigned_to = values.assigned_to === UNASSIGNED ? null : values.assigned_to;
      if (editId) {
        const { error } = await supabase
          .from('chores')
          .update({ title, assigned_to, frequency, point_value: pts })
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('chores').insert({
          family_id: family.id,
          title,
          frequency,
          point_value: pts,
          assigned_to,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_data, { editId }) => {
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      setShowAddForm(false);
      setEditingChore(null);
      setForm(emptyForm());
      toast.success(editId ? 'Chore updated!' : 'Responsibility added');
    },
    onError: (_e, { editId }) =>
      toast.error(editId ? 'Could not update responsibility' : 'Could not add responsibility'),
  });

  const deleteChore = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('chores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      toast.success('Removed');
    },
    onError: () => toast.error('Could not delete'),
  });

  const completeChore = useMutation({
    mutationFn: async (chore) => {
      const { error: upErr } = await supabase
        .from('chores')
        .update({
          completed: true,
          completed_by: currentUser.id,
          completed_at: new Date().toISOString(),
          streak_count: (chore.streak_count || 0) + 1,
        })
        .eq('id', chore.id);
      if (upErr) throw upErr;

      const name = memberDisplayName(currentUser);
      await supabase.from('feed_items').insert({
        family_id: family.id,
        user_id: currentUser.id,
        user_name: name,
        user_avatar: currentUser.avatar,
        type: 'task_completed',
        message: `${name} completed "${chore.title}"`,
      });
    },
    onSuccess: (_data, chore) => {
      playChoreCompleteSound();
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      toast.success(
        `Great job! +${chore.point_value ?? 1} pts ${String.fromCodePoint(0x1f389)}`
      );
    },
    onError: () => toast.error('Could not mark complete'),
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const pointsByMember = {};
  for (const c of chores) {
    if (!c.completed || !c.completed_at) continue;
    const completedAt = new Date(c.completed_at);
    if (!(isAfter(completedAt, weekStart) || completedAt.getTime() === weekStart.getTime())) continue;
    const uid = c.completed_by;
    if (!uid) continue;
    pointsByMember[uid] = (pointsByMember[uid] || 0) + (c.point_value ?? 1);
  }

  const topHelpers = Object.entries(pointsByMember)
    .map(([id, points]) => {
      const m = members.find((x) => x.id === id);
      const streaks = chores
        .filter((ch) => ch.assigned_to === id)
        .map((ch) => ch.streak_count || 0);
      const maxStreak = streaks.length ? Math.max(...streaks) : 0;
      return { id, points, member: m, maxStreak };
    })
    .filter((x) => x.member)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);

  const hasWeekPoints = topHelpers.some((h) => h.points > 0);

  const completedTodayCount = chores.filter(
    (c) => c.completed && c.completed_at && isToday(new Date(c.completed_at))
  ).length;
  const totalChores = chores.length;
  const dailyPct = totalChores ? Math.round((completedTodayCount / totalChores) * 100) : 0;

  const activeChores = chores.filter((c) => !c.completed || choreNeedsReset(c));
  const completedChores = chores.filter((c) => c.completed && !choreNeedsReset(c));

  const canComplete = (chore) =>
    isAdmin || (chore.assigned_to && chore.assigned_to === currentUser?.id);

  const handleSaveForm = () => {
    if (!form.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    saveChore.mutate({ editId: editingChore?.id ?? null, values: { ...form } });
  };

  const openEditChore = (chore) => {
    setEditingChore(chore);
    setShowAddForm(true);
    setForm({
      title: chore.title ?? '',
      assigned_to: chore.assigned_to || UNASSIGNED,
      frequency: choreFrequencyToFormArray(chore.frequency),
      point_value: String(chore.point_value ?? 1),
    });
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingChore(null);
    setForm(emptyForm());
  };

  const choresLimitReached = !isPremium && chores.length >= 5;
  const canOpenNewChore = isPremium || chores.length < 5;

  if (isLoading) return <SkeletonCard count={4} />;

  return (
    <div className="space-y-6">
      <div
        className="surface-3 mb-2 relative overflow-hidden"
        style={choresSectionHeaderBarStyle}
      >
        <GradientHeaderStarField />
        <style>{GRADIENT_HEADER_STAR_TWINKLE_CSS}</style>
        <div
          className="pointer-events-none absolute inset-0"
          style={choresSectionHeaderOverlayStyle}
          aria-hidden
        />
        <div className="relative z-[1] flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-white">Chores</h2>
          {isAdmin && (
            <button
              type="button"
              disabled={choresLimitReached && !showAddForm && !editingChore}
              onClick={() => {
                if (showAddForm || editingChore) {
                  closeForm();
                } else if (!canOpenNewChore) {
                  return;
                } else {
                  setEditingChore(null);
                  setForm(emptyForm());
                  setShowAddForm(true);
                }
              }}
              className={`flex items-center gap-1.5 font-semibold text-sm px-3 py-1.5 rounded-full disabled:opacity-50 disabled:pointer-events-none ${
                showAddForm || editingChore
                  ? 'border border-white/90 text-white bg-transparent hover:bg-white/10'
                  : 'bg-white text-primary'
              }`}
            >
              {showAddForm || editingChore ? (
                'Close'
              ) : (
                <>
                  <Plus className="w-3 h-3 shrink-0 text-primary" aria-hidden />
                  Add Chore
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {isAdmin && choresLimitReached && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-foreground">
            Free plan limit reached (5 responsibilities). Upgrade to Premium for unlimited.
          </span>
          <Link to="/upgrade" className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
            Upgrade
          </Link>
        </div>
      )}

      {isAdmin && (showAddForm || editingChore) && (
        <div className="bg-gradient-to-br from-card to-[#2f9db6]/[0.05] border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-heading font-semibold text-base">
            {editingChore ? 'Edit Responsibility' : 'Add Responsibility'}
          </h3>
          <div>
            <Label>Title</Label>
            <Input
              className="mt-1"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Feed the dog"
            />
          </div>
          <div>
            <Label>Assigned To</Label>
            <Select
              value={form.assigned_to}
              onValueChange={(v) => setForm({ ...form, assigned_to: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a family member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.avatar} {memberDisplayName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Frequency</Label>
            <div className="flex gap-1 flex-wrap mt-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const current = form.frequency || [];
                    setForm({
                      ...form,
                      frequency: current.includes(day)
                        ? current.filter((d) => d !== day)
                        : [...current, day],
                    });
                  }}
                  className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                    (form.frequency || []).includes(day)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Point Value (1–5)</Label>
            <Select
              value={form.point_value}
              onValueChange={(v) => setForm({ ...form, point_value: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={handleSaveForm}
              disabled={saveChore.isPending}
            >
              {editingChore ? 'Save Changes' : 'Add'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={closeForm}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <section className="surface-3 p-4">
        <div
          className="relative mb-2 overflow-hidden rounded-xl"
          style={choresSectionHeaderBarStyle}
        >
          <GradientHeaderStarField />
          <div
            className="pointer-events-none absolute inset-0"
            style={choresSectionHeaderOverlayStyle}
            aria-hidden
          />
          <h3 className="relative z-[1] text-base font-bold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.2)] flex items-center justify-center">
              <Flame className="w-4 h-4 shrink-0 text-[rgba(255,255,255,0.9)]" />
            </span>
            Top Helper This Week
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Week starting {format(weekStart, 'MMM d, yyyy')}
        </p>
        {!hasWeekPoints ? (
          <p className="text-sm text-muted-foreground">Be the first to earn points this week!</p>
        ) : (
          <ul className="space-y-3">
            {topHelpers.map((h, idx) => (
              <li
                key={h.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-[rgba(127,48,203,0.04)] px-3 py-2"
              >
                <MemberAvatar
                  avatar={h.member.avatar}
                  avatarUrl={h.member?.avatar_url}
                  color={getMemberColor(h.member.id)}
                  name={memberDisplayName(h.member)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{memberDisplayName(h.member)}</span>
                    {idx === 0 && <Flame className="w-4 h-4 text-orange-500 shrink-0" aria-hidden />}
                  </div>
                  {h.maxStreak > 1 && (
                    <p className="text-xs text-muted-foreground">{h.maxStreak}-day streak</p>
                  )}
                </div>
                <span className="text-sm font-semibold tabular-nums text-[#7f30cb]">{h.points} pts</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-1 p-4">
        <div
          className="relative mb-2 overflow-hidden rounded-xl"
          style={choresSectionHeaderBarStyle}
        >
          <GradientHeaderStarField />
          <div
            className="pointer-events-none absolute inset-0"
            style={choresSectionHeaderOverlayStyle}
            aria-hidden
          />
          <div className="relative z-[1] flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Daily Progress
              <span className="text-base">🌟</span>
            </h3>
            <span className="text-xs font-semibold text-white bg-[rgba(255,255,255,0.2)] px-2 py-0.5 rounded-full tabular-nums">
              {dailyPct}%
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {completedTodayCount} of {totalChores} chores done today
        </p>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${dailyPct}%`,
              background: 'linear-gradient(90deg, #7f30cb, #01dcba)',
            }}
          />
        </div>
      </section>

      <section>
        <div
          className="relative mb-3 overflow-hidden rounded-xl"
          style={choresSectionHeaderBarStyle}
        >
          <GradientHeaderStarField />
          <div
            className="pointer-events-none absolute inset-0"
            style={choresSectionHeaderOverlayStyle}
            aria-hidden
          />
          <h3 className="relative z-[1] text-base font-bold text-white">To do</h3>
        </div>
        {activeChores.length === 0 ? (
          <EmptyState
            title="All caught up"
            description="No open responsibilities right now."
          />
        ) : (
          <ul className="space-y-2">
            {activeChores.map((chore) => {
              const assignee = members.find((m) => m.id === chore.assigned_to);
              return (
                <li
                  key={chore.id}
                  className="flex items-start gap-3 surface-2 p-3"
                  style={{
                    borderLeftWidth: '3px',
                    borderLeftColor: getMemberColor(chore.assigned_to),
                  }}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-medium">{chore.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {assignee ? (
                        <div className="flex items-center gap-1.5">
                          <MemberAvatar
                            size="sm"
                            avatar={assignee.avatar}
                            avatarUrl={assignee?.avatar_url}
                            color={getMemberColor(assignee.id)}
                            name={memberDisplayName(assignee)}
                          />
                          <span>{memberDisplayName(assignee)}</span>
                        </div>
                      ) : (
                        <span>Unassigned</span>
                      )}
                      <span className="text-[#7f30cb] font-medium">
                        {'\u2B50'} {chore.point_value ?? 1} pts
                      </span>
                      <span className="text-xs capitalize bg-muted px-2 py-0.5 rounded-full">
                        {choreFrequencyToFormArray(chore.frequency).join(', ') || 'Any day'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAdmin && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          onClick={() => openEditChore(chore)}
                          aria-label="Edit chore"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (window.confirm('Delete this responsibility?')) {
                              deleteChore.mutate(chore.id);
                            }
                          }}
                          aria-label="Delete chore"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {canComplete(chore) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-primary"
                        disabled={
                          completeChore.isPending ||
                          (chore.completed && choreNeedsReset(chore))
                        }
                        onClick={() => {
                          if (chore.completed && choreNeedsReset(chore)) return;
                          completeChore.mutate(chore);
                        }}
                        aria-label="Mark complete"
                      >
                        <CheckCircle2 className="w-6 h-6" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <button
          type="button"
          onClick={() => setDoneExpanded((s) => !s)}
          className="relative flex items-center justify-between w-full mt-2 mb-2 group overflow-hidden rounded-xl text-left"
          style={choresSectionHeaderBarStyle}
        >
          <GradientHeaderStarField />
          <div
            className="pointer-events-none absolute inset-0"
            style={choresSectionHeaderOverlayStyle}
            aria-hidden
          />
          <h3 className="relative z-[1] text-base font-bold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.2)] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[rgba(255,255,255,0.9)]" />
            </span>
            Completed
          </h3>
          <span className="relative z-[1] text-xs font-semibold text-white bg-[rgba(255,255,255,0.2)] px-3 py-1 rounded-full">
            {doneExpanded ? 'Hide ▲' : `View all (${completedChores.length}) ▼`}
          </span>
        </button>
        {doneExpanded && completedChores.length > 0 && (
          <ul className="space-y-2 opacity-80">
            {completedChores.map((chore) => {
              const by = members.find((m) => m.id === chore.completed_by);
              const when = chore.completed_at
                ? formatDistanceToNow(new Date(chore.completed_at), { addSuffix: true })
                : '';
              return (
                <li
                  key={chore.id}
                  className="surface-2 px-3 py-2 text-sm text-muted-foreground"
                >
                  <p className="line-through text-foreground/70">{chore.title}</p>
                  <p className="mt-1 text-xs">
                    {by ? memberDisplayName(by) : 'Someone'} · {when}
                    {' · '}
                    <span>
                      {String.fromCodePoint(0x2b50)} {chore.point_value ?? 1} pts
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        {doneExpanded && completedChores.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing completed yet this period.</p>
        )}
      </section>
    </div>
  );
}
