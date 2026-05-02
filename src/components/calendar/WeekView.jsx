import React from 'react';
import { startOfWeek, addDays, format, isSameDay, isToday } from 'date-fns';
import { useFamily } from '@/lib/familyContext';
import MemberAvatar from '@/components/shared/MemberAvatar';
import { MapPin, Clock, Trash2, Pencil } from 'lucide-react';
import { DEFAULT_MEMBER_ACCENT } from '@/lib/memberColors';

function formatEventTime12h(dateStr, timeStr) {
  if (!timeStr || !dateStr) return '';
  return format(new Date(`${dateStr}T${timeStr}`), 'h:mm a');
}

/** ~5% opacity tint: #RRGGBB + 0D alpha (8-digit hex) */
function hexToTintBg8(hex) {
  let h = (hex && String(hex).replace('#', '').trim()) || '2f9db6';
  if (h.length === 3) {
    h = h.split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6) h = '2f9db6';
  return `#${h}0D`;
}

function eventCardStyle(accentHex, leftWidthPx) {
  return {
    borderLeftWidth: `${leftWidthPx}px`,
    borderLeftStyle: 'solid',
    borderLeftColor: accentHex,
    // Base uses theme card so title/time respect dark mode (white base broke contrast).
    background: `linear-gradient(${hexToTintBg8(accentHex)}, ${hexToTintBg8(accentHex)}), hsl(var(--card))`,
  };
}

function eventAccentColor(ev, getMemberColor) {
  const assigneeId = ev.assigned_to?.length ? ev.assigned_to[0] : null;
  return assigneeId ? getMemberColor(assigneeId) : DEFAULT_MEMBER_ACCENT;
}

export default function WeekView({ currentDate, events, onDayClick, onDeleteEvent, onEditEvent }) {
  const { getMemberName, getMemberColor, members, isAdmin, currentUser } = useFamily();
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (day) =>
    events.filter((e) => isSameDay(new Date(e.date + 'T00:00:00'), day));

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-2"
        style={{
          background: 'var(--color-background-primary)',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`flex flex-col items-center py-2 rounded-xl transition-colors ${
                today ? 'bg-primary text-primary-foreground' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
              }`}
              style={
                today
                  ? { boxShadow: '0 4px 12px rgba(127,48,203,0.35)' }
                  : undefined
              }
            >
              <span className="text-[10px] font-medium opacity-70">{format(day, 'EEE')}</span>
              <span className="text-sm font-bold">{format(day, 'd')}</span>
            </button>
          );
        })}
        </div>
      </div>

      <div className="space-y-4 mt-3">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          if (dayEvents.length === 0) return null;
          return (
            <div key={day.toISOString()}>
              <p
                className={`text-[11px] mb-1 ${
                  isToday(day)
                    ? 'font-bold'
                    : 'font-medium'
                }`}
                style={{
                  color: isToday(day) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                }}
              >
                {format(day, 'EEEE, MMM d')}
              </p>
              {dayEvents.map((ev) => {
                const accentHex = eventAccentColor(ev, getMemberColor);
                const canDelete = isAdmin || ev.created_by === currentUser?.id;
                const canEdit = canDelete;
                const startDisp = formatEventTime12h(ev.date, ev.start_time);
                const endDisp = ev.end_time ? formatEventTime12h(ev.date, ev.end_time) : '';
                return (
                  <div
                    key={ev.id}
                    className="flex items-start justify-between gap-2 p-3 mb-1 surface-2"
                    style={eventCardStyle(accentHex, 3)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] leading-snug truncate text-foreground">{ev.title}</p>
                      {ev.start_time && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3 shrink-0" aria-hidden />
                          <span>
                            {startDisp}
                            {endDisp && ` – ${endDisp}`}
                          </span>
                        </p>
                      )}
                      {ev.location && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" aria-hidden />
                          <span className="truncate">{ev.location}</span>
                        </p>
                      )}
                      {ev.assigned_to?.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          {ev.assigned_to.map((id) => {
                            const mem = members.find((m) => m.id === id);
                            return (
                              <MemberAvatar
                                key={id}
                                size="sm"
                                avatar={mem?.avatar}
                                avatarUrl={mem?.avatar_url}
                                color={getMemberColor(id)}
                                name={getMemberName(id)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {canEdit && onEditEvent && (
                        <button
                          type="button"
                          onClick={() => onEditEvent(ev)}
                          className="p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Edit event"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && onDeleteEvent && (
                        <button
                          type="button"
                          onClick={() => onDeleteEvent(ev.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Delete event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}