import React from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { useFamily } from '@/lib/familyContext';

export default function MonthView({ currentDate, events, onDayClick, selectedDay }) {
  const { getMemberColor } = useFamily();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = (day) =>
    events.filter((e) => isSameDay(new Date(e.date + 'T00:00:00'), day));

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="surface-1 p-2 overflow-hidden">
        <div
          className="grid grid-cols-7 gap-[1px] rounded-lg overflow-hidden"
          style={{ background: 'var(--color-background-primary)' }}
        >
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                className={`relative h-14 flex flex-col items-center justify-start pt-1 transition-colors ${
                  isSelected ? 'rounded-[10px] z-[1] shadow-[inset_0_0_0_2px_#2f9db6]' : ''
                } hover:bg-black/[0.03] dark:hover:bg-white/[0.05]`}
                style={{
                  backgroundColor: inMonth ? 'var(--color-background-primary)' : 'rgba(0,0,0,0.015)',
                }}
              >
                <span className={`text-xs font-medium ${
                  today ? 'bg-[#1e3a8a] text-white rounded-full w-5 h-5 flex items-center justify-center ring-1 ring-inset ring-[#1e3a8a]' :
                  inMonth ? 'text-foreground' : 'text-muted-foreground/50'
                }`}>
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="w-1.5 h-1.5 rounded-full opacity-90"
                        style={{ backgroundColor: getMemberColor(ev.created_by) }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
