import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div className="surface-3 p-4 mb-2 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-[22px] font-bold text-foreground leading-tight">{label}</h2>
        <button
          type="button"
          onClick={onAddEvent}
          aria-label="Add event"
          className="shrink-0 rounded-[20px] text-white border-0 cursor-pointer transition-opacity hover:opacity-95 active:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #7f30cb, #2f9db6)',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(127,48,203,0.3)',
          }}
        >
          + Event
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {['day', 'week', 'month'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`text-sm font-medium capitalize transition-all rounded-[20px] ${
                view === v ? 'text-white' : 'text-muted-foreground'
              }`}
              style={
                view === v
                  ? {
                      background: 'linear-gradient(135deg, #7f30cb, #2f9db6)',
                      padding: '6px 14px',
                    }
                  : {
                      border: '1px solid rgba(127,48,203,0.2)',
                      padding: '6px 14px',
                    }
              }
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => navigate('prev')} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentDate(new Date())}
            className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-md"
          >
            Today
          </button>
          <button type="button" onClick={() => navigate('next')} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
