import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFamily } from '@/lib/familyContext';

export default function AddTaskSheet({ open, onClose, onSave }) {
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
    setSaving(true);
    await onSave({ ...form, assigned_to: form.assigned_to || undefined });
    setSaving(false);
    setForm({ title: '', assigned_to: '', due_date: '', priority: 'medium', notes: '' });
    onClose();
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
            <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Buy groceries" className="mt-1" />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({...form, due_date: e.target.value})} className="mt-1" />
          </div>
          {isAdmin && members.length > 1 && (
            <div>
              <Label>Assign To</Label>
              <Select value={form.assigned_to} onValueChange={(v) => setForm({...form, assigned_to: v})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.display_name || m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="Optional" className="mt-1" rows={2} />
          </div>
          <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="w-full h-12 rounded-xl">
            {saving ? 'Saving...' : 'Add Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}