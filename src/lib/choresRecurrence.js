import { isToday, startOfWeek, isBefore, startOfMonth } from 'date-fns';

/**
 * Normalize stored `chores.frequency` into a reset cadence.
 * - Legacy: plain 'daily' | 'weekly' | 'monthly'
 * - Current: JSON stringified array of weekday keys (treated like weekly calendar reset)
 */
export function getChoreResetCadence(chore) {
  const f = chore?.frequency;
  if (f == null || f === '') return 'weekly';
  if (Array.isArray(f)) {
    return f.length > 0 ? 'weekly' : 'weekly';
  }
  if (typeof f !== 'string') return 'weekly';
  const t = f.trim();
  if (t === 'daily' || t === 'weekly' || t === 'monthly') return t;
  try {
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return 'weekly';
    if (parsed === 'daily' || parsed === 'weekly' || parsed === 'monthly') return parsed;
  } catch {
    /* legacy non-JSON label */
  }
  return 'weekly';
}

/** True when the chore should roll back to "open" for the current period (or never had a reset). */
export function choreNeedsReset(chore) {
  if (!chore.last_reset_at) return true;
  const last = new Date(chore.last_reset_at);
  if (Number.isNaN(last.getTime())) return true;
  const now = new Date();
  const cadence = getChoreResetCadence(chore);
  if (cadence === 'daily') {
    return !isToday(last);
  }
  if (cadence === 'weekly') {
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    return isBefore(last, weekStart);
  }
  if (cadence === 'monthly') {
    const monthStart = startOfMonth(now);
    return isBefore(last, monthStart);
  }
  return false;
}
