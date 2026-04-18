import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';
import { useFamily } from '@/lib/familyContext';
import MemberAvatar from '@/components/shared/MemberAvatar';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const priorityStyles = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

export default function TaskItem({ task, onToggle, onDelete }) {
  const { members, getMemberColor, isAdmin, currentUser } = useFamily();
  const canDelete = isAdmin || task.created_by === currentUser?.id;
  const assignee = task.assigned_to ? members.find((m) => m.id === task.assigned_to) : null;
  const assigneeName = assignee ? assignee.display_name || assignee.full_name || 'Member' : '';

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
            <span className="text-[10px] text-muted-foreground">
              Due {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          {task.assigned_to && (
            <span className="text-sm flex items-center" title={assigneeName || 'Assigned'}>
              {assignee ? (
                <MemberAvatar
                  avatar={assignee.avatar}
                  avatarUrl={assignee.avatar_url}
                  color={getMemberColor(task.assigned_to)}
                  size="sm"
                  name={assigneeName}
                />
              ) : (
                <span className="text-muted-foreground">?</span>
              )}
            </span>
          )}
        </div>
        {task.notes && <p className="text-xs text-muted-foreground mt-1">{task.notes}</p>}
      </div>
      {canDelete && (
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}