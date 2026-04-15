import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFamily } from '@/lib/familyContext';
import { format } from 'date-fns';

export default function AddEventSheet({ open, onClose, onSave, selectedDate }) {
  const { members, isAdmin } = useFamily();
  const [form, setForm] = useState({
    title: '',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    start_time: '',
    end_time: '',
    location: '',
    notes: '',
    repeat_rule: 'none',
    assigned_to: [],
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({
      title: form.title,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      location: form.location,
      notes: form.notes,
      repeat_rule: form.repeat_rule,
    });
    setSaving(false);
    setForm({ title: '', date: format(new Date(), 'yyyy-MM-dd'), start_time: '', end_time: '', location: '', notes: '', repeat_rule: 'none', assigned_to: [] });
    onClose();
  };

  const toggleAssignee = (id) => {
    setForm(prev => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(id)
        ? prev.assigned_to.filter(x => x !== id)
        : [...prev.assigned_to, id],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">New Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Soccer practice" className="mt-1" />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({...form, start_time: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({...form, end_time: e.target.value})} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="Optional" className="mt-1" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="Optional" className="mt-1" rows={2} />
          </div>
          <div>
            <Label>Repeat</Label>
            <Select value={form.repeat_rule} onValueChange={(v) => setForm({...form, repeat_rule: v})}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                    onClick={() => toggleAssignee(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      form.assigned_to.includes(m.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    <span>{m.avatar || '👤'}</span>
                    {m.display_name || m.full_name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="w-full h-12 rounded-xl">
            {saving ? 'Saving...' : 'Add Event'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}