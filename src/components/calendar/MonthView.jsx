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
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`relative h-12 flex flex-col items-center justify-start pt-1 transition-colors ${
                inMonth ? 'bg-card' : 'bg-muted/30'
              } ${today ? 'ring-2 ring-inset ring-[#2f9db6] bg-[rgba(47,157,182,0.08)]' : ''} ${
                isSelected && !today ? 'ring-2 ring-inset ring-[#2f9db6] bg-[rgba(47,157,182,0.06)]' : ''
              } hover:bg-secondary`}
            >
              <span className={`text-xs font-medium ${
                today ? 'bg-[#2f9db6] text-white rounded-full w-5 h-5 flex items-center justify-center' :
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
  );
}