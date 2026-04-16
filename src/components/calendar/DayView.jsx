import React from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { useFamily } from '@/lib/familyContext';
import { MapPin, Clock, Trash2, Pencil } from 'lucide-react';

function formatEventTime12h(dateStr, timeStr) {
  if (!timeStr || !dateStr) return '';
  return format(new Date(`${dateStr}T${timeStr}`), 'h:mm a');
}

export default function DayView({ currentDate, events, onDeleteEvent, onEditEvent }) {
  const { getMemberColor, getMemberName, getMemberAvatar, isAdmin, currentUser } = useFamily();

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
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {format(currentDate, 'EEEE, MM/dd/yyyy')} · {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
      </p>
      {dayEvents.map((ev) => {
        const canDelete = isAdmin || ev.created_by === currentUser?.id;
        const canEdit = canDelete;
        const startDisp = formatEventTime12h(ev.date, ev.start_time);
        const endDisp = ev.end_time ? formatEventTime12h(ev.date, ev.end_time) : '';
        return (
          <div
            key={ev.id}
            className="p-3 rounded-xl bg-card border border-border"
            style={{ borderLeftWidth: '4px', borderLeftColor: getMemberColor(ev.created_by) }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{ev.title}</p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  {ev.start_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {startDisp}
                      {endDisp && ` – ${endDisp}`}
                    </span>
                  )}
                  {ev.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {ev.location}
                    </span>
                  )}
                </div>
                {ev.notes && <p className="text-xs text-muted-foreground mt-1">{ev.notes}</p>}
                {ev.assigned_to?.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    {ev.assigned_to.map((id) => (
                      <span key={id} className="text-sm" title={getMemberName(id)}>
                        {getMemberAvatar(id)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {canEdit && onEditEvent && (
                  <button
                    type="button"
                    onClick={() => onEditEvent(ev)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Edit event"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && (
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
          </div>
        );
      })}
    </div>
  );
}
