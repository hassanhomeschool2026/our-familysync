import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';

export default function CalendarHeader({ view, setView, currentDate, setCurrentDate, onAddEvent }) {
  const navigate = (dir) => {
    const fn = dir === 'next'
      ? (view === 'month' ? addMonths : view === 'week' ? addWeeks : addDays)
      : (view === 'month' ? subMonths : view === 'week' ? subWeeks : subDays);
    setCurrentDate(fn(currentDate, 1));
  };

  const label = view === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : view === 'week'
    ? `Week of ${format(currentDate, 'MMM d')}`
    : format(currentDate, 'EEEE, MMM d');

  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-foreground">{label}</h2>
        <Button size="sm" onClick={onAddEvent} className="rounded-full h-9 w-9 p-0">
          <Plus className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex bg-secondary rounded-lg p-0.5">
          {['day', 'week', 'month'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                view === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('prev')} className="p-1.5 rounded-lg hover:bg-secondary">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-md"
          >
            Today
          </button>
          <button onClick={() => navigate('next')} className="p-1.5 rounded-lg hover:bg-secondary">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}