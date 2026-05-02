import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFamily } from '@/lib/familyContext';
import { format } from 'date-fns';

const generateTimeOptions = () => {
  const times = [];
  for (let i = 0; i < 96; i++) {
    const totalMinutes = ((5 * 60) + (i * 15)) % (24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const hour = h % 12 === 0 ? 12 : h % 12;
    const minute = m.toString().padStart(2, '0');
    const period = h < 12 ? 'AM' : 'PM';
    const label = `${hour}:${minute} ${period}`;
    const value = `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    times.push({ label, value });
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

function toHHMM(t) {
  if (!t) return '';
  const parts = String(t).split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? '0', 10);
  if (Number.isNaN(h)) return '';
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

const emptyForm = () => ({
  title: '',
  date: '',
  start_time: '',
  end_time: '',
  location: '',
  notes: '',
  repeat_rule: 'none',
  assigned_to: [],
});

export default function AddEventSheet({ open, onClose, onCreate, onUpdate, selectedDate, editingEvent }) {
  const { members, isAdmin } = useFamily();
  const [form, setForm] = useState(() => emptyForm());
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingEvent?.id;

  useEffect(() => {
    if (!open) return;
    if (editingEvent) {
      setForm({
        title: editingEvent.title ?? '',
        date: editingEvent.date ? editingEvent.date : format(new Date(), 'yyyy-MM-dd'),
        start_time: toHHMM(editingEvent.start_time),
        end_time: toHHMM(editingEvent.end_time),
        location: editingEvent.location ?? '',
        notes: editingEvent.notes ?? '',
        repeat_rule: editingEvent.repeat_rule ?? 'none',
        assigned_to: Array.isArray(editingEvent.assigned_to) ? editingEvent.assigned_to : [],
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, editingEvent, selectedDate]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        location: form.location,
        notes: form.notes,
        repeat_rule: form.repeat_rule,
      };
      if (isEditing) {
        await onUpdate({ id: editingEvent.id, ...payload });
      } else {
        await onCreate(payload);
      }
      setForm(emptyForm());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignee = (id) => {
    setForm((prev) => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(id)
        ? prev.assigned_to.filter((x) => x !== id)
        : [...prev.assigned_to, id],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEditing ? 'Edit Event' : 'New Event'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Soccer practice" className="mt-1" />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Time</Label>
              <Select value={form.start_time || undefined} onValueChange={(v) => setForm({ ...form, start_time: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>End Time</Label>
              <Select value={form.end_time || undefined} onValueChange={(v) => setForm({ ...form, end_time: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Optional" className="mt-1" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" className="mt-1" rows={2} />
          </div>
          <div>
            <Label>Repeat</Label>
            <Select value={form.repeat_rule} onValueChange={(v) => setForm({ ...form, repeat_rule: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isAdmin && members.length > 1 && (
            <div>
              <Label className="mb-2 block">Assign To</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleAssignee(m.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      form.assigned_to.includes(m.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {m.display_name || m.full_name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="w-full h-12 rounded-xl">
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Event'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
