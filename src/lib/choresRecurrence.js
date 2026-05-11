import { isToday, getDay } from 'date-fns';

const DAY_MAP = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/**
 * Parse frequency field into an array of day abbreviations e.g. ['Mon', 'Wed', 'Fri']
 * Handles: JSON stringified arrays, plain arrays, legacy strings.
 */
export function getChoreScheduledDays(chore) {
  const f = chore?.frequency;
  if (!f) return [];
  if (Array.isArray(f)) return f;
  if (typeof f === 'string' && f.trim()) {
    try {
      const parsed = JSON.parse(f);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // legacy plain string like 'daily' — treat as every day
      if (f.trim() === 'daily') return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }
  }
  return [];
}

/**
 * Is today one of this chore's scheduled days?
 */
export function choreIsScheduledToday(chore) {
  const days = getChoreScheduledDays(chore);
  if (days.length === 0) return true; // no days set = every day
  const todayIndex = getDay(new Date()); // 0=Sun, 1=Mon...
  return days.some((d) => DAY_MAP[d] === todayIndex);
}

/**
 * Has this chore already been completed today?
 */
export function choreCompletedToday(chore) {
  if (!chore.completed || !chore.completed_at) return false;
  return isToday(new Date(chore.completed_at));
}

/**
 * Should this chore show as NEEDING to be done?
 * True if: scheduled today AND not yet completed today.
 */
export function choreNeedsReset(chore) {
  if (!choreIsScheduledToday(chore)) return false;
  return !choreCompletedToday(chore);
}

/**
 * Legacy export — keep getChoreResetCadence so any other file that imports it doesn't break.
 * Just returns 'daily' always since we now handle reset per-day.
 */
export function getChoreResetCadence() {
  return 'daily';
}
