import React from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { useFamily } from '@/lib/familyContext';
import MemberAvatar from '@/components/shared/MemberAvatar';
import { MapPin, Clock, Trash2, Pencil } from 'lucide-react';

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
    background: `linear-gradient(${hexToTintBg8(accentHex)}, ${hexToTintBg8(accentHex)}), #ffffff`,
  };
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
    <div className="space-y-2">
      {dayEvents.map((ev) => {
        const canDelete = isAdmin || ev.created_by === currentUser?.id;
        const canEdit = canDelete;
        const accent = getMemberColor(ev.created_by);
        const startDisp = formatEventTime12h(ev.date, ev.start_time);
        const endDisp = ev.end_time ? formatEventTime12h(ev.date, ev.end_time) : '';
        return (
          <div
            key={ev.id}
            className="p-3 surface-2"
            style={eventCardStyle(accent, 3)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] leading-snug text-foreground">{ev.title}</p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
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
                    className="p-1.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
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
