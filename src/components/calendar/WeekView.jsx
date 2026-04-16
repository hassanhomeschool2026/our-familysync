import React from 'react';
import { startOfWeek, addDays, format, isSameDay, isToday } from 'date-fns';
import { useFamily } from '@/lib/familyContext';

function formatEventTime12h(dateStr, timeStr) {
  if (!timeStr || !dateStr) return '';
  return format(new Date(`${dateStr}T${timeStr}`), 'h:mm a');
}

export default function WeekView({ currentDate, events, onDayClick }) {
  const { getMemberColor, getMemberName } = useFamily();
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (day) =>
    events.filter((e) => isSameDay(new Date(e.date + 'T00:00:00'), day));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`flex flex-col items-center py-2 rounded-xl transition-colors ${
                today ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
              }`}
            >
              <span className="text-[10px] font-medium opacity-70">{format(day, 'EEE')}</span>
              <span className="text-sm font-bold">{format(day, 'MM/dd/yyyy')}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2 mt-3">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          if (dayEvents.length === 0) return null;
          return (
            <div key={day.toISOString()}>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {format(day, 'EEEE, MM/dd/yyyy')}
              </p>
              {dayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border mb-1"
                  style={{ borderLeftWidth: '3px', borderLeftColor: getMemberColor(ev.created_by) }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ev.start_time && formatEventTime12h(ev.date, ev.start_time)}
                      {ev.end_time && ` – ${formatEventTime12h(ev.date, ev.end_time)}`}
                      {ev.assigned_to?.length > 0 && ` · ${ev.assigned_to.map(id => getMemberName(id)).join(', ')}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}