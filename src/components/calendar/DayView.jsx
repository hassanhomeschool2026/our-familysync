import React from 'react';
import { format, isSameDay } from 'date-fns';
import { useFamily } from '@/lib/familyContext';
import { MapPin, Clock, Trash2 } from 'lucide-react';
import EmptyState from '../shared/EmptyState';

export default function DayView({ currentDate, events, onDeleteEvent }) {
  const { getMemberColor, getMemberName, getMemberAvatar, isAdmin, currentUser } = useFamily();

  const dayEvents = events
    .filter((e) => isSameDay(new Date(e.date), currentDate))
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  if (dayEvents.length === 0) {
    return <EmptyState emoji="🌤️" title="Nothing on the schedule" description="Enjoy the quiet! Tap + to add an event." />;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {format(currentDate, 'EEEE, MMMM d')} · {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
      </p>
      {dayEvents.map((ev) => {
        const canDelete = isAdmin || ev.created_by === currentUser?.id;
        return (
          <div
            key={ev.id}
            className="p-3 rounded-xl bg-card border border-border"
            style={{ borderLeftWidth: '4px', borderLeftColor: getMemberColor(ev.created_by) }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{ev.title}</p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  {ev.start_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ev.start_time}{ev.end_time && ` – ${ev.end_time}`}
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
              {canDelete && (
                <button
                  onClick={() => onDeleteEvent(ev.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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
}