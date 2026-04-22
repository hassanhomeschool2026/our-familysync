import React from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { useFamily } from '@/lib/familyContext';
import MemberAvatar from '@/components/shared/MemberAvatar';
import { MapPin, Clock, Trash2, Pencil } from 'lucide-react';

function formatEventTime12h(dateStr, timeStr) {
  if (!timeStr || !dateStr) return '';
  return format(new Date(`${dateStr}T${timeStr}`), 'h:mm a');
}

export default function DayView({ currentDate, events, onDeleteEvent, onEditEvent }) {
  const { getMemberColor, getMemberName, members, isAdmin, currentUser } = useFamily();

  const dayEvents = events
    .filter((e) => isSameDay(new Date(e.date + 'T00:00:00'), currentDate))
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  if (dayEvents.length === 0) {
    return (
      <div className="py-12 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          {isToday(currentDate)
            ? 'No events today. Tap + to add one.'
            : 'No events on this day. Tap + to add one.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {dayEvents.map((ev) => {
        const canDelete = isAdmin || ev.created_by === currentUser?.id;
        const canEdit = canDelete;
        const accent = getMemberColor(ev.created_by);
        const startDisp = formatEventTime12h(ev.date, ev.start_time);
        const endDisp = ev.end_time ? formatEventTime12h(ev.date, ev.end_time) : '';
        return (
          <div
            key={ev.id}
            className="rounded-xl overflow-hidden"
            style={{
              borderLeft: '3px solid ' + getMemberColor(ev.assigned_to?.[0] ?? ev.created_by),
              background: 'white',
              padding: '10px 12px',
              marginBottom: '8px',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{ev.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  {ev.start_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />
                      {startDisp}
                      {endDisp && ` – ${endDisp}`}
                    </span>
                  )}
                  {ev.location && (
                    <span className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </span>
                  )}
                </div>
                {ev.notes && <p className="text-xs text-muted-foreground mt-1">{ev.notes}</p>}
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
                    className="p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Edit event"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDeleteEvent(ev.id)}
                    className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Delete event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
