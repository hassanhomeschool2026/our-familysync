import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/lib/familyContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import TaskItem from '@/components/todo/TaskItem';
import AddTaskSheet from '@/components/todo/AddTaskSheet';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonCard from '@/components/shared/SkeletonCard';
import confetti from 'canvas-confetti';

export default function TodoPage() {
  const { family, currentUser, isPremium } = useFamily();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');

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

  const activeTasks = tasks.filter(t => !t.completed);
  const canAddTask = isPremium || activeTasks.length < 20;

  const filtered = tasks.filter((t) => {
    if (filter === 'mine') return t.assigned_to === currentUser?.id || t.created_by === currentUser?.id;
    if (filter === 'unassigned') return !t.assigned_to;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const familyTasks = filtered.filter(t => !t.completed && t.assigned_to !== currentUser?.id);
  const myTasks = filtered.filter(t => !t.completed && (t.assigned_to === currentUser?.id || (!t.assigned_to && t.created_by === currentUser?.id)));
  const completedTasks = filtered.filter(t => t.completed);

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
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-4 text-sm text-center">
          <p className="font-medium text-accent">Free plan limit: 20 active tasks</p>
          <p className="text-muted-foreground text-xs mt-0.5">Upgrade to Premium for unlimited tasks</p>
        </div>
      )}

      <div className="flex gap-1 mb-4 bg-secondary rounded-lg p-0.5 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize whitespace-nowrap ${
              filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState emoji="🎯" title="All caught up!" description="No tasks here yet. Tap + to add one." />
      ) : (
        <div className="space-y-4">
          {myTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">My Tasks</p>
              <div className="space-y-2">
                <AnimatePresence>
                  {myTasks.map((t) => (
                    <TaskItem key={t.id} task={t} onToggle={(task) => toggleTask.mutate(task)} onDelete={(id) => deleteTask.mutate(id)} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
          {familyTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Family Tasks</p>
              <div className="space-y-2">
                <AnimatePresence>
                  {familyTasks.map((t) => (
                    <TaskItem key={t.id} task={t} onToggle={(task) => toggleTask.mutate(task)} onDelete={(id) => deleteTask.mutate(id)} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
          {completedTasks.length > 0 && filter !== 'completed' && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Completed</p>
              <div className="space-y-2">
                <AnimatePresence>
                  {completedTasks.slice(0, 5).map((t) => (
                    <TaskItem key={t.id} task={t} onToggle={(task) => toggleTask.mutate(task)} onDelete={(id) => deleteTask.mutate(id)} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
          {filter === 'completed' && completedTasks.length > 0 && (
            <div className="space-y-2">
              <AnimatePresence>
                {completedTasks.map((t) => (
                  <TaskItem key={t.id} task={t} onToggle={(task) => toggleTask.mutate(task)} onDelete={(id) => deleteTask.mutate(id)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      <AddTaskSheet open={showAdd} onClose={() => setShowAdd(false)} onSave={(data) => createTask.mutateAsync(data)} />
    </div>
  );
}