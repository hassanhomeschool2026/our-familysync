import React, { useState } from 'react';
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
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { toast } from 'sonner';

const priorityStyles = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

function TaskItemRow({ task, onToggle, onDelete }) {
  const { members, isAdmin, currentUser } = useFamily();

  const getMemberName = (userId) => {
    const member = members.find((m) => m.id === userId);
    return member?.display_name || member?.full_name || 'Member';
  };

  const getMemberAvatar = (userId) => {
    const member = members.find((m) => m.id === userId);
    return member?.avatar || '👤';
  };

  const canDelete = isAdmin || task.created_by === currentUser?.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`flex items-start gap-3 p-3 rounded-xl bg-card border border-border ${task.completed ? 'opacity-60' : ''}`}
    >
      <div className="pt-0.5">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggle(task)}
          className="rounded-full w-5 h-5"
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
          {task.assigned_to && (
            <span className="text-sm" title={getMemberName(task.assigned_to)}>
              {getMemberAvatar(task.assigned_to)}
            </span>
          )}
        </div>
        {task.notes && <p className="text-xs text-muted-foreground mt-1">{task.notes}</p>}
      </div>
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}

function AddTaskSheet({ open, onClose, onSave }) {
  const { members, isAdmin } = useFamily();
  const [form, setForm] = useState({
    title: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

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
          <DialogTitle className="font-heading">New Task</DialogTitle>
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
            {saving ? 'Saving...' : 'Add Task'}
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl font-bold">To-Do List</h2>
        <Button
          size="sm"
          onClick={() => {
            if (!canAddTask) return;
            setShowAdd(true);
          }}
          className="rounded-full h-9 w-9 p-0"
          disabled={!canAddTask}
        >
          <Plus className="w-5 h-5" />
        </Button>
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

      <div className="flex gap-1 mb-4 bg-secondary rounded-lg p-0.5 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f);
              setShopTab('todo');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize whitespace-nowrap ${
              shopTab !== 'shop' && filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {f}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShopTab('shop')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1 ${
            shopTab === 'shop' ? 'bg-card text-purple-600 shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <ShoppingCart className="w-3 h-3" /> Shop
        </button>
      </div>

      {shopTab !== 'shop' && (
        <>
      {filtered.length === 0 ? (
        <EmptyState emoji="🎯" title="All caught up!" description="No tasks here yet. Tap + to add one." />
      ) : (
        <div className="space-y-4">
          {myTasks.length > 0 && (
            <div>
              <p className="text-xs font-bold text-foreground tracking-wide mb-2">My tasks</p>
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
              <p className="text-xs font-bold text-foreground tracking-wide mb-2">Family tasks</p>
              <div className="space-y-2">
                <AnimatePresence>
                  {familyTasks.map((t) => (
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
          {completedTasks.length > 0 && filter !== 'completed' && (
            <div>
              <button
                type="button"
                onClick={() => setShowCompleted((s) => !s)}
                className="flex items-center justify-between w-full mb-2 group"
              >
                <p className="text-xs font-bold text-foreground tracking-wide">
                  Completed ({completedTasks.length})
                </p>
                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                  {showCompleted ? 'Hide ▲' : 'Show ▼'}
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

      <AddTaskSheet open={showAdd} onClose={() => setShowAdd(false)} onSave={(data) => createTask.mutateAsync(data)} />

      {shopTab !== 'shop' && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-foreground" />
              <p className="text-sm font-bold text-foreground">Shopping List</p>
              <span className="text-[10px] bg-secondary text-foreground px-1.5 py-0.5 rounded-full font-bold">
                {shopItems.filter((i) => !i.purchased).length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddShop(true)}
              className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full"
            >
              <Plus className="w-3 h-3" /> Add item
            </button>
          </div>

          {shopItems.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No items yet. Tap + to add to your shopping list.
            </div>
          ) : (
            <div className="space-y-2">
              {shopItems.map((item) =>
                editingShopItem?.id === item.id ? (
                  <div key={item.id} className="bg-card border border-purple-200 rounded-xl p-3 space-y-2">
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
                    className={`bg-card border rounded-xl px-3 py-2.5 flex items-center gap-3 ${
                      item.purchased ? 'border-border opacity-60' : 'border-border'
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
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-foreground" />
              <p className="text-sm font-bold text-foreground">Shopping List</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddShop(true)}
              className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full"
            >
              <Plus className="w-3 h-3" /> Add item
            </button>
          </div>
          {shopItems.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No items yet. Tap + to start your shopping list.
            </div>
          ) : (
            <div className="space-y-2">
              {shopItems.map((item) =>
                editingShopItem?.id === item.id ? (
                  <div key={item.id} className="bg-card border border-purple-200 rounded-xl p-3 space-y-2">
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
                    className={`bg-card border rounded-xl px-3 py-2.5 flex items-center gap-3 ${
                      item.purchased ? 'border-border opacity-60' : 'border-border'
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
