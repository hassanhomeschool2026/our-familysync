import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, ShoppingCart, Pencil, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonCard from '@/components/shared/SkeletonCard';
import MemberAvatar from '@/components/shared/MemberAvatar';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { playTaskCompleteSound } from '@/lib/sounds';

const priorityStyles = {
  high: 'bg-[rgba(239,68,68,0.12)] text-red-700',
  medium: 'bg-[rgba(245,158,11,0.16)] text-amber-900',
  low: 'bg-[rgba(47,157,182,0.12)] text-[#247a8f]',
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

function TaskItemRow({ task, onToggle, onDelete, onEdit }) {
  const { members, isAdmin, currentUser, getMemberColor } = useFamily();

  const getMemberName = (userId) => {
    const member = members.find((m) => m.id === userId);
    return member?.display_name || member?.full_name || 'Member';
  };

  const assignee = task.assigned_to ? members.find((m) => m.id === task.assigned_to) : null;

  const canDelete = isAdmin || task.created_by === currentUser?.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`flex items-start gap-3 p-3 surface-2 ${
        !task.completed ? 'border-l-[3px]' : ''
      } ${task.completed ? 'opacity-60' : ''}`}
      style={!task.completed ? { borderLeftColor: getMemberColor(task.assigned_to) } : undefined}
    >
      <div className="pt-0.5">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggle(task)}
          className="rounded-full w-5 h-5 border-2 data-[state=checked]:border-primary"
          style={{
            borderColor: !task.completed ? getMemberColor(task.assigned_to) : undefined,
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.priority && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${priorityStyles[task.priority]}`}>
              {task.priority}
            </span>
          )}
          {task.due_date && (
            <span className="text-[10px] text-muted-foreground">Due {format(new Date(task.due_date), 'MMM d')}</span>
          )}
          {assignee && (
            <span className="inline-flex" title={getMemberName(task.assigned_to)}>
              <MemberAvatar
                size="sm"
                avatar={assignee.avatar}
                avatarUrl={assignee.avatar_url}
                color={getMemberColor(task.assigned_to)}
                name={getMemberName(task.assigned_to)}
              />
            </span>
          )}
        </div>
        {task.notes && <p className="text-xs text-muted-foreground mt-1">{task.notes}</p>}
      </div>
      {canDelete && (
        <div className="flex items-center gap-0.5 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              aria-label="Edit task"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            aria-label="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

function AddTaskSheet({ open, onClose, onSave, editingTask }) {
  const { members, isAdmin } = useFamily();
  const [form, setForm] = useState({
    title: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingTask) {
      const d = editingTask.due_date;
      const dueStr = d
        ? typeof d === 'string'
          ? d.slice(0, 10)
          : format(new Date(d), 'yyyy-MM-dd')
        : '';
      setForm({
        title: editingTask.title ?? '',
        assigned_to: editingTask.assigned_to ?? '',
        due_date: dueStr,
        priority: editingTask.priority ?? 'medium',
        notes: editingTask.notes ?? '',
      });
    } else {
      setForm({ title: '', assigned_to: '', due_date: '', priority: 'medium', notes: '' });
    }
  }, [open, editingTask]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (!form.due_date?.trim()) {
      toast.error('Please select a due date.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, assigned_to: form.assigned_to || undefined });
      setForm({ title: '', assigned_to: '', due_date: '', priority: 'medium', notes: '' });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Buy groceries"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>
              Due Date <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="mt-1"
            />
          </div>
          {isAdmin && members.length > 1 && (
            <div>
              <Label>Assign To</Label>
              <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.avatar} {m.display_name || m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional"
              className="mt-1"
              rows={2}
            />
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="w-full h-12 rounded-xl"
          >
            {saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Add Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TodoPage() {
  const { family, currentUser, isPremium } = useFamily();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showAddShop, setShowAddShop] = useState(false);
  const [shopForm, setShopForm] = useState({ name: '', quantity: 1, unit: '', note: '' });
  const [editingShopItem, setEditingShopItem] = useState(null);
  const [shopTab, setShopTab] = useState('todo');
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', family?.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!family?.id,
  });

  const { data: shopItems = [] } = useQuery({
    queryKey: ['shopping', family?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('family_id', family?.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!family?.id,
  });

  const createTask = useMutation({
    mutationFn: async (data) => {
      const { data: newTask } = await supabase
        .from('tasks')
        .insert({ ...data, family_id: family.id })
        .select()
        .single();
      return newTask;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, title, assigned_to, due_date, priority, notes }) => {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: title.trim(),
          assigned_to: assigned_to ?? null,
          due_date,
          priority,
          notes: notes?.trim() ? notes.trim() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const toggleTask = useMutation({
    mutationFn: async (task) => {
      const isCompleting = !task.completed;
      if (isCompleting) {
        await supabase
          .from('tasks')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', task.id);
      } else {
        await supabase
          .from('tasks')
          .update({ completed: false, completed_at: null })
          .eq('id', task.id);
      }
      if (isCompleting) {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 }, colors: ['#14b8a6', '#f97316', '#8b5cf6'] });
        await supabase.from('feed_items').insert({
          family_id: family.id,
          user_id: currentUser.id,
          user_name: currentUser.display_name || currentUser.full_name,
          user_avatar: currentUser.avatar,
          type: 'task_completed',
          message: `${currentUser.display_name || currentUser.full_name} completed "${task.title}"`,
        });
      }
    },
    onSuccess: (_data, task) => {
      if (!task.completed) playTaskCompleteSound();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id) => {
      await supabase.from('tasks').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const createShopItem = useMutation({
    mutationFn: async (data) => {
      const { data: item } = await supabase
        .from('shopping_items')
        .insert({ ...data, family_id: family.id, created_by: currentUser.id })
        .select()
        .single();
      return item;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping'] }),
  });

  const toggleShopItem = useMutation({
    mutationFn: async (item) => {
      await supabase
        .from('shopping_items')
        .update({
          purchased: !item.purchased,
          purchased_at: !item.purchased ? new Date().toISOString() : null,
        })
        .eq('id', item.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping'] }),
  });

  const updateShopItem = useMutation({
    mutationFn: async ({ id, ...data }) => {
      await supabase.from('shopping_items').update(data).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
      setEditingShopItem(null);
    },
  });

  const deleteShopItem = useMutation({
    mutationFn: async (id) => {
      await supabase.from('shopping_items').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping'] }),
  });

  const activeTasks = tasks.filter((t) => !t.completed);
  const canAddTask = isPremium || activeTasks.length < 10;

  const filtered = tasks.filter((t) => {
    if (filter === 'mine') return t.assigned_to === currentUser?.id || t.created_by === currentUser?.id;
    if (filter === 'unassigned') return !t.assigned_to;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const familyTasks = filtered.filter((t) => !t.completed && t.assigned_to !== currentUser?.id);
  const myTasks = filtered.filter(
    (t) => !t.completed && (t.assigned_to === currentUser?.id || (!t.assigned_to && t.created_by === currentUser?.id))
  );
  const completedTasks = filtered.filter((t) => t.completed);

  const filters = ['all', 'mine', 'unassigned', 'completed'];

  if (isLoading) return <SkeletonCard count={4} />;

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-xl border border-border mb-2"
        style={{
          background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
          boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
        }}
      >
        <GradientHeaderStarField />
        <style>{GRADIENT_HEADER_STAR_TWINKLE_CSS}</style>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
          }}
        />
        <div className="relative z-[1] flex items-center justify-between p-4">
          <h2 className="font-heading text-xl font-bold" style={{ color: '#ffffff' }}>
            To-Do List
          </h2>
          <button
            type="button"
            onClick={() => {
              if (!canAddTask) return;
              setEditingTask(null);
              setShowAdd(true);
            }}
            disabled={!canAddTask}
            className="bg-white text-primary font-semibold text-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Plus className="w-3 h-3 shrink-0 text-primary" aria-hidden />
            Add Task
          </button>
        </div>
      </div>

      {!canAddTask && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-4 text-sm flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
          <span className="text-foreground">
            Free plan limit reached (10 tasks). Upgrade to Premium for unlimited tasks.
          </span>
          <Link to="/upgrade" className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
            Upgrade
          </Link>
        </div>
      )}

      <div className="mb-4 flex gap-2 px-4 py-2 bg-[#f3f0ff] border-b border-border overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f);
              setShopTab('todo');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all capitalize whitespace-nowrap ${
              shopTab !== 'shop' && filter === f
                ? 'bg-[#7c3aed] text-white'
                : 'text-[#7c3aed] bg-transparent'
            }`}
          >
            {f}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShopTab('shop')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap flex items-center gap-1 ${
            shopTab === 'shop' ? 'bg-[#7c3aed] text-white' : 'text-[#7c3aed] bg-transparent'
          }`}
        >
          <ShoppingCart className={`w-3 h-3 shrink-0 ${shopTab === 'shop' ? 'text-white' : 'text-[#7c3aed]'}`} aria-hidden />
          Shop
        </button>
      </div>

      {shopTab !== 'shop' && (
        <>
      {filtered.length === 0 ? (
        <EmptyState emoji="🎯" title="All caught up!" description="No tasks here yet. Tap + to add one." />
      ) : (
        <div className="space-y-4 surface-1 p-4">
          {myTasks.length > 0 && (
            <div>
              <div
                className="relative overflow-hidden rounded-xl border border-border mb-2"
                style={{
                  background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
                  boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
                }}
              >
                <GradientHeaderStarField />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
                  }}
                />
                <p
                  className="relative z-[1] text-xs font-bold tracking-wide px-4 py-2"
                  style={{ color: '#ffffff' }}
                >
                  My tasks
                </p>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {myTasks.map((t) => (
                    <TaskItemRow
                      key={t.id}
                      task={t}
                      onToggle={(task) => toggleTask.mutate(task)}
                      onDelete={(id) => deleteTask.mutate(id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
          {familyTasks.length > 0 && (
            <div>
              <div
                className="relative overflow-hidden rounded-xl border border-border mb-2"
                style={{
                  background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
                  boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
                }}
              >
                <GradientHeaderStarField />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
                  }}
                />
                <p
                  className="relative z-[1] text-xs font-bold tracking-wide px-4 py-2"
                  style={{ color: '#ffffff' }}
                >
                  Family tasks
                </p>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {familyTasks.map((t) => (
                    <TaskItemRow
                      key={t.id}
                      task={t}
                      onToggle={(task) => toggleTask.mutate(task)}
                      onDelete={(id) => deleteTask.mutate(id)}
                      onEdit={(task) => {
                        setEditingTask(task);
                        setShowAdd(true);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
          {completedTasks.length > 0 && filter !== 'completed' && (
            <div>
              <button
                type="button"
                onClick={() => setShowCompleted((s) => !s)}
                className="relative overflow-hidden rounded-xl border border-border w-full mb-2 group text-left"
                style={{
                  background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
                  boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
                }}
              >
                <GradientHeaderStarField />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
                  }}
                />
                <span className="relative z-[1] flex items-center justify-between px-4 py-2 w-full">
                  <span className="text-xs font-bold tracking-wide" style={{ color: '#ffffff' }}>
                    Completed ({completedTasks.length})
                  </span>
                  <span className="text-[10px] transition-opacity group-hover:opacity-90" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {showCompleted ? 'Hide ▲' : 'Show ▼'}
                  </span>
                </span>
              </button>
              {showCompleted && (
                <div className="space-y-2">
                  <AnimatePresence>
                    {completedTasks.map((t) => (
                      <TaskItemRow
                        key={t.id}
                        task={t}
                        onToggle={(task) => toggleTask.mutate(task)}
                        onDelete={(id) => deleteTask.mutate(id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
          {filter === 'completed' && completedTasks.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence>
                {completedTasks.map((t) => (
                  <TaskItemRow
                    key={t.id}
                    task={t}
                    onToggle={(task) => toggleTask.mutate(task)}
                    onDelete={(id) => deleteTask.mutate(id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
        </>
      )}

      <AddTaskSheet
        open={showAdd}
        editingTask={editingTask}
        onClose={() => {
          setShowAdd(false);
          setEditingTask(null);
        }}
        onSave={async (data) => {
          if (editingTask) {
            await updateTask.mutateAsync({
              id: editingTask.id,
              title: data.title,
              assigned_to: data.assigned_to,
              due_date: data.due_date,
              priority: data.priority,
              notes: data.notes,
            });
          } else {
            await createTask.mutateAsync(data);
          }
        }}
      />

      {shopTab !== 'shop' && (
        <div className="mt-4 pt-4 border-t border-border surface-1 p-4">
          <div
            className="relative overflow-hidden rounded-xl border border-border mb-3"
            style={{
              background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
              boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
            }}
          >
            <GradientHeaderStarField />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
              }}
            />
            <div className="relative z-[1] flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.9)' }} />
                <p className="text-sm font-bold" style={{ color: '#ffffff' }}>
                  Shopping List
                </p>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
                >
                  {shopItems.filter((i) => !i.purchased).length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddShop(true)}
                className="bg-white text-primary font-semibold text-sm px-3 py-1.5 rounded-full flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3 shrink-0 text-primary" aria-hidden /> Add item
              </button>
            </div>
          </div>

          {shopItems.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No items yet. Tap + to add to your shopping list.
            </div>
          ) : (
            <div className="space-y-2">
              {shopItems.map((item) =>
                editingShopItem?.id === item.id ? (
                  <div key={item.id} className="surface-2 p-3 space-y-2">
                    <input
                      className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
                      value={editingShopItem.name}
                      onChange={(e) => setEditingShopItem({ ...editingShopItem, name: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        className="w-16 text-sm border border-border rounded-lg px-2 py-1.5 bg-background"
                        value={editingShopItem.quantity}
                        onChange={(e) => setEditingShopItem({ ...editingShopItem, quantity: e.target.value })}
                      />
                      <input
                        className="flex-1 text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
                        placeholder="unit (e.g. oz, lbs)"
                        value={editingShopItem.unit || ''}
                        onChange={(e) => setEditingShopItem({ ...editingShopItem, unit: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateShopItem.mutate(editingShopItem)}
                        className="flex-1 bg-primary text-primary-foreground text-xs font-semibold py-1.5 rounded-lg"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingShopItem(null)}
                        className="flex-1 bg-secondary text-secondary-foreground text-xs font-semibold py-1.5 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className={`surface-2 px-3 py-2.5 flex items-center gap-3 ${
                      item.purchased ? 'opacity-60' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleShopItem.mutate(item)}
                      className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                        item.purchased ? 'bg-purple-600 border-purple-600' : 'border-muted-foreground/40'
                      }`}
                    >
                      {item.purchased && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${item.purchased ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {item.name}
                      </p>
                      {(item.quantity > 1 || item.unit) && (
                        <p className="text-[11px] text-muted-foreground">
                          Qty: {item.quantity}
                          {item.unit ? ` ${item.unit}` : ''}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingShopItem(item)}
                      className="p-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteShopItem.mutate(item.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {shopTab === 'shop' && (
        <div className="surface-1 p-4">
          <div
            className="relative overflow-hidden rounded-xl border border-border mb-3"
            style={{
              background: 'linear-gradient(135deg, #01dcba 0%, #0ea5e9 45%, #1e3a8a 100%)',
              boxShadow: '0 6px 20px rgba(30, 58, 138, 0.15)',
            }}
          >
            <GradientHeaderStarField />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
              }}
            />
            <div className="relative z-[1] flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.9)' }} />
                <p className="text-sm font-bold" style={{ color: '#ffffff' }}>
                  Shopping List
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddShop(true)}
                className="bg-white text-primary font-semibold text-sm px-3 py-1.5 rounded-full flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3 shrink-0 text-primary" aria-hidden /> Add item
              </button>
            </div>
          </div>
          {shopItems.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No items yet. Tap + to start your shopping list.
            </div>
          ) : (
            <div className="space-y-2">
              {shopItems.map((item) =>
                editingShopItem?.id === item.id ? (
                  <div key={item.id} className="surface-2 p-3 space-y-2">
                    <input
                      className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
                      value={editingShopItem.name}
                      onChange={(e) => setEditingShopItem({ ...editingShopItem, name: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        className="w-16 text-sm border border-border rounded-lg px-2 py-1.5 bg-background"
                        value={editingShopItem.quantity}
                        onChange={(e) => setEditingShopItem({ ...editingShopItem, quantity: e.target.value })}
                      />
                      <input
                        className="flex-1 text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
                        placeholder="unit (e.g. oz, lbs)"
                        value={editingShopItem.unit || ''}
                        onChange={(e) => setEditingShopItem({ ...editingShopItem, unit: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateShopItem.mutate(editingShopItem)}
                        className="flex-1 bg-primary text-primary-foreground text-xs font-semibold py-1.5 rounded-lg"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingShopItem(null)}
                        className="flex-1 bg-secondary text-secondary-foreground text-xs font-semibold py-1.5 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className={`surface-2 px-3 py-2.5 flex items-center gap-3 ${
                      item.purchased ? 'opacity-60' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleShopItem.mutate(item)}
                      className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                        item.purchased ? 'bg-purple-600 border-purple-600' : 'border-muted-foreground/40'
                      }`}
                    >
                      {item.purchased && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${item.purchased ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {item.name}
                      </p>
                      {(item.quantity > 1 || item.unit) && (
                        <p className="text-[11px] text-muted-foreground">
                          Qty: {item.quantity}
                          {item.unit ? ` ${item.unit}` : ''}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingShopItem(item)}
                      className="p-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteShopItem.mutate(item.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {showAddShop && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-24">
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm space-y-3 border border-border">
            <h3 className="font-heading font-bold text-base">Add Shopping Item</h3>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Item name</label>
              <input
                className="w-full mt-1 text-sm border border-border rounded-xl px-3 py-2 bg-background"
                placeholder="e.g. Milk"
                value={shopForm.name}
                onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <div className="w-20">
                <label className="text-xs font-semibold text-muted-foreground">Qty</label>
                <input
                  type="number"
                  min="1"
                  className="w-full mt-1 text-sm border border-border rounded-xl px-3 py-2 bg-background"
                  value={shopForm.quantity}
                  onChange={(e) => setShopForm({ ...shopForm, quantity: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground">Unit (optional)</label>
                <input
                  className="w-full mt-1 text-sm border border-border rounded-xl px-3 py-2 bg-background"
                  placeholder="oz, lbs, bag..."
                  value={shopForm.unit}
                  onChange={(e) => setShopForm({ ...shopForm, unit: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Note (optional)</label>
              <input
                className="w-full mt-1 text-sm border border-border rounded-xl px-3 py-2 bg-background"
                placeholder="e.g. name brand only"
                value={shopForm.note}
                onChange={(e) => setShopForm({ ...shopForm, note: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  if (!shopForm.name.trim()) return;
                  await createShopItem.mutateAsync(shopForm);
                  setShopForm({ name: '', quantity: 1, unit: '', note: '' });
                  setShowAddShop(false);
                }}
                className="flex-1 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl"
              >
                Add to List
              </button>
              <button
                type="button"
                onClick={() => setShowAddShop(false)}
                className="flex-1 bg-secondary text-secondary-foreground text-sm font-semibold py-2.5 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
